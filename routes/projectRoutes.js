const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Faculty-specific route (for supervisors and faculty admins) - MUST come before /:id
router.get('/faculty/my-projects', auth, projectController.getMyFacultyProjects);

// Public Routes
router.get('/', projectController.getAllProjects);

// Protected routes (specific paths MUST come before parameterized routes)
router.get('/my-projects', auth, projectController.getMyProjects);
router.post('/', auth, upload, projectController.createProject);
router.put('/:id', auth, upload, projectController.updateProject);
router.patch('/:id/review', auth, projectController.reviewProject);
router.delete('/:id', auth, projectController.deleteProject);

// Parameterized route must come last to avoid capturing specific paths like /my-projects
router.get('/:id', projectController.getProjectById);

// Comment routes
router.post('/:id/comments', auth, projectController.addComment);
router.get('/:id/comments', projectController.getProjectComments);

module.exports = router;

