const express = require('express');
const router  = express.Router();

const { login, register }  = require('../controllers/authController');
const { authValidators } = require('../validators/validators');
const validate   = require('../middleware/validateMiddleware');

router.post('/login', authValidators.login, validate, login);
router.post('/register', authValidators.register, validate, register);

module.exports = router;
