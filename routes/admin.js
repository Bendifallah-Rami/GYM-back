const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const {
  getSystemSettings,
  updateSystemSettings,
  getUserManagement,
  bulkUserActions,
  getSystemReports,
  exportData,
  getAuditLogs,
  manageStaff,
  getSystemHealth,
  backupDatabase,
  getAnalytics
} = require('../controllers/adminController');

// Apply rate limiting
router.use(generalLimiter);

// All routes require admin authorization
router.use(verifyToken);
router.use(authorize('admin'));

// ============================================================================
// SYSTEM SETTINGS MANAGEMENT (Not implemented - requires Settings model)
// ============================================================================

// Get system settings (GET /api/admin/settings)
router.get('/settings', getSystemSettings);

// Update system settings (PUT /api/admin/settings)
router.put('/settings', updateSystemSettings);

// ============================================================================
// USER MANAGEMENT
// ============================================================================

// Get comprehensive user management data (GET /api/admin/user-management)
router.get('/user-management', getUserManagement);

// Bulk user actions (POST /api/admin/users/bulk-action)
router.post('/users/bulk-action', bulkUserActions);

// ============================================================================
// STAFF MANAGEMENT
// ============================================================================

// Manage staff (employees, coaches) (GET /api/admin/staff)
router.get('/staff', manageStaff);

// ============================================================================
// REPORTS & ANALYTICS
// ============================================================================

// Get system reports (GET /api/admin/reports)
router.get('/reports', getSystemReports);

// Get analytics data (GET /api/admin/analytics)
router.get('/analytics', getAnalytics);

// Export data (GET /api/admin/export)
router.get('/export', exportData);

// ============================================================================
// AUDIT & LOGS
// ============================================================================

// Get audit logs (GET /api/admin/audit-logs)
router.get('/audit-logs', getAuditLogs);

// ============================================================================
// SYSTEM HEALTH & MAINTENANCE
// ============================================================================

// Get system health (GET /api/admin/health)
router.get('/health', getSystemHealth);

// Backup database (POST /api/admin/backup)
router.post('/backup', backupDatabase);

module.exports = router;