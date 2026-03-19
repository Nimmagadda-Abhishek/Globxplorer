const FollowUp = require('../models/Follow-up');
const Lead     = require('../models/Lead');
const { createNotification } = require('../services/notificationService');
const { sendSuccess, createError } = require('../utils/helpers');

// Helper: get io instance from app
const getIo = (req) => req.app.get('io');

/**
 * @desc  Create a new follow-up
 * @route POST /api/follow-ups
 * @access Admin, Agent
 */
const createFollowUp = async (req, res, next) => {
  try {
    const { leadId, scheduledDate, note } = req.body;

    // Check if lead exists
    const lead = await Lead.findById(leadId);
    if (!lead) return next(createError('Lead not found', 404));

    // Organization check (lead must belong to same org as user)
    if (req.user.organizationId && lead.organizationId?.toString() !== req.user.organizationId.toString()) {
      return next(createError('Not authorized to add follow-up for this lead', 403));
    }

    const followUp = await FollowUp.create({
      leadId,
      scheduledDate,
      note,
      createdBy: req.user._id,
      organizationId: req.user.organizationId,
    });

    lead.followUpDate = scheduledDate;
    await lead.save();

    // Notify assigned agent if someone else (like an Admin) scheduled it
    if (lead.assignedAgent && lead.assignedAgent.toString() !== req.user._id.toString()) {
      await createNotification({
        userId: lead.assignedAgent,
        message: `New follow-up scheduled for your lead: ${lead.name}`,
        type: 'Follow-up Reminder',
        relatedEntity: { entityType: 'Lead', entityId: lead._id },
        io: getIo(req),
        organizationId: req.user.organizationId,
      });
    }

    return sendSuccess(res, 201, 'Follow-up scheduled successfully', { followUp });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get all follow-ups (paginated/filtered)
 * @route GET /api/follow-ups
 * @access Admin, Agent
 */
const getAllFollowUps = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.organizationId) filter.organizationId = req.user.organizationId;
    
    // Filter by status if provided
    if (req.query.status) filter.status = req.query.status;
    
    // Agents see follow-ups for their own leads only
    if (req.user.role === 'agent') {
        const leads = await Lead.find({ assignedAgent: req.user._id }).select('_id');
        filter.leadId = { $in: leads.map(l => l._id) };
    }

    const followUps = await FollowUp.find(filter)
      .populate('leadId', 'name status email phone')
      .populate('createdBy', 'name')
      .sort({ scheduledDate: 1 }); // Sort by soonest first

    return sendSuccess(res, 200, 'Follow-ups fetched', { followUps });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get follow-up history for a lead
 * @route GET /api/follow-ups/lead/:leadId
 * @access Admin, Agent
 */
const getFollowUpsByLead = async (req, res, next) => {
  try {
    const followUps = await FollowUp.find({ leadId: req.params.leadId })
      .populate('createdBy', 'name')
      .sort({ scheduledDate: -1 });

    return sendSuccess(res, 200, 'Follow-up history fetched', { followUps });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Update follow-up (mark as completed/cancelled or reschedule)
 * @route PUT /api/follow-ups/:id
 * @access Admin, Agent
 */
const updateFollowUp = async (req, res, next) => {
  try {
    const { status, scheduledDate, note } = req.body;
    
    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) return next(createError('Follow-up not found', 404));

    // Apply updates
    if (status) followUp.status = status;
    if (scheduledDate) followUp.scheduledDate = scheduledDate;
    if (note) followUp.note = note;

    await followUp.save();

    const lead = await Lead.findById(followUp.leadId);
    if (lead) {
        // Update lead's follow-up date for quick reference
        if (scheduledDate && followUp.status === 'Scheduled') {
            lead.followUpDate = scheduledDate;
        } else if (status && (status === 'Completed' || status === 'Cancelled')) {
            const nextFollowUp = await FollowUp.findOne({ 
                leadId: followUp.leadId, 
                status: 'Scheduled',
                scheduledDate: { $gt: new Date() }
            }).sort({ scheduledDate: 1 });
            lead.followUpDate = nextFollowUp ? nextFollowUp.scheduledDate : null;
        }
        await lead.save();

        // Notify assigned agent if someone else updated it
        if (lead.assignedAgent && lead.assignedAgent.toString() !== req.user._id.toString()) {
            await createNotification({
              userId: lead.assignedAgent,
              message: `A follow-up for your lead "${lead.name}" was updated`,
              type: 'Follow-up Reminder',
              relatedEntity: { entityType: 'Lead', entityId: lead._id },
              io: getIo(req),
              organizationId: req.user.organizationId,
            });
        }
    }

    return sendSuccess(res, 200, 'Follow-up updated', { followUp });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Delete follow-up
 * @route DELETE /api/follow-ups/:id
 * @access Admin
 */
const deleteFollowUp = async (req, res, next) => {
  try {
    const followUp = await FollowUp.findByIdAndDelete(req.params.id);
    if (!followUp) return next(createError('Follow-up not found', 404));

    return sendSuccess(res, 200, 'Follow-up deleted', { followUp });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFollowUp,
  getAllFollowUps,
  getFollowUpsByLead,
  updateFollowUp,
  deleteFollowUp,
};
