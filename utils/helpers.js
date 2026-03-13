const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT token for a user.
 * @param {string} id - User MongoDB ObjectId
 * @returns {string} Signed JWT
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Build a standardized API success response.
 */
const sendSuccess = (res, statusCode, message, data = {}) => {
  return res.status(statusCode).json({ success: true, message, ...data });
};

/**
 * Create a custom error with a status code.
 */
const createError = (message, statusCode = 500) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

module.exports = { generateToken, sendSuccess, createError };
