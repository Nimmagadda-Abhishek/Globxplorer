const User = require('../models/User');
const Notification = require('../models/Notification');
const { generateToken, sendSuccess, createError } = require('../utils/helpers');

/**
 * @desc  Login user (admin or agent)
 * @route POST /api/auth/login
 * @access Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Explicitly select password field (it's excluded by default)
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return next(createError('Invalid email or password', 401));
    }

    if (user.status === 'inactive') {
      return next(createError('Your account has been deactivated. Contact admin.', 403));
    }

    if (user.status === 'pending') {
      return next(createError('Account pending admin approval. Please wait for confirmation.', 403));
    }

    const token = generateToken(user._id);

    return sendSuccess(res, 200, 'Login successful', {
      token,
      user: {
        _id:   user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Register an agent (requires admin approval later)
 * @route POST /api/auth/register
 * @access Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(createError('Email already registered', 409));
    }

    const newAgent = await User.create({
      name,
      email,
      phone,
      password,
      role: 'agent',
      status: 'pending',
    });

    // Notify admins about the new registration
    const admins = await User.find({ role: 'admin' });
    if (admins.length > 0) {
      const notifications = admins.map((admin) => ({
        userId: admin._id,
        message: `New agent registration pending: ${name} (${email})`,
        type: 'Agent Registration',
        relatedEntity: {
          entityType: 'User',
          entityId: newAgent._id,
        },
      }));
      await Notification.insertMany(notifications);
      
      // If we had an io instance accessible here, we'd emit via socket
      const io = req.app.get('io');
      if (io) {
        admins.forEach(admin => {
          io.to(admin._id.toString()).emit('newNotification', {
            message: `New agent registration pending: ${name} (${email})`,
            type: 'Agent Registration'
          });
        });
      }
    }

    return sendSuccess(res, 201, 'Registration successful, pending admin approval', {
      user: {
        _id: newAgent._id,
        name: newAgent.name,
        email: newAgent.email,
        role: newAgent.role,
        status: newAgent.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, register };
