const express = require('express');
const router = express.Router();
const { getUsers, getUserById, updateUser, deleteUser } = require('../controllers/userController');
const { verifyToken, authorize } = require('../middleware/auth');

// Get all users (admin and employee only)
router.get('/', verifyToken, authorize('admin', 'employee'), getUsers);

// Get user by ID (admin and employee only)
router.get('/:id', verifyToken, authorize('admin', 'employee'), getUserById);

// Update user by ID (admin only)
router.put('/:id', verifyToken, authorize('admin'), updateUser);

// Delete user by ID (admin only)
router.delete('/:id', verifyToken, authorize('admin'), deleteUser);

module.exports = router;  