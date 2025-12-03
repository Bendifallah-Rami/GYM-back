const { User, Subscription, SubscriptionPlan, Attendance, Class, Notification, CoachAssignment } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../models');

// ============================================================================
// USER DASHBOARD CONTROLLER
// ============================================================================

const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date();
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate());

    // Get user's active subscription
    const activeSubscription = await Subscription.findOne({
      where: {
        user_id: userId,
        confirmation_status: 'confirmed',
        [Op.or]: [
          { end_date: { [Op.gte]: currentDate } },
          { end_date: null }
        ]
      },
      include: [{
        model: SubscriptionPlan,
        as: 'plan',
        attributes: ['id', 'name', 'description', 'duration_months', 'features']
      }],
      order: [['created_at', 'DESC']]
    });

    // Get recent attendance (last 7 days)
    const recentAttendance = await Attendance.count({
      where: {
        user_id: userId,
        check_in_time: {
          [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    // Get upcoming classes user joined - Note: Current Class model doesn't support scheduling
    // This functionality requires adding date/time fields to Class model
    const upcomingClasses = [];

    // Get unread notifications count
    const unreadNotifications = await Notification.count({
      where: {
        user_id: userId,
        is_read: false
      }
    });

    // Get monthly attendance stats
    const monthlyAttendance = await Attendance.count({
      where: {
        user_id: userId,
        check_in_time: {
          [Op.gte]: lastMonth
        }
      }
    });

    // Check if user is currently checked in
    const currentlyCheckedIn = await Attendance.findOne({
      where: {
        user_id: userId,
        check_out_time: null
      }
    });

    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role
        },
        subscription: activeSubscription,
        stats: {
          weeklyVisits: recentAttendance,
          monthlyVisits: monthlyAttendance,
          unreadNotifications,
          upcomingClasses: upcomingClasses.length,
          currentlyCheckedIn: !!currentlyCheckedIn
        },
        upcomingClasses,
        checkInStatus: currentlyCheckedIn ? {
          checkedIn: true,
          checkInTime: currentlyCheckedIn.check_in_time,
          duration: Math.floor((new Date() - new Date(currentlyCheckedIn.check_in_time)) / (1000 * 60))
        } : { checkedIn: false }
      }
    });

  } catch (error) {
    console.error('Get user dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user dashboard',
      error: error.message
    });
  }
};

// ============================================================================
// EMPLOYEE DASHBOARD CONTROLLER
// ============================================================================

const getEmployeeDashboard = async (req, res) => {
  try {
    const currentDate = new Date();
    const startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));
    const startOfWeek = new Date(currentDate.getTime() - (7 * 24 * 60 * 60 * 1000));

    // Today's check-ins
    const todayCheckIns = await Attendance.count({
      where: {
        check_in_time: {
          [Op.between]: [startOfDay, endOfDay]
        }
      }
    });

    // Currently checked-in users
    const currentlyCheckedIn = await Attendance.count({
      where: {
        check_out_time: null
      }
    });

    // Pending subscription requests
    const pendingSubscriptions = await Subscription.count({
      where: {
        confirmation_status: 'pending'
      }
    });

    // Today's classes - Note: Current Class model doesn't support date-based scheduling
    const todayClasses = [];

    // Weekly stats
    const weeklyStats = await Promise.all([
      Attendance.count({
        where: {
          check_in_time: { [Op.gte]: startOfWeek }
        }
      }),
      User.count({
        where: {
          role: 'user',
          created_at: { [Op.gte]: startOfWeek }
        }
      }),
      Subscription.count({
        where: {
          created_at: { [Op.gte]: startOfWeek }
        }
      })
    ]);

    // Recent notifications for staff attention
    const recentNotifications = await Notification.findAll({
      where: {
        type: { [Op.in]: ['system', 'subscription', 'attendance'] },
        created_at: { [Op.gte]: startOfWeek }
      },
      limit: 10,
      order: [['created_at', 'DESC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }]
    });

    res.json({
      success: true,
      data: {
        todayStats: {
          checkIns: todayCheckIns,
          currentlyCheckedIn,
          pendingSubscriptions,
          scheduledClasses: todayClasses.length
        },
        weeklyStats: {
          totalCheckIns: weeklyStats[0],
          newMembers: weeklyStats[1],
          newSubscriptions: weeklyStats[2]
        },
        todayClasses,
        recentNotifications,
        quickActions: [
          { id: 'check-in', label: 'Check In Member', url: '/attendance/check-in' },
          { id: 'subscriptions', label: 'Review Subscriptions', url: '/subscriptions' },
          { id: 'classes', label: 'Manage Classes', url: '/classes' },
          { id: 'users', label: 'User Management', url: '/users' }
        ]
      }
    });

  } catch (error) {
    console.error('Get employee dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee dashboard',
      error: error.message
    });
  }
};

// ============================================================================
// ADMIN DASHBOARD CONTROLLER
// ============================================================================

const getAdminDashboard = async (req, res) => {
  try {
    const currentDate = new Date();
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const thisMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    // Overall system stats
    const systemStats = await Promise.all([
      User.count({ where: { role: 'user', status: 'active' } }),
      User.count({ where: { role: { [Op.in]: ['employee', 'coach'] }, status: 'active' } }),
      Subscription.count({ where: { confirmation_status: 'confirmed' } }),
      Class.count(),
      Attendance.count(),
      CoachAssignment.count()
    ]);

    // Monthly comparisons
    const monthlyStats = await Promise.all([
      // This month
      User.count({
        where: {
          role: 'user',
          created_at: { [Op.gte]: thisMonth }
        }
      }),
      Subscription.count({
        where: {
          created_at: { [Op.gte]: thisMonth }
        }
      }),
      Attendance.count({
        where: {
          check_in_time: { [Op.gte]: thisMonth }
        }
      }),
      // Last month
      User.count({
        where: {
          role: 'user',
          created_at: {
            [Op.gte]: lastMonth,
            [Op.lt]: thisMonth
          }
        }
      }),
      Subscription.count({
        where: {
          created_at: {
            [Op.gte]: lastMonth,
            [Op.lt]: thisMonth
          }
        }
      }),
      Attendance.count({
        where: {
          check_in_time: {
            [Op.gte]: lastMonth,
            [Op.lt]: thisMonth
          }
        }
      })
    ]);

    // Revenue calculation (based on confirmed subscriptions)
    const revenueData = await Subscription.findAll({
      where: {
        confirmation_status: 'confirmed',
        created_at: { [Op.gte]: thisMonth }
      },
      include: [{
        model: SubscriptionPlan,
        as: 'plan',
        attributes: ['price']
      }]
    });

    const monthlyRevenue = revenueData.reduce((total, sub) => {
      return total + (sub.plan ? parseFloat(sub.plan.price) : 0);
    }, 0);

    // System alerts
    const alerts = [];
    
    // Check for pending subscriptions
    const pendingSubsCount = await Subscription.count({
      where: { confirmation_status: 'pending' }
    });
    if (pendingSubsCount > 0) {
      alerts.push({
        type: 'warning',
        message: `${pendingSubsCount} subscription(s) pending approval`,
        action: '/subscriptions'
      });
    }

    // Check for inactive staff
    const inactiveStaff = await User.count({
      where: {
        role: { [Op.in]: ['employee', 'coach'] },
        status: 'inactive'
      }
    });
    if (inactiveStaff > 0) {
      alerts.push({
        type: 'info',
        message: `${inactiveStaff} inactive staff member(s)`,
        action: '/users'
      });
    }

    res.json({
      success: true,
      data: {
        systemOverview: {
          totalMembers: systemStats[0],
          activeStaff: systemStats[1],
          activeSubscriptions: systemStats[2],
          totalClasses: systemStats[3],
          totalCheckIns: systemStats[4],
          coachAssignments: systemStats[5]
        },
        monthlyComparison: {
          thisMonth: {
            newMembers: monthlyStats[0],
            newSubscriptions: monthlyStats[1],
            checkIns: monthlyStats[2],
            revenue: monthlyRevenue
          },
          lastMonth: {
            newMembers: monthlyStats[3],
            newSubscriptions: monthlyStats[4],
            checkIns: monthlyStats[5]
          }
        },
        alerts,
        quickActions: [
          { id: 'users', label: 'User Management', url: '/users', icon: 'users' },
          { id: 'subscriptions', label: 'Subscription Plans', url: '/subscription-plans', icon: 'credit-card' },
          { id: 'classes', label: 'Class Management', url: '/classes', icon: 'calendar' },
          { id: 'coaches', label: 'Coach Assignments', url: '/coach-assignments', icon: 'user-check' },
          { id: 'reports', label: 'Reports & Analytics', url: '/reports', icon: 'bar-chart' },
          { id: 'settings', label: 'System Settings', url: '/settings', icon: 'settings' }
        ]
      }
    });

  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin dashboard',
      error: error.message
    });
  }
};

// ============================================================================
// ADDITIONAL DASHBOARD UTILITIES
// ============================================================================

const getSystemOverview = async (req, res) => {
  try {
    const { period = 'week' } = req.query; // 'day', 'week', 'month', 'year'
    
    let startDate;
    const endDate = new Date();
    
    switch (period) {
      case 'day':
        startDate = new Date(endDate.getTime() - (24 * 60 * 60 * 1000));
        break;
      case 'week':
        startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case 'month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, endDate.getDate());
        break;
      case 'year':
        startDate = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());
        break;
      default:
        startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000));
    }

    const stats = await Promise.all([
      User.count({ where: { created_at: { [Op.between]: [startDate, endDate] } } }),
      Attendance.count({ where: { check_in_time: { [Op.between]: [startDate, endDate] } } }),
      Subscription.count({ where: { created_at: { [Op.between]: [startDate, endDate] } } }),
      Class.count({ where: { created_at: { [Op.between]: [startDate, endDate] } } })
    ]);

    res.json({
      success: true,
      data: {
        period,
        stats: {
          newUsers: stats[0],
          checkIns: stats[1],
          newSubscriptions: stats[2],
          classesCreated: stats[3]
        },
        dateRange: {
          start: startDate,
          end: endDate
        }
      }
    });

  } catch (error) {
    console.error('Get system overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system overview',
      error: error.message
    });
  }
};

const getRevenueStats = async (req, res) => {
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

    const subscriptions = await Subscription.findAll({
      where: {
        confirmation_status: 'confirmed',
        created_at: { [Op.between]: [startDate, endDate] }
      },
      include: [{
        model: SubscriptionPlan,
        as: 'plan',
        attributes: ['id', 'name', 'price', 'duration_months']
      }]
    });

    const revenue = subscriptions.reduce((total, sub) => {
      return total + (sub.plan ? parseFloat(sub.plan.price) : 0);
    }, 0);

    const revenueByPlan = subscriptions.reduce((acc, sub) => {
      if (sub.plan) {
        const planName = sub.plan.name;
        acc[planName] = (acc[planName] || 0) + parseFloat(sub.plan.price);
      }
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        period,
        totalRevenue: revenue,
        totalSubscriptions: subscriptions.length,
        averageRevenue: subscriptions.length > 0 ? revenue / subscriptions.length : 0,
        revenueByPlan,
        dateRange: {
          start: startDate,
          end: endDate
        }
      }
    });

  } catch (error) {
    console.error('Get revenue stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue statistics',
      error: error.message
    });
  }
};

const getUserEngagement = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let startDate;
    const endDate = new Date();
    
    switch (period) {
      case 'week':
        startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case 'month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, endDate.getDate());
        break;
      case 'year':
        startDate = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());
        break;
      default:
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, endDate.getDate());
    }

    // Active users (users who checked in during period)
    const activeUsers = await Attendance.findAll({
      where: {
        check_in_time: { [Op.between]: [startDate, endDate] }
      },
      attributes: ['user_id'],
      group: ['user_id']
    });

    // Class participation - get all classes and count unique participants
    const allClasses = await Class.findAll({
      attributes: ['id', 'registered_users']
    });

    let uniqueParticipants = new Set();
    let totalParticipations = 0;

    allClasses.forEach(cls => {
      if (cls.registered_users && Array.isArray(cls.registered_users)) {
        cls.registered_users.forEach(userId => {
          uniqueParticipants.add(userId);
          totalParticipations++;
        });
      }
    });

    const classParticipation = [{
      participants: uniqueParticipants.size,
      total_participations: totalParticipations
    }];

    // Average check-ins per active user
    const totalCheckIns = await Attendance.count({
      where: {
        check_in_time: { [Op.between]: [startDate, endDate] }
      }
    });

    res.json({
      success: true,
      data: {
        period,
        activeUsers: activeUsers.length,
        totalCheckIns,
        averageCheckInsPerUser: activeUsers.length > 0 ? totalCheckIns / activeUsers.length : 0,
        classParticipation: classParticipation[0] || { participants: 0, total_participations: 0 },
        dateRange: {
          start: startDate,
          end: endDate
        }
      }
    });

  } catch (error) {
    console.error('Get user engagement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user engagement metrics',
      error: error.message
    });
  }
};

const getQuickActions = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let actions = [];

    if (role === 'user') {
      // Check if user can check in
      const isCheckedIn = await Attendance.findOne({
        where: {
          user_id: userId,
          check_out_time: null
        }
      });

      // Note: Current Class model doesn't support date-based scheduling
      // This functionality requires adding date/time fields to Class model
      const upcomingClass = null;

      actions = [
        {
          id: 'view-schedule',
          label: 'View Class Schedule',
          url: '/classes',
          icon: 'calendar',
          primary: true
        },
        {
          id: 'subscription',
          label: 'Manage Subscription',
          url: '/subscriptions/my',
          icon: 'credit-card'
        },
        {
          id: 'attendance',
          label: 'View My Stats',
          url: '/attendance/my/stats',
          icon: 'bar-chart'
        }
      ];

      if (upcomingClass) {
        actions.unshift({
          id: 'next-class',
          label: `Next Class: ${upcomingClass.name}`,
          url: `/classes/${upcomingClass.id}`,
          icon: 'play-circle',
          primary: true
        });
      }

    } else if (role === 'employee' || role === 'admin') {
      actions = [
        {
          id: 'check-in-member',
          label: 'Check In Member',
          url: '/attendance/check-in',
          icon: 'user-plus',
          primary: true
        },
        {
          id: 'review-subscriptions',
          label: 'Review Subscriptions',
          url: '/subscriptions',
          icon: 'file-text'
        },
        {
          id: 'manage-classes',
          label: 'Manage Classes',
          url: '/classes',
          icon: 'calendar'
        }
      ];

      if (role === 'admin') {
        actions.push({
          id: 'user-management',
          label: 'User Management',
          url: '/users',
          icon: 'users'
        });
      }
    }

    res.json({
      success: true,
      data: { actions }
    });

  } catch (error) {
    console.error('Get quick actions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quick actions',
      error: error.message
    });
  }
};

module.exports = {
  getUserDashboard,
  getEmployeeDashboard,
  getAdminDashboard,
  getSystemOverview,
  getRevenueStats,
  getUserEngagement,
  getQuickActions
};