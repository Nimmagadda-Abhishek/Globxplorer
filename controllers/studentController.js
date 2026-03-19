const Student = require('../models/Student');
const Lead    = require('../models/Lead');
const { sendSuccess, createError } = require('../utils/helpers');

/**
 * @desc  Create or update student profile for a lead (Upsert)
 * @route POST /api/students
 * @access Admin, Agent
 */
const createStudent = async (req, res, next) => {
  try {
    const { leadId } = req.body;

    const lead = await Lead.findById(leadId);
    if (!lead) return next(createError('Lead not found', 404));

    // Ownership check: Agents can only perform actions for leads they own
    if (req.user.role === 'agent' && 
        lead.assignedAgent?.toString() !== req.user._id.toString() &&
        lead.createdBy?.toString() !== req.user._id.toString()) {
      return next(createError('Not authorized to manage students for this lead', 403));
    }

    // Handle Upsert: Update if exists, Create if not
    const student = await Student.findOneAndUpdate(
      { leadId },
      { 
        ...req.body, 
        organizationId: req.user.organizationId 
      },
      { 
        new: true, 
        upsert: true, 
        runValidators: true,
        setDefaultsOnInsert: true 
      }
    ).populate('leadId', 'name email phone status');

    // Robustly update lead status to 'Converted'
    const updatedLead = await Lead.findOneAndUpdate(
      { _id: leadId, organizationId: req.user.organizationId },
      { $set: { status: 'Converted' } },
      { new: true }
    );

    if (!updatedLead) {
      // If not found in this org, fallback to direct ID but this shouldn't normally happen
      await Lead.findByIdAndUpdate(leadId, { status: 'Converted' });
    }

    // Re-populate student with updated lead status for accurate response
    const studentWithUpdatedLead = await Student.findById(student._id).populate('leadId', 'name email phone status');

    const isNew = student.createdAt.getTime() === student.updatedAt.getTime();

    return sendSuccess(res, isNew ? 201 : 200, isNew ? 'Student profile created' : 'Student profile updated', { student: studentWithUpdatedLead });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get student profile by Lead ID
 * @route GET /api/students/lead/:leadId
 * @access Admin, Agent
 */
const getStudentByLeadId = async (req, res, next) => {
  try {
    const student = await Student.findOne({ leadId: req.params.leadId }).populate('leadId', 'name email phone status assignedAgent createdBy');
    if (!student) return next(createError('Student profile not found for this lead', 404));

    // Ownership check
    if (req.user.role === 'agent' && 
        student.leadId?.assignedAgent?.toString() !== req.user._id.toString() &&
        student.leadId?.createdBy?.toString() !== req.user._id.toString()) {
      return next(createError('Not authorized to view this student profile', 403));
    }

    return sendSuccess(res, 200, 'Student profile fetched', { student });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get student profile by ID
 * @route GET /api/students/:id
 * @access Admin, Agent
 */
const getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id).populate('leadId', 'name email phone status assignedAgent createdBy');
    if (!student) return next(createError('Student profile not found', 404));

    // Ownership check
    if (req.user.role === 'agent' && 
        student.leadId?.assignedAgent?.toString() !== req.user._id.toString() &&
        student.leadId?.createdBy?.toString() !== req.user._id.toString()) {
      return next(createError('Not authorized to view this student profile', 403));
    }

    return sendSuccess(res, 200, 'Student profile fetched', { student });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Update student profile
 * @route PUT /api/students/:id
 * @access Admin, Agent
 */
const updateStudent = async (req, res, next) => {
  try {
    let student = await Student.findById(req.params.id).populate('leadId');
    if (!student) return next(createError('Student profile not found', 404));

    // Ownership check
    if (req.user.role === 'agent' && 
        student.leadId?.assignedAgent?.toString() !== req.user._id.toString() &&
        student.leadId?.createdBy?.toString() !== req.user._id.toString()) {
      return next(createError('Not authorized to update this student profile', 403));
    }

    student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('leadId', 'name email phone');

    return sendSuccess(res, 200, 'Student profile updated', { student });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get all students with pagination and search
 * @route GET /api/students
 * @access Admin, Agent
 */
const getStudents = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { searchTerm } = req.query;

    let leadFilter = {};
    if (searchTerm) {
      leadFilter = {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
        ],
      };
    }

    // If searching by lead details, we first find the lead IDs
    let studentFilter = req.user.organizationId ? { organizationId: req.user.organizationId } : {};
    
    // Core Logic: Filtering for agents
    if (req.user.role === 'agent') {
        const agentLeads = await Lead.find({ 
            $or: [{ assignedAgent: req.user._id }, { createdBy: req.user._id }] 
        }).select('_id');
        const agentLeadIds = agentLeads.map(l => l._id);
        studentFilter.leadId = { $in: agentLeadIds };
    }

    if (searchTerm) {
      const matchingLeads = await Lead.find({
          ...leadFilter,
          _id: studentFilter.leadId || { $exists: true } // Sub-filter within already filtered set
      }).select('_id');
      const leadIds = matchingLeads.map((l) => l._id);
      studentFilter.leadId = { $in: leadIds };
    }

    const students = await Student.find(studentFilter)
      .populate('leadId', 'name email phone status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Student.countDocuments(studentFilter);

    return sendSuccess(res, 200, 'Students fetched', {
      students,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createStudent, getStudentById, updateStudent, getStudents, getStudentByLeadId };
