const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const {
  getAdminDashboard,
  getEmployeeDashboard,
  getUserDashboard,
  getSystemOverview,
  getRevenueStats,
  getUserEngagement,
  getQuickActions
} = require('../controllers/dashboardController');

// Apply rate limiting
router.use(generalLimiter);

// ============================================================================
// USER DASHBOARD ROUTES (All authenticated users)
// ============================================================================

// Get user dashboard (GET /api/dashboard/user)
router.get('/user', verifyToken, getUserDashboard);

// Get user quick actions (GET /api/dashboard/user/quick-actions)
router.get('/user/quick-actions', verifyToken, getQuickActions);

// ============================================================================
// EMPLOYEE DASHBOARD ROUTES (Employee/Admin access)
// ============================================================================

// Get employee dashboard (GET /api/dashboard/employee)
router.get('/employee', 
  verifyToken, 
  authorize('employee', 'admin'), 
  getEmployeeDashboard
);

// Get user engagement metrics (GET /api/dashboard/employee/engagement)
router.get('/employee/engagement', 
  verifyToken, 
  authorize('employee', 'admin'), 
  getUserEngagement
);

// ============================================================================
// ADMIN DASHBOARD ROUTES (Admin only)
// ============================================================================

// Get admin dashboard (GET /api/dashboard/admin)
router.get('/admin', 
  verifyToken, 
  authorize('admin'), 
  getAdminDashboard
);

// Get system overview (GET /api/dashboard/admin/overview)
router.get('/admin/overview', 
  verifyToken, 
  authorize('admin'), 
  getSystemOverview
);

// Get revenue statistics (GET /api/dashboard/admin/revenue)
router.get('/admin/revenue', 
  verifyToken, 
  authorize('admin'), 
  getRevenueStats
);

module.exports = router;