const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middleware/authMiddleware');

// Protected route (Admin only ideally, but for now just auth)
router.get('/stats', auth, dashboardController.getDashboardStats);

module.exports = router;
