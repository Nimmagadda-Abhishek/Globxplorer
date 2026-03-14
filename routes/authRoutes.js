const express = require('express');
const router  = express.Router();

const { login, register, changePassword, forgotPassword, resetPassword }  = require('../controllers/authController');
const { authValidators } = require('../validators/validators');
const validate   = require('../middleware/validateMiddleware');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', authValidators.login, validate, login);
router.post('/register', authValidators.register, validate, register);
router.put('/change-password', protect, authValidators.changePassword, validate, changePassword);

router.post('/forgot-password', authValidators.forgotPassword, validate, forgotPassword);
router.put('/reset-password/:resettoken', authValidators.resetPassword, validate, resetPassword);

module.exports = router;
