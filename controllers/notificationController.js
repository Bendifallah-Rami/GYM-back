const { Notification, User } = require('../models');
const { Op } = require('sequelize');

// Get user notifications (paginated and filtered)
const getUserNotifications = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type, 
      is_read 
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = { user_id: req.user.id };

    // Filter by notification type
    if (type) {
      whereClause.type = type;
    }

    // Filter by read status
    if (is_read !== undefined) {
      whereClause.is_read = is_read === 'true';
    }

    const notifications = await Notification.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name'],
          required: false
        }
      ],
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
          totalRecords: notifications.count,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        filters: {
          type: type || 'all',
          is_read: is_read || 'all'
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fetch failed'
    });
  }
};

// Get unread notifications count
const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.count({
      where: {
        user_id: req.user.id,
        is_read: false
      }
    });

    res.json({
      success: true,
      data: {
        unread_count: unreadCount
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Count failed'
    });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.update({ is_read: true });

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { notification }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Mark failed'
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const updatedCount = await Notification.update(
      { is_read: true },
      {
        where: {
          user_id: req.user.id,
          is_read: false
        }
      }
    );

    res.json({
      success: true,
      message: `Marked ${updatedCount[0]} notifications as read`,
      data: {
        updated_count: updatedCount[0]
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Mark failed'
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.destroy();

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Delete failed'
    });
  }
};

// Get notification by ID
const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: {
        id,
        user_id: req.user.id
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Automatically mark as read when viewed
    if (!notification.is_read) {
      await notification.update({ is_read: true });
    }

    res.json({
      success: true,
      data: { notification }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fetch failed'
    });
  }
};

// ADMIN FUNCTIONS

// Get all notifications (admin only)
const getAllNotifications = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type, 
      user_id,
      is_read 
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};

    // Filter by notification type
    if (type) {
      whereClause.type = type;
    }

    // Filter by user
    if (user_id) {
      whereClause.user_id = user_id;
    }

    // Filter by read status
    if (is_read !== undefined) {
      whereClause.is_read = is_read === 'true';
    }

    const notifications = await Notification.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
          required: true
        }
      ],
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
          totalRecords: notifications.count,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        filters: {
          type: type || 'all',
          user_id: user_id || 'all',
          is_read: is_read || 'all'
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fetch failed'
    });
  }
};

// Create system notification (admin only)
const createSystemNotification = async (req, res) => {
  try {
    const { 
      user_id, 
      user_ids, 
      title, 
      message, 
      type = 'general',
      send_to_all = false
    } = req.body;

    let targetUserIds = [];

    if (send_to_all) {
      // Send to all active users
      const users = await User.findAll({
        where: { status: 'active' },
        attributes: ['id']
      });
      targetUserIds = users.map(user => user.id);
    } else if (user_ids && Array.isArray(user_ids)) {
      // Send to specific users
      targetUserIds = user_ids;
    } else if (user_id) {
      // Send to single user
      targetUserIds = [user_id];
    } else {
      return res.status(400).json({
        success: false,
        message: 'Must specify user_id, user_ids array, or send_to_all'
      });
    }

    // Create notifications for all target users
    const notifications = await Promise.all(
      targetUserIds.map(userId => 
        Notification.create({
          user_id: userId,
          title,
          message,
          type
        })
      )
    );

    res.status(201).json({
      success: true,
      message: `System notification sent to ${notifications.length} users`,
      data: {
        notifications_sent: notifications.length,
        target_users: targetUserIds
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Create failed'
    });
  }
};

// Get notification statistics (admin only)
const getNotificationStats = async (req, res) => {
  try {
    const totalNotifications = await Notification.count();
    const unreadNotifications = await Notification.count({
      where: { is_read: false }
    });

    // Notifications by type
    const notificationsByType = await Notification.findAll({
      attributes: [
        'type',
        [require('sequelize').fn('COUNT', '*'), 'count']
      ],
      group: ['type']
    });

    // Recent notifications (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentNotifications = await Notification.count({
      where: {
        created_at: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });

    res.json({
      success: true,
      data: {
        total_notifications: totalNotifications,
        unread_notifications: unreadNotifications,
        read_notifications: totalNotifications - unreadNotifications,
        recent_notifications_7_days: recentNotifications,
        notifications_by_type: notificationsByType.map(item => ({
          type: item.type,
          count: parseInt(item.dataValues.count)
        }))
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Stats failed'
    });
  }
};

module.exports = {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationById,
  getAllNotifications,
  createSystemNotification,
  getNotificationStats
};