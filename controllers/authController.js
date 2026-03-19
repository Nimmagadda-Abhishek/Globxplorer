const User = require('../models/User');
const Notification = require('../models/Notification');
const { generateToken, sendSuccess, createError } = require('../utils/helpers');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

/**
 * @desc  Forgot password - send reset email
 * @route POST /api/auth/forgot-password
 * @access Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return next(createError('There is no user with that email', 404));
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset url (use first origin if multiple are defined)
    const primaryClientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',')[0] : '';
    const resetUrl = `${primaryClientUrl}/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password reset token',
        message,
      });

      return sendSuccess(res, 200, 'Email sent');
    } catch (err) {
      console.error(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return next(createError('Email could not be sent', 500));
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Reset password
 * @route PUT /api/auth/reset-password/:resettoken
 * @access Public
 */
const resetPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(createError('Invalid or expired token', 400));
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return sendSuccess(res, 200, 'Password reset successful');
  } catch (error) {
    next(error);
  }
};


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

/**
 * @desc  Change password for current user
 * @route PUT /api/auth/change-password
 * @access Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // req.user.id is available from protect middleware
    const user = await User.findById(req.user.id).select('+password');

    if (!user || !(await user.matchPassword(currentPassword))) {
      return next(createError('Invalid current password', 401));
    }

    user.password = newPassword;
    await user.save();

    return sendSuccess(res, 200, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = { login, register, changePassword, forgotPassword, resetPassword };
