const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

// All routes admin-only via auth middleware + controller check
router.get('/', auth, userController.listUsers);
router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);
router.put('/profile/photo', auth, userController.updateProfilePhoto);
router.get('/:id', auth, userController.getUser);
router.post('/', auth, userController.createUser);
router.put('/:id', auth, userController.updateUser);
router.delete('/:id', auth, userController.deleteUser);
router.patch('/:id/reactivate', auth, userController.reactivateUser);

module.exports = router;