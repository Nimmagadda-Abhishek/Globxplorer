const User = require('../models/User');
const Lead = require('../models/Lead');
const { sendSuccess, createError } = require('../utils/helpers');

/**
 * @desc  Create a new agent (admin only)
 * @route POST /api/users/create-agent
 * @access Admin
 */
const createAgent = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return next(createError('Email already registered', 409));

    const agent = await User.create({
      name,
      email,
      phone,
      password,
      role: 'agent',
      organizationId: req.user.organizationId,
      createdBy: req.user._id,
    });

    return sendSuccess(res, 201, 'Agent created successfully', {
      agent: { 
        _id: agent._id, 
        name: agent.name, 
        email: agent.email, 
        phone: agent.phone, 
        status: agent.status,
        createdBy: agent.createdBy 
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get all agents (admin only)
 * @route GET /api/users
 * @access Admin
 */
const getAgents = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { role: 'agent' };
    if (req.user.organizationId) filter.organizationId = req.user.organizationId;
    if (status) filter.status = status;

    // Admin sees all, Agent sees those they created
    if (req.user.role === 'agent') {
      filter.createdBy = req.user._id;
    }

    const agents = await User.find(filter)
      .select('-password')
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Agents fetched', { agents, count: agents.length });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Update agent details (admin only)
 * @route PUT /api/users/:id
 * @access Admin
 */
const updateAgent = async (req, res, next) => {
  try {
    const allowedUpdates = ['name', 'email', 'phone', 'status'];
    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const agent = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!agent) return next(createError('Agent not found', 404));

    return sendSuccess(res, 200, 'Agent updated', { agent });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Deactivate (soft-delete) an agent (admin only)
 * @route DELETE /api/users/:id
 * @access Admin
 */
const deactivateAgent = async (req, res, next) => {
  try {
    const agent = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    ).select('-password');

    if (!agent) return next(createError('Agent not found', 404));

    return sendSuccess(res, 200, 'Agent deactivated', { agent });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get agent details and stats (admin only)
 * @route GET /api/users/:id/stats
 * @access Admin
 */
const getAgentDetails = async (req, res, next) => {
  try {
    const agent = await User.findById(req.params.id)
      .select('-password')
      .populate('createdBy', 'name email role');

    if (!agent) return next(createError('Agent not found', 404));

    // Calculate stats
    const [totalLeads, convertedLeads, pendingLeads, revenueData] = await Promise.all([
      Lead.countDocuments({ assignedAgent: agent._id }),
      Lead.countDocuments({ assignedAgent: agent._id, status: 'Converted' }),
      Lead.countDocuments({ assignedAgent: agent._id, status: { $ne: 'Converted' } }),
      Lead.aggregate([
        { $match: { assignedAgent: agent._id, status: 'Converted' } },
        { $group: { _id: null, totalBudget: { $sum: '$budget' } } }
      ])
    ]);

    const stats = {
      totalLeads,
      convertedLeads,
      pendingLeads,
      conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads * 100).toFixed(2) : 0,
      totalRevenue: revenueData[0]?.totalBudget || 0
    };

    return sendSuccess(res, 200, 'Agent details and stats fetched', { agent, stats });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get referral earnings for the logged-in agent
 * @route GET /api/users/referral-earnings
 * @access Agent
 */
const getReferralEarnings = async (req, res, next) => {
  try {
    if (req.user.role !== 'agent') {
      return next(createError('Only agents can view referral earnings', 403));
    }

    // 1. Find all agents created by this agent
    const subAgents = await User.find({ createdBy: req.user._id, role: 'agent' }).select('name email status createdAt');
    
    const subAgentIds = subAgents.map(a => a._id);

    // 2. Find all converted leads by these sub-agents
    const convertedLeads = await Lead.find({
      assignedAgent: { $in: subAgentIds },
      status: 'Converted'
    }).populate('assignedAgent', 'name');

    // 3. Calculate earnings breakdown
    const subAgentStats = subAgents.map(agent => {
      const agentLeads = convertedLeads.filter(l => l.assignedAgent._id.toString() === agent._id.toString());
      const totalBudget = agentLeads.reduce((sum, l) => sum + (l.budget || 0), 0);
      const commission = totalBudget * 0.25;

      return {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        conversions: agentLeads.length,
        totalSales: totalBudget,
        commission
      };
    });

    const totalEarnings = subAgentStats.reduce((sum, s) => sum + s.commission, 0);
    const totalConversions = subAgentStats.reduce((sum, s) => sum + s.conversions, 0);

    return sendSuccess(res, 200, 'Referral earnings fetched', {
      summary: {
        totalEarnings,
        totalConversions,
        subAgentCount: subAgents.length
      },
      subAgentBreakdown: subAgentStats,
      recentCommissions: convertedLeads.slice(0, 5).map(l => ({
        leadName: l.name,
        agentName: l.assignedAgent.name,
        budget: l.budget,
        commission: (l.budget || 0) * 0.25,
        date: l.updatedAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createAgent, getAgents, updateAgent, deactivateAgent, getAgentDetails, getReferralEarnings };
