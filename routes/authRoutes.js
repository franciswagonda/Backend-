const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');

// Admin-provisioned user creation (was public register)
router.post('/register', auth, authController.register);
// Login remains public
router.post('/login', authController.login);
// Password reset routes (public)
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/reset-password/:token', authController.resetPassword);
// Change password (authenticated)
router.post('/change-password', auth, authController.changePassword);

module.exports = router;
