const User = require('../models/User');
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
    });

    return sendSuccess(res, 201, 'Agent created successfully', {
      agent: { _id: agent._id, name: agent.name, email: agent.email, phone: agent.phone, status: agent.status },
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

    const agents = await User.find(filter).select('-password').sort({ createdAt: -1 });
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

module.exports = { createAgent, getAgents, updateAgent, deactivateAgent };
