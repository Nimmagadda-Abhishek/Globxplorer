const Lead   = require('../models/Lead');
const { createNotification } = require('../services/notificationService');
const { sendSuccess, createError } = require('../utils/helpers');

// Helper: get io instance from app
const getIo = (req) => req.app.get('io');

/**
 * @desc  Create a new lead
 * @route POST /api/leads
 * @access Admin, Agent
 */
const createLead = async (req, res, next) => {
  try {
    const { name, phone, email, leadSource, assignedAgent, followUpDate } = req.body;

    const lead = await Lead.create({
      name,
      phone,
      email,
      leadSource,
      assignedAgent: assignedAgent || null,
      followUpDate:  followUpDate  || null,
      createdBy:     req.user._id,
      organizationId: req.user.organizationId,
    });

    // Notify assigned agent
    if (assignedAgent) {
      await createNotification({
        userId:  assignedAgent,
        message: `You have been assigned a new lead: ${name}`,
        type:    'New Lead Assigned',
        relatedEntity: { entityType: 'Lead', entityId: lead._id },
        io:      getIo(req),
        organizationId: req.user.organizationId,
      });
    }

    return sendSuccess(res, 201, 'Lead created successfully', { lead });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get all leads (admin sees all, agent sees own)
 * @route GET /api/leads
 * @access Admin, Agent
 */
const getAllLeads = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.organizationId) filter.organizationId = req.user.organizationId;
    if (req.user.role === 'agent')  filter.assignedAgent = req.user._id;

    // Optional query filters
    if (req.query.status)      filter.status      = req.query.status;
    if (req.query.leadSource)  filter.leadSource  = req.query.leadSource;

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate('assignedAgent', 'name email')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Lead.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, 'Leads fetched', {
      leads,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get single lead
 * @route GET /api/leads/:id
 * @access Admin, Agent
 */
const getLeadById = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedAgent', 'name email phone')
      .populate('createdBy', 'name email')
      .populate('notes.addedBy', 'name');

    if (!lead) return next(createError('Lead not found', 404));

    if (req.user.role === 'agent' && 
        lead.assignedAgent?._id.toString() !== req.user._id.toString() &&
        lead.createdBy?._id.toString() !== req.user._id.toString()) {
      return next(createError('Not authorized to view this lead', 403));
    }

    return sendSuccess(res, 200, 'Lead fetched', { lead });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Update lead (status, assignedAgent, followUpDate, addNote)
 * @route PUT /api/leads/:id
 * @access Admin, Agent
 */
const updateLead = async (req, res, next) => {
  try {
    const { note, ...updates } = req.body;

    const lead = await Lead.findById(req.params.id);
    if (!lead) return next(createError('Lead not found', 404));

    // Push note if provided
    if (note) {
      lead.notes.push({ content: note, addedBy: req.user._id });
    }

    // Agents can only update their own leads
    if (req.user.role === 'agent' && 
        lead.assignedAgent?.toString() !== req.user._id.toString() &&
        lead.createdBy?.toString() !== req.user._id.toString()) {
      return next(createError('Not authorized to update this lead', 403));
    }

    // Apply other updates
    const allowedFields = ['name', 'phone', 'email', 'leadSource', 'status', 'assignedAgent', 'followUpDate'];
    
    // Safety: Agents cannot reassign leads to others (only Admin can)
    if (req.user.role === 'agent' && updates.assignedAgent && updates.assignedAgent !== req.user._id.toString()) {
        return next(createError('Agents cannot reassign leads to others', 403));
    }

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) lead[field] = updates[field];
    });

    await lead.save();

    // Notify old and new assigned agent about status change
    if (updates.status) {
      const recipientId = lead.assignedAgent?.toString() || lead.createdBy?.toString();
      if (recipientId) {
        await createNotification({
          userId:  recipientId,
          message: `Lead "${lead.name}" status updated to "${updates.status}"`,
          type:    'Lead Status Updated',
          relatedEntity: { entityType: 'Lead', entityId: lead._id },
          io:      getIo(req),
          organizationId: req.user.organizationId,
        });
      }
    }

    // Notify new agent on reassignment
    if (updates.assignedAgent && updates.assignedAgent !== lead.assignedAgent?.toString()) {
      await createNotification({
        userId:  updates.assignedAgent,
        message: `You have been assigned lead: "${lead.name}"`,
        type:    'New Lead Assigned',
        relatedEntity: { entityType: 'Lead', entityId: lead._id },
        io:      getIo(req),
        organizationId: req.user.organizationId,
      });
    }

    const populated = await Lead.findById(lead._id)
      .populate('assignedAgent', 'name email')
      .populate('createdBy', 'name email')
      .populate('notes.addedBy', 'name');

    return sendSuccess(res, 200, 'Lead updated', { lead: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Delete a lead (admin only)
 * @route DELETE /api/leads/:id
 * @access Admin
 */
const deleteLead = async (req, res, next) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return next(createError('Lead not found', 404));

    return sendSuccess(res, 200, 'Lead deleted', { lead });
  } catch (error) {
    next(error);
  }
};

module.exports = { createLead, getAllLeads, getLeadById, updateLead, deleteLead };