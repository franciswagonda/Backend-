const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');

// Public routes - anyone can view faculties and departments
router.get('/faculties', facultyController.getAllFaculties);
router.get('/faculties/:id', facultyController.getFacultyById);
router.get('/departments', facultyController.getAllDepartments);

module.exports = router;
