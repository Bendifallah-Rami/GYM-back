const { User, Subscription, SubscriptionPlan, Attendance, Class, Notification } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../models');

// ============================================================================
// SYSTEM SETTINGS MANAGEMENT
// ============================================================================

const getSystemSettings = async (req, res) => {
  try {
    res.json({
      success: false,
      message: 'System settings functionality not implemented - requires Settings model'
    });

  } catch (error) {
    console.error('Get system settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system settings',
      error: error.message
    });
  }
};

const updateSystemSettings = async (req, res) => {
  try {
    res.json({
      success: false,
      message: 'System settings functionality not implemented - requires Settings model'
    });

  } catch (error) {
    console.error('Update system settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update system settings',
      error: error.message
    });
  }
};

// ============================================================================
// USER MANAGEMENT
// ============================================================================

const getUserManagement = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      role, 
      status,
      registration_date_from,
      registration_date_to,
      last_login_from,
      last_login_to
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Role filter
    if (role) {
      whereClause.role = role;
    }

    // Status filter
    if (status) {
      whereClause.status = status;
    }

    // Registration date filter
    if (registration_date_from || registration_date_to) {
      whereClause.created_at = {};
      if (registration_date_from) {
        whereClause.created_at[Op.gte] = new Date(registration_date_from);
      }
      if (registration_date_to) {
        whereClause.created_at[Op.lte] = new Date(`${registration_date_to} 23:59:59`);
      }
    }

    // Last login filter
    if (last_login_from || last_login_to) {
      whereClause.last_login = {};
      if (last_login_from) {
        whereClause.last_login[Op.gte] = new Date(last_login_from);
      }
      if (last_login_to) {
        whereClause.last_login[Op.lte] = new Date(`${last_login_to} 23:59:59`);
      }
    }

    const users = await User.findAndCountAll({
      where: whereClause,
      attributes: { 
        exclude: ['password_hash', 'email_verification_token'] 
      },
      include: [
        {
          model: Subscription,
          as: 'subscriptions',
          include: [{
            model: SubscriptionPlan,
            as: 'plan',
            attributes: ['id', 'name', 'price']
          }],
          required: false,
          where: { confirmation_status: 'confirmed' },
          order: [['created_at', 'DESC']],
          limit: 1
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    const totalPages = Math.ceil(users.count / limit);

    // Get summary statistics
    const stats = await Promise.all([
      User.count({ where: { role: 'user', status: 'active' } }),
      User.count({ where: { role: 'user', status: 'inactive' } }),
      User.count({ where: { role: { [Op.in]: ['employee', 'coach'] } } }),
      User.count({ where: { 
        created_at: { 
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
        } 
      }}),
      Subscription.count({ where: { confirmation_status: 'confirmed' } })
    ]);

    res.json({
      success: true,
      data: {
        users: users.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers: users.count,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        stats: {
          activeMembers: stats[0],
          inactiveMembers: stats[1],
          staff: stats[2],
          newMembersThisMonth: stats[3],
          activeSubscriptions: stats[4]
        }
      }
    });

  } catch (error) {
    console.error('Get user management error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user management data',
      error: error.message
    });
  }
};

const bulkUserActions = async (req, res) => {
  try {
    const { action, userIds, data } = req.body;

    if (!action || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Action and user IDs are required'
      });
    }

    let result;
    const results = [];

    switch (action) {
      case 'activate':
        result = await User.update(
          { status: 'active' },
          { where: { id: { [Op.in]: userIds } } }
        );
        results.push(`${result[0]} users activated`);
        break;

      case 'deactivate':
        result = await User.update(
          { status: 'inactive' },
          { where: { id: { [Op.in]: userIds } } }
        );
        results.push(`${result[0]} users deactivated`);
        break;

      case 'delete':
        // Soft delete by updating status and email
        const users = await User.findAll({
          where: { id: { [Op.in]: userIds } },
          attributes: ['id', 'email']
        });
        
        for (const user of users) {
          await user.update({
            status: 'deleted',
            email: `deleted_${Date.now()}_${user.email}`,
            deleted_at: new Date()
          });
        }
        results.push(`${users.length} users deleted`);
        break;

      case 'change_role':
        if (!data || !data.role) {
          return res.status(400).json({
            success: false,
            message: 'Role is required for change_role action'
          });
        }
        result = await User.update(
          { role: data.role },
          { where: { id: { [Op.in]: userIds } } }
        );
        results.push(`${result[0]} users role changed to ${data.role}`);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action specified'
        });
    }

    res.json({
      success: true,
      message: 'Bulk action completed successfully',
      data: { results }
    });

  } catch (error) {
    console.error('Bulk user actions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk action',
      error: error.message
    });
  }
};

// ============================================================================
// STAFF MANAGEMENT
// ============================================================================

const manageStaff = async (req, res) => {
  try {
    const staff = await User.findAll({
      where: {
        role: { [Op.in]: ['employee', 'coach', 'admin'] }
      },
      attributes: { 
        exclude: ['password_hash', 'email_verification_token'] 
      },
      order: [['role', 'ASC'], ['name', 'ASC']]
    });

    // Get staff performance metrics
    const staffWithMetrics = await Promise.all(
      staff.map(async (member) => {
        let metrics = {};

        if (member.role === 'employee' || member.role === 'admin') {
          // Get check-ins processed
          metrics.checkInsProcessed = await Attendance.count({
            where: { recorded_by: member.id }
          });

          // Get subscriptions confirmed
          metrics.subscriptionsConfirmed = await Subscription.count({
            where: { confirmed_by: member.id }
          });
        }

        if (member.role === 'coach') {
          // Get classes taught
          metrics.classesTought = await Class.count({
            where: { coach_id: member.id }
          });

          // Get total students
          const coachClasses = await Class.findAll({
            where: { coach_id: member.id },
            attributes: ['id', 'registered_users']
          });
          
          let uniqueStudents = new Set();
          coachClasses.forEach(cls => {
            if (cls.registered_users && Array.isArray(cls.registered_users)) {
              cls.registered_users.forEach(userId => uniqueStudents.add(userId));
            }
          });
          metrics.totalStudents = uniqueStudents.size;
        }

        return {
          ...member.toJSON(),
          metrics
        };
      })
    );

    const summary = {
      totalStaff: staff.length,
      admins: staff.filter(s => s.role === 'admin').length,
      employees: staff.filter(s => s.role === 'employee').length,
      coaches: staff.filter(s => s.role === 'coach').length,
      activeStaff: staff.filter(s => s.status === 'active').length
    };

    res.json({
      success: true,
      data: {
        staff: staffWithMetrics,
        summary
      }
    });

  } catch (error) {
    console.error('Manage staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff data',
      error: error.message
    });
  }
};

// ============================================================================
// REPORTS & ANALYTICS
// ============================================================================

const getSystemReports = async (req, res) => {
  try {
    const { period = 'month', type = 'summary' } = req.query;

    let startDate;
    const endDate = new Date();

    switch (period) {
      case 'week':
        startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case 'month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 3, 1);
        break;
      case 'year':
        startDate = new Date(endDate.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    }

    const reports = {};

    if (type === 'summary' || type === 'membership') {
      // Membership report
      reports.membership = {
        newRegistrations: await User.count({
          where: {
            role: 'user',
            created_at: { [Op.between]: [startDate, endDate] }
          }
        }),
        activeMembers: await User.count({
          where: { role: 'user', status: 'active' }
        }),
        totalSubscriptions: await Subscription.count({
          where: {
            confirmation_status: 'confirmed',
            created_at: { [Op.between]: [startDate, endDate] }
          }
        })
      };
    }

    if (type === 'summary' || type === 'attendance') {
      // Attendance report
      const attendanceData = await Attendance.findAll({
        where: {
          check_in_time: { [Op.between]: [startDate, endDate] }
        },
        attributes: ['check_in_time', 'check_out_time']
      });

      reports.attendance = {
        totalCheckIns: attendanceData.length,
        completedSessions: attendanceData.filter(a => a.check_out_time).length,
        averageSessionLength: attendanceData
          .filter(a => a.check_out_time)
          .reduce((total, a) => {
            const duration = (new Date(a.check_out_time) - new Date(a.check_in_time)) / (1000 * 60);
            return total + duration;
          }, 0) / attendanceData.filter(a => a.check_out_time).length || 0
      };
    }

    if (type === 'summary' || type === 'financial') {
      // Financial report
      const subscriptions = await Subscription.findAll({
        where: {
          confirmation_status: 'confirmed',
          created_at: { [Op.between]: [startDate, endDate] }
        },
        include: [{
          model: SubscriptionPlan,
          as: 'plan',
          attributes: ['price']
        }]
      });

      const revenue = subscriptions.reduce((total, sub) => {
        return total + (sub.plan ? parseFloat(sub.plan.price) : 0);
      }, 0);

      reports.financial = {
        totalRevenue: revenue,
        averageRevenuePerSubscription: subscriptions.length > 0 ? revenue / subscriptions.length : 0,
        totalTransactions: subscriptions.length
      };
    }

    res.json({
      success: true,
      data: {
        period,
        dateRange: { start: startDate, end: endDate },
        reports
      }
    });

  } catch (error) {
    console.error('Get system reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate reports',
      error: error.message
    });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let startDate;
    const endDate = new Date();
    
    switch (period) {
      case 'week':
        startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case 'month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(endDate.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    }

    // User growth analytics
    const userGrowth = await User.findAll({
      where: {
        created_at: { [Op.between]: [startDate, endDate] },
        role: 'user'
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']]
    });

    // Attendance analytics
    const attendanceAnalytics = await Attendance.findAll({
      where: {
        check_in_time: { [Op.between]: [startDate, endDate] }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('check_in_time')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('check_in_time'))],
      order: [[sequelize.fn('DATE', sequelize.col('check_in_time')), 'ASC']]
    });

    // Most popular class times
    const popularTimes = await Class.findAll({
      attributes: [
        'time',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['time'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 5
    });

    res.json({
      success: true,
      data: {
        period,
        dateRange: { start: startDate, end: endDate },
        analytics: {
          userGrowth,
          attendancePattern: attendanceAnalytics,
          popularClassTimes: popularTimes
        }
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
};

const exportData = async (req, res) => {
  try {
    const { type, format = 'json' } = req.query;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Export type is required (users, attendance, subscriptions, classes)'
      });
    }

    let data;
    let filename;

    switch (type) {
      case 'users':
        data = await User.findAll({
          attributes: { exclude: ['password_hash', 'email_verification_token'] }
        });
        filename = 'users_export.json';
        break;
      
      case 'attendance':
        data = await Attendance.findAll({
          include: [{
            model: User,
            as: 'user',
            attributes: ['name', 'email']
          }]
        });
        filename = 'attendance_export.json';
        break;
      
      case 'subscriptions':
        data = await Subscription.findAll({
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['name', 'email']
            },
            {
              model: SubscriptionPlan,
              as: 'plan'
            }
          ]
        });
        filename = 'subscriptions_export.json';
        break;
      
      case 'classes':
        data = await Class.findAll({
          include: [{
            model: User,
            as: 'coach',
            attributes: ['name', 'email']
          }]
        });
        filename = 'classes_export.json';
        break;
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type'
        });
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.json(data);
    } else {
      res.status(400).json({
        success: false,
        message: 'Only JSON format is currently supported'
      });
    }

  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: error.message
    });
  }
};

// ============================================================================
// AUDIT & LOGS
// ============================================================================

const getAuditLogs = async (req, res) => {
  try {
    // This is a placeholder for audit log functionality
    // In a real implementation, you would have an AuditLog model
    res.json({
      success: true,
      data: {
        logs: [
          {
            id: 1,
            action: 'USER_LOGIN',
            user_id: 1,
            details: 'User logged in successfully',
            ip_address: '192.168.1.100',
            timestamp: new Date()
          }
        ],
        message: 'Audit log functionality not fully implemented'
      }
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message
    });
  }
};

// ============================================================================
// SYSTEM HEALTH & MAINTENANCE
// ============================================================================

const getSystemHealth = async (req, res) => {
  try {
    // Database health
    let dbHealth = 'healthy';
    try {
      await sequelize.authenticate();
    } catch (error) {
      dbHealth = 'unhealthy';
    }

    // Get database stats
    const dbStats = await Promise.all([
      User.count(),
      Subscription.count(),
      Attendance.count(),
      Class.count(),
      Notification.count()
    ]);

    const health = {
      status: dbHealth === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date(),
      services: {
        database: {
          status: dbHealth,
          recordCounts: {
            users: dbStats[0],
            subscriptions: dbStats[1],
            attendance: dbStats[2],
            classes: dbStats[3],
            notifications: dbStats[4]
          }
        },
        api: {
          status: 'healthy',
          uptime: process.uptime()
        }
      },
      memory: {
        used: process.memoryUsage().heapUsed / 1024 / 1024,
        total: process.memoryUsage().heapTotal / 1024 / 1024
      }
    };

    res.json({
      success: true,
      data: { health }
    });

  } catch (error) {
    console.error('Get system health error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check system health',
      error: error.message
    });
  }
};

const backupDatabase = async (req, res) => {
  try {
    // This is a placeholder for backup functionality
    // In a real implementation, you would use pg_dump or similar
    res.json({
      success: false,
      message: 'Database backup functionality not implemented'
    });

  } catch (error) {
    console.error('Backup database error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to backup database',
      error: error.message
    });
  }
};

module.exports = {
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
};