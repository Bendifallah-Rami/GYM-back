const { User, Subscription, SubscriptionPlan, Attendance, Class, Notification } = require('../models');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { sequelize } = require('../models');
const NotificationService = require('../services/notificationService');

// ============================================================================
// USER PROFILE MANAGEMENT
// ============================================================================

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { 
        exclude: ['password_hash', 'email_verification_token'] 
      },
      include: [{
        model: Subscription,
        as: 'subscriptions',
        include: [{
          model: SubscriptionPlan,
          as: 'plan',
          attributes: ['id', 'name', 'description', 'duration_months']
        }],
        where: { confirmation_status: 'confirmed' },
        required: false,
        order: [['created_at', 'DESC']],
        limit: 1
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user stats
    const stats = await Promise.all([
      Attendance.count({ where: { user_id: req.user.id } }),
      Class.count({
        where: sequelize.literal(`JSON_CONTAINS(registered_users, '"${req.user.id}"')`)
      })
    ]);

    res.json({
      success: true,
      data: {
        user: {
          ...user.toJSON(),
          stats: {
            totalCheckIns: stats[0],
            classesJoined: stats[1]
          }
        }
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message
    });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const userId = req.user.id;

    // Validation
    if (name && name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters long'
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user
    const updatedUser = await user.update({
      name: name || user.name,
      phone: phone || user.phone
    });

    // Create notification
    await NotificationService.createNotification({
      user_id: userId,
      type: 'general',
      title: 'Profile Updated',
      message: 'Your profile has been successfully updated.'
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone
        }
      }
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.id;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password, new password, and confirmation are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await user.update({
      password_hash: newPasswordHash
    });

    // Create notification
    await NotificationService.createNotification({
      user_id: userId,
      type: 'general',
      title: 'Password Changed',
      message: 'Your password has been successfully updated.'
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

// ============================================================================
// USER PREFERENCES & SETTINGS
// ============================================================================

const getUserPreferences = async (req, res) => {
  try {
    res.json({
      success: false,
      message: 'User preferences feature not implemented in current schema'
    });

  } catch (error) {
    console.error('Get user preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user preferences',
      error: error.message
    });
  }
};

const updateUserPreferences = async (req, res) => {
  try {
    res.json({
      success: false,
      message: 'User preferences feature not implemented in current schema'
    });

  } catch (error) {
    console.error('Update user preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences',
      error: error.message
    });
  }
};

// ============================================================================
// USER ACTIVITY & STATS
// ============================================================================

const getUserActivity = async (req, res) => {
  try {
    const { page = 1, limit = 20, type = 'all' } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    let activities = [];

    // Get attendance records
    if (type === 'all' || type === 'attendance') {
      const attendanceRecords = await Attendance.findAll({
        where: { user_id: userId },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['check_in_time', 'DESC']],
        attributes: ['id', 'check_in_time', 'check_out_time', 'notes', 'created_at']
      });

      const attendanceActivities = attendanceRecords.map(record => ({
        id: `attendance_${record.id}`,
        type: 'attendance',
        title: 'Gym Check-in',
        description: record.notes || 'Checked into the gym',
        timestamp: record.check_in_time,
        data: {
          checkInTime: record.check_in_time,
          checkOutTime: record.check_out_time,
          duration: record.check_out_time ? 
            Math.round((new Date(record.check_out_time) - new Date(record.check_in_time)) / (1000 * 60)) : null
        }
      }));

      activities = activities.concat(attendanceActivities);
    }

    // Get subscription activities
    if (type === 'all' || type === 'subscription') {
      const subscriptionRecords = await Subscription.findAll({
        where: { user_id: userId },
        include: [{
          model: SubscriptionPlan,
          as: 'plan',
          attributes: ['name']
        }],
        order: [['created_at', 'DESC']],
        attributes: ['id', 'confirmation_status', 'created_at', 'start_date', 'end_date']
      });

      const subscriptionActivities = subscriptionRecords.map(record => ({
        id: `subscription_${record.id}`,
        type: 'subscription',
        title: `Subscription ${record.confirmation_status}`,
        description: `${record.plan ? record.plan.name : 'Subscription'} plan`,
        timestamp: record.created_at,
        data: {
          status: record.confirmation_status,
          startDate: record.start_date,
          endDate: record.end_date
        }
      }));

      activities = activities.concat(subscriptionActivities);
    }

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit to requested amount
    const limitedActivities = activities.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        activities: limitedActivities,
        pagination: {
          currentPage: parseInt(page),
          totalItems: activities.length,
          hasMore: activities.length > parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity',
      error: error.message
    });
  }
};

const getUserStats = async (req, res) => {
  try {
    const { period = 'month' } = req.query; // 'week', 'month', 'year', 'all'
    const userId = req.user.id;

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
        startDate = null;
    }

    const whereClause = { user_id: userId };
    if (startDate) {
      whereClause.check_in_time = { [Op.gte]: startDate };
    }

    // Get attendance stats
    const attendanceRecords = await Attendance.findAll({
      where: whereClause,
      attributes: ['check_in_time', 'check_out_time']
    });

    // Calculate stats
    const totalVisits = attendanceRecords.length;
    const completedWorkouts = attendanceRecords.filter(record => record.check_out_time).length;
    
    let totalWorkoutMinutes = 0;
    attendanceRecords.forEach(record => {
      if (record.check_out_time) {
        const duration = (new Date(record.check_out_time) - new Date(record.check_in_time)) / (1000 * 60);
        totalWorkoutMinutes += duration;
      }
    });

    const averageWorkoutMinutes = completedWorkouts > 0 ? Math.round(totalWorkoutMinutes / completedWorkouts) : 0;

    // Get class participation
    const classParticipation = await Class.count({
      where: sequelize.literal(`JSON_CONTAINS(registered_users, '"${userId}"')`)
    });

    // Get streaks
    const streak = await calculateAttendanceStreak(userId);

    res.json({
      success: true,
      data: {
        period,
        stats: {
          totalVisits,
          completedWorkouts,
          totalWorkoutMinutes: Math.round(totalWorkoutMinutes),
          averageWorkoutMinutes,
          classesJoined: classParticipation,
          currentStreak: streak
        },
        dateRange: startDate ? {
          start: startDate,
          end: endDate
        } : null
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: error.message
    });
  }
};

// Helper function to calculate attendance streak
const calculateAttendanceStreak = async (userId) => {
  try {
    const records = await Attendance.findAll({
      where: { user_id: userId },
      attributes: ['check_in_time'],
      order: [['check_in_time', 'DESC']],
      limit: 30 // Check last 30 records for streak
    });

    if (records.length === 0) return 0;

    const dates = records.map(record => 
      new Date(record.check_in_time).toDateString()
    );

    // Remove duplicates (same day visits)
    const uniqueDates = [...new Set(dates)];
    
    let streak = 0;
    const today = new Date().toDateString();
    
    for (let i = 0; i < uniqueDates.length; i++) {
      const recordDate = new Date(uniqueDates[i]);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      
      if (recordDate.toDateString() === expectedDate.toDateString()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error('Calculate streak error:', error);
    return 0;
  }
};

// ============================================================================
// USER SUBSCRIPTIONS
// ============================================================================

const getUserSubscriptionHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const subscriptions = await Subscription.findAll({
      where: { user_id: userId },
      include: [
        {
          model: SubscriptionPlan,
          as: 'plan',
          attributes: ['id', 'name', 'description', 'price', 'duration_months']
        },
        {
          model: User,
          as: 'confirmedBy',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: { subscriptions }
    });

  } catch (error) {
    console.error('Get user subscription history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription history',
      error: error.message
    });
  }
};

// ============================================================================
// USER NOTIFICATIONS
// ============================================================================

const getUserNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unread_only = 'false' } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    const whereClause = { user_id: userId };
    if (unread_only === 'true') {
      whereClause.is_read = false;
    }

    const notifications = await Notification.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    const totalPages = Math.ceil(notifications.count / limit);

    res.json({
      success: true,
      data: {
        notifications: notifications.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalNotifications: notifications.count,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

// ============================================================================
// USER CLASSES & BOOKINGS
// ============================================================================

const getUserClasses = async (req, res) => {
  try {
    const { status = 'all' } = req.query;
    const userId = req.user.id;

    // Note: Current Class model doesn't have date field for scheduling
    // All classes are returned regardless of date
    const classes = await Class.findAll({
      where: {
        [Op.and]: sequelize.literal(`JSON_CONTAINS(registered_users, '"${userId}"')`)
      },
      include: [{
        model: User,
        as: 'coach',
        attributes: ['id', 'name']
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: { classes }
    });

  } catch (error) {
    console.error('Get user classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user classes',
      error: error.message
    });
  }
};

// ============================================================================
// ACCOUNT MANAGEMENT
// ============================================================================

const deleteAccount = async (req, res) => {
  try {
    const { password, confirmation } = req.body;
    const userId = req.user.id;

    if (!password || confirmation !== 'DELETE') {
      return res.status(400).json({
        success: false,
        message: 'Password and confirmation required. Type "DELETE" to confirm.'
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    // Instead of deleting, deactivate the account
    await user.update({
      status: 'suspended',
      email: `deleted_${Date.now()}_${user.email}`
    });

    res.json({
      success: true,
      message: 'Account has been deactivated successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: error.message
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  changePassword,
  getUserPreferences,
  updateUserPreferences,
  getUserActivity,
  getUserStats,
  getUserSubscriptionHistory,
  getUserNotifications,
  getUserClasses,
  deleteAccount
};