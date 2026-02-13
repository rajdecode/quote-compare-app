const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');

// Protect all admin routes
router.use(verifyToken);
router.use(checkRole(['admin']));

router.get('/users', adminController.getUsers);
router.patch('/users/:id', adminController.updateUserStatus);
router.get('/stats', adminController.getStats);
router.get('/stats/:id', adminController.getUserStats);

module.exports = router;
