const Lead = require('../models/Lead');
const User = require('../models/User');
const FollowUp = require('../models/Follow-up');
const { sendSuccess } = require('../utils/helpers');

/**
 * @desc  Dashboard analytics via MongoDB aggregation
 * @route GET /api/reports/dashboard
 * @access Admin
 */
const getDashboard = async (req, res, next) => {
  try {
    const orgFilter = req.user.organizationId
      ? { organizationId: req.user.organizationId }
      : {};

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [
      stats,
      leadPipeline,
      recentLeads,
      followUpReminders,
      agentPerformance,
    ] = await Promise.all([
      // 1. Core Summary Stats
      (async () => {
        const [
          totalLeads,
          newLeadsToday,
          pendingFollowups,
          convertedStudents,
          activeAgents,
        ] = await Promise.all([
          Lead.countDocuments(orgFilter),
          Lead.countDocuments({ ...orgFilter, createdAt: { $gte: startOfDay } }),
          FollowUp.countDocuments({
            ...orgFilter,
            scheduledDate: { $lt: new Date() },
            status: 'Scheduled',
          }),
          Lead.countDocuments({ ...orgFilter, status: 'Converted' }),
          User.countDocuments({ ...orgFilter, role: 'agent', status: 'active' }),
        ]);
        return { totalLeads, newLeadsToday, pendingFollowups, convertedStudents, activeAgents };
      })(),

      // 2. Lead Pipeline (Overview of leads by stage)
      Lead.aggregate([
        { $match: orgFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // 3. Recent Leads (Latest incoming leads)
      Lead.find(orgFilter)
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('assignedAgent', 'name email')
        .select('name email phone status createdAt'),

      // 4. Follow-up Reminders (Overdue and Upcoming tasks)
      FollowUp.find({
        ...orgFilter,
        scheduledDate: { $lt: new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000) }, // Everything up to next week
        status: 'Scheduled',
      })
        .sort({ scheduledDate: 1 })
        .limit(5)
        .populate('leadId', 'name status')
        .populate('createdBy', 'name')
        .select('leadId scheduledDate status note'),

      // 5. Agent Performance (Leads and conversions by agent this month)
      Lead.aggregate([
        {
          $match: {
            ...orgFilter,
            assignedAgent: { $ne: null },
            createdAt: { $gte: startOfMonth },
          },
        },
        {
          $group: {
            _id: '$assignedAgent',
            totalLeads: { $sum: 1 },
            converted: { $sum: { $cond: [{ $eq: ['$status', 'Converted'] }, 1, 0] } },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'agent',
          },
        },
        { $unwind: '$agent' },
        {
          $project: {
            _id: 1,
            name: '$agent.name',
            email: '$agent.email',
            totalLeads: 1,
            converted: 1,
            conversionRate: {
              $cond: [
                { $eq: ['$totalLeads', 0] },
                0,
                { $multiply: [{ $divide: ['$converted', '$totalLeads'] }, 100] },
              ],
            },
          },
        },
        { $sort: { converted: -1, totalLeads: -1 } },
      ]),
    ]);

    return sendSuccess(res, 200, 'Dashboard data fetched', {
      stats,
      leadPipeline,
      recentLeads,
      followUpReminders,
      agentPerformance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Personalized dashboard for Agents
 * @route GET /api/reports/agent-dashboard
 * @access Agent, Admin
 */
const getAgentDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const orgFilter = req.user.organizationId ? { organizationId: req.user.organizationId } : {};
    
    // Explicitly convert userId to filter leads
    const leadFilter = { ...orgFilter, assignedAgent: userId };
    const myLeads = await Lead.find(leadFilter).select('_id');
    const myLeadIds = myLeads.map(l => l._id);
    
    const followUpFilter = { ...orgFilter, leadId: { $in: myLeadIds } };

    const now = new Date();
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Growth metrics anchors
    const yesterdayStart = new Date(startOfDay.getTime() - 24 * 60 * 60 * 1000);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      stats,
      leadPipeline,
      priorityFocus,
      recentActivity,
    ] = await Promise.all([
      // 1. Stats with Growth Calculations
      (async () => {
        const [
          totalLeads,
          prevTotalLeads,
          newToday,
          yesterdayLeads,
          pendingTasks,
          prevPendingTasks,
          conversions,
          activeAgents,
        ] = await Promise.all([
          Lead.countDocuments(leadFilter),
          Lead.countDocuments({ ...leadFilter, createdAt: { $lte: lastMonthEnd } }),
          Lead.countDocuments({ ...leadFilter, createdAt: { $gte: startOfDay } }),
          Lead.countDocuments({ ...leadFilter, createdAt: { $gte: yesterdayStart, $lt: startOfDay } }),
          FollowUp.countDocuments({ ...followUpFilter, scheduledDate: { $lt: new Date() }, status: 'Scheduled' }),
          FollowUp.countDocuments({ ...followUpFilter, scheduledDate: { $lt: startOfDay }, status: 'Scheduled' }),
          Lead.countDocuments({ ...leadFilter, status: 'Converted' }),
          User.countDocuments({ ...orgFilter, role: 'agent', status: 'active' }),
        ]);

        const calcTrend = (curr, prev) => {
          if (prev === 0) return curr > 0 ? '+100%' : '0%';
          const diff = ((curr - prev) / prev) * 100;
          return (diff >= 0 ? '+' : '') + diff.toFixed(0) + '%';
        };

        return {
          totalLeads:    { value: totalLeads, trend: calcTrend(totalLeads, prevTotalLeads) },
          newLeadsToday: { value: newToday, trend: calcTrend(newToday, yesterdayLeads) },
          pendingTasks:  { value: pendingTasks, trend: (pendingTasks - prevPendingTasks).toString() },
          conversions:   { value: conversions, trend: conversions > 10 ? 'High' : 'Normal' },
          activeAgents:  { value: activeAgents },
        };
      })(),

      // 2. Lead Pipeline (Distribution of leads across enrollment lifecycle)
      Lead.aggregate([
        { $match: leadFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      FollowUp.find({
        ...followUpFilter,
        scheduledDate: { $lt: new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000) }, // Look ahead 7 days like admin
        status: 'Scheduled',
      })
      .sort({ scheduledDate: 1 })
      .limit(10)
      .populate('leadId', 'name status')
      .select('leadId scheduledDate status note'),

      // 4. Recent incoming leads
      Lead.find(leadFilter)
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name status createdAt'),
    ]);

    return sendSuccess(res, 200, 'Agent dashboard data fetched', {
      stats,
      leadPipeline,
      priorityFocus,
      recentActivity,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard, getAgentDashboard };
