const Lead = require('../models/Lead');
const xlsx = require('xlsx');
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
      followUpDate: followUpDate || null,
      createdBy: req.user._id,
      organizationId: req.user.organizationId,
    });

    // Notify assigned agent
    if (assignedAgent) {
      await createNotification({
        userId: assignedAgent,
        message: `You have been assigned a new lead: ${name}`,
        type: 'New Lead Assigned',
        relatedEntity: { entityType: 'Lead', entityId: lead._id },
        io: getIo(req),
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
    if (req.user.role === 'agent') filter.assignedAgent = req.user._id;

    // Optional query filters
    if (req.query.status) filter.status = req.query.status;
    if (req.query.leadSource) filter.leadSource = req.query.leadSource;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

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
    const allowedFields = ['name', 'phone', 'email', 'leadSource', 'status', 'assignedAgent', 'followUpDate', 'budget'];

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
          userId: recipientId,
          message: `Lead "${lead.name}" status updated to "${updates.status}"`,
          type: 'Lead Status Updated',
          relatedEntity: { entityType: 'Lead', entityId: lead._id },
          io: getIo(req),
          organizationId: req.user.organizationId,
        });
      }
    }

    // Notify new agent on reassignment
    if (updates.assignedAgent && updates.assignedAgent !== lead.assignedAgent?.toString()) {
      await createNotification({
        userId: updates.assignedAgent,
        message: `You have been assigned lead: "${lead.name}"`,
        type: 'New Lead Assigned',
        relatedEntity: { entityType: 'Lead', entityId: lead._id },
        io: getIo(req),
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

/**
 * @desc  Bulk upload leads from Excel sheet
 * @route POST /api/leads/bulk-upload
 * @access Admin
 */
const bulkUploadLeads = async (req, res, next) => {
  try {
    console.log('--- Bulk Upload Debug ---');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('File:', req.file ? `Received: ${req.file.originalname}` : 'No file received');
    console.log('-------------------------');

    if (!req.file) {
      return next(createError('Please upload an Excel file. (Debug: Check server console for headers)', 400));
    }

    // Read the buffer from memory (using memory storage in multer)
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      return next(createError('The uploaded sheet is empty', 400));
    }

    const leadsToImport = data.map((item) => {
      // Normalize field names (case-insensitive and spaces)
      const findValue = (keys) => {
        const key = Object.keys(item).find(k =>
          keys.includes(k.toLowerCase().trim().replace(/\s/g, ''))
        );
        return key ? item[key] : null;
      };

      const rawName = findValue(['name', 'leadname', 'customername']);
      const phone = findValue(['phone', 'phonenumber', 'mobile', 'contactnumber']);
      const email = findValue(['email', 'emailaddress']);
      const rawSource = findValue(['leadsource', 'source', 'origin']);
      const rawStatus = findValue(['status', 'leadstatus']);
      const followUpDateStr = findValue(['followupdate', 'nextfollowup', 'followup']);
      const rawBudget = findValue(['budget', 'estimatedbudget']);

      // Normalize Source
      const SOURCES = ['Website', 'Referral', 'Social Media', 'Walk-in', 'Advertisement', 'Other'];
      let leadSource = 'Other';
      if (rawSource) {
        const matchedSource = SOURCES.find(s => s.toLowerCase() === rawSource.toString().toLowerCase().trim());
        if (matchedSource) leadSource = matchedSource;
      }

      // Normalize Status
      const STATUSES = [
        'New Lead', 'Contacted', 'Interested', 'Documents Pending',
        'Application Submitted', 'Visa Process', 'Converted', 'Rejected'
      ];
      let status = 'New Lead';
      if (rawStatus) {
        const matchedStatus = STATUSES.find(s => s.toLowerCase() === rawStatus.toString().toLowerCase().trim());
        if (matchedStatus) status = matchedStatus;
      }

      let followUpDate = null;
      if (followUpDateStr) {
        // Handle Excel numeric date or string date
        if (typeof followUpDateStr === 'number') {
          // Excel numbers represent days since 1899-12-30
          followUpDate = new Date(Math.round((followUpDateStr - 25569) * 86400 * 1000));
        } else {
          followUpDate = new Date(followUpDateStr);
        }
      }

      return {
        name: rawName || 'Unnamed Lead',
        phone: phone ? phone.toString().trim() : '',
        email: email ? email.toString().toLowerCase().trim() : '',
        leadSource: leadSource,
        status: status,
        followUpDate: (followUpDate && !isNaN(followUpDate.getTime())) ? followUpDate : null,
        budget: Number(rawBudget) || 0,
        createdBy: req.user._id,
        organizationId: req.user.organizationId,
        assignedAgent: req.user.role === 'agent' ? req.user._id : null
      };
    });

    // Validate if any lead has a name (basic validation)
    const validLeads = leadsToImport.filter(l => l.name !== 'Unnamed Lead');

    if (validLeads.length === 0) {
      return next(createError('No valid leads found in the Excel sheet. Ensure "Name" column exists.', 400));
    }

    await Lead.insertMany(validLeads);

    return sendSuccess(res, 201, `Successfully imported ${validLeads.length} leads`, {
      count: validLeads.length
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createLead, getAllLeads, getLeadById, updateLead, deleteLead, bulkUploadLeads };