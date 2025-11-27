const { Attendance, User } = require('../models');
const { Op } = require('sequelize');
const { createNotification, sendNotificationEmail } = require('../services/emailService');

// Helper function to calculate duration in hours and minutes
const calculateDuration = (checkIn, checkOut) => {
  if (!checkOut) return null;
  const duration = new Date(checkOut) - new Date(checkIn);
  const hours = Math.floor(duration / (1000 * 60 * 60));
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes, totalMinutes: Math.floor(duration / (1000 * 60)) };
};

// Helper function to format duration
const formatDuration = (duration) => {
  if (!duration) return 'In progress';
  return `${duration.hours}h ${duration.minutes}m`;
};

// Check in user (staff only)
const checkIn = async (req, res) => {
  try {
    const { user_id, notes } = req.body;

    // Only employees and admins can check in users
    if (!['employee', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied. Only gym staff can check in users.'
      });
    }

    // Require user_id to be specified
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required for staff check-in.'
      });
    }

    // Find the target user
    const targetUser = await User.findByPk(user_id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has an active subscription
    if (!['active', 'frozen'].includes(targetUser.status)) {
      return res.status(400).json({
        success: false,
        message: 'User must have an active subscription to check in'
      });
    }

    // Check if user is already checked in
    const existingCheckIn = await Attendance.findOne({
      where: {
        user_id: user_id,
        check_out_time: null
      }
    });

    if (existingCheckIn) {
      return res.status(400).json({
        success: false,
        message: 'User is already checked in',
        data: { 
          existingCheckIn: {
            id: existingCheckIn.id,
            check_in_time: existingCheckIn.check_in_time
          }
        }
      });
    }

    // Create attendance record
    const attendance = await Attendance.create({
      user_id: user_id,
      recorded_by: req.user.id,
      notes
    });

    // Fetch attendance with user details
    const attendanceRecord = await Attendance.findByPk(attendance.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'recordedBy',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    // Send response
    res.status(201).json({
      success: true,
      message: `Check-in successful for ${targetUser.name}`,
      data: { attendance: attendanceRecord }
    });

  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Check-in failed',
      error: error.message
    });
  }
};

// Search users for attendance (staff only)
const searchUsersForAttendance = async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const searchTerm = `%${query.trim()}%`;
    
    const users = await User.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: searchTerm } },
          { email: { [Op.iLike]: searchTerm } },
          { phone: { [Op.iLike]: searchTerm } }
        ],
        role: 'user' // Only regular users can be checked in
      },
      attributes: ['id', 'name', 'email', 'phone', 'status'],
      limit: parseInt(limit),
      include: [
        {
          model: Attendance,
          as: 'attendanceRecords',
          where: { check_out_time: null },
          required: false,
          attributes: ['id', 'check_in_time']
        }
      ],
      order: [['name', 'ASC']]
    });

    // Add current attendance status to each user
    const usersWithStatus = users.map(user => {
      const isCurrentlyCheckedIn = user.attendanceRecords && user.attendanceRecords.length > 0;
      return {
        ...user.toJSON(),
        isCurrentlyCheckedIn,
        currentCheckIn: isCurrentlyCheckedIn ? user.attendanceRecords[0] : null
      };
    });

    res.json({
      success: true,
      data: {
        users: usersWithStatus,
        total: users.length,
        query: query.trim()
      }
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: error.message
    });
  }
};

// Verify QR code and get user info (staff only)
const verifyQRCode = async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: 'QR code data is required'
      });
    }

    // Parse QR data (assuming format: "USER_ID:HASH" from generateAttendanceQR)
    let userId, hash;
    try {
      const qrParts = qrData.split(':');
      if (qrParts.length !== 2) {
        throw new Error('Invalid QR format');
      }
      userId = parseInt(qrParts[0]);
      hash = qrParts[1];
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code format'
      });
    }

    // Verify the hash (basic verification - you may want to implement more complex verification)
    const crypto = require('crypto');
    const expectedHash = crypto.createHash('md5').update(`${userId}_${process.env.JWT_SECRET}`).digest('hex').substring(0, 8);
    
    if (hash !== expectedHash) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired QR code'
      });
    }

    // Get user details
    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'phone', 'status'],
      include: [
        {
          model: Attendance,
          as: 'attendanceRecords',
          where: { check_out_time: null },
          required: false,
          attributes: ['id', 'check_in_time']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found or QR code expired'
      });
    }

    if (user.role !== 'user') {
      return res.status(400).json({
        success: false,
        message: 'QR code is not valid for gym attendance'
      });
    }

    const isCurrentlyCheckedIn = user.attendanceRecords && user.attendanceRecords.length > 0;

    res.json({
      success: true,
      message: 'QR code verified successfully',
      data: {
        user: {
          ...user.toJSON(),
          isCurrentlyCheckedIn,
          currentCheckIn: isCurrentlyCheckedIn ? user.attendanceRecords[0] : null
        }
      }
    });

  } catch (error) {
    console.error('Verify QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify QR code',
      error: error.message
    });
  }
};

// Check out user (staff only)
const checkOut = async (req, res) => {
  try {
    const { user_id, notes } = req.body;

    // Only employees and admins can check out users
    if (!['employee', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied. Only gym staff can check out users.'
      });
    }

    // Require user_id to be specified
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required for staff check-out.'
      });
    }

    // Find active check-in
    const attendance = await Attendance.findOne({
      where: {
        user_id: user_id,
        check_out_time: null
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'No active check-in found for this user'
      });
    }

    // Update attendance with check-out time
    const checkOutTime = new Date();
    await attendance.update({
      check_out_time: checkOutTime,
      notes: notes ? `${attendance.notes || ''}\n[CHECK-OUT] ${notes}`.trim() : attendance.notes
    });

    // Calculate workout duration
    const duration = calculateDuration(attendance.check_in_time, checkOutTime);

    // Fetch updated attendance record
    const updatedAttendance = await Attendance.findByPk(attendance.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'recordedBy',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    // Send response
    res.json({
      success: true,
      message: `Check-out successful for ${attendance.user.name}`,
      data: { 
        attendance: updatedAttendance,
        duration: formatDuration(duration)
      }
    });

  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Check-out failed',
      error: error.message
    });
  }
};

// Get my attendance history (for authenticated user)
const getMyAttendance = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      start_date, 
      end_date,
      status = 'all' // 'all', 'completed', 'active'
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = { user_id: req.user.id };

    // Date filtering
    if (start_date || end_date) {
      whereClause.check_in_time = {};
      if (start_date) {
        whereClause.check_in_time[Op.gte] = new Date(start_date);
      }
      if (end_date) {
        whereClause.check_in_time[Op.lte] = new Date(`${end_date} 23:59:59`);
      }
    }

    // Status filtering
    if (status === 'completed') {
      whereClause.check_out_time = { [Op.not]: null };
    } else if (status === 'active') {
      whereClause.check_out_time = null;
    }

    const attendance = await Attendance.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'recordedBy',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['check_in_time', 'DESC']]
    });

    // Add duration to each record
    const attendanceWithDuration = attendance.rows.map(record => {
      const duration = calculateDuration(record.check_in_time, record.check_out_time);
      return {
        ...record.toJSON(),
        duration: formatDuration(duration),
        duration_minutes: duration?.totalMinutes || null
      };
    });

    const totalPages = Math.ceil(attendance.count / limit);

    res.json({
      success: true,
      data: {
        attendance: attendanceWithDuration,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords: attendance.count,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get my attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
      error: error.message
    });
  }
};

// Get all attendance records (admin/employee only)
const getAllAttendance = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      user_id,
      start_date, 
      end_date,
      status = 'all' // 'all', 'completed', 'active'
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};

    // User filtering
    if (user_id) {
      whereClause.user_id = user_id;
    }

    // Date filtering
    if (start_date || end_date) {
      whereClause.check_in_time = {};
      if (start_date) {
        whereClause.check_in_time[Op.gte] = new Date(start_date);
      }
      if (end_date) {
        whereClause.check_in_time[Op.lte] = new Date(`${end_date} 23:59:59`);
      }
    }

    // Status filtering
    if (status === 'completed') {
      whereClause.check_out_time = { [Op.not]: null };
    } else if (status === 'active') {
      whereClause.check_out_time = null;
    }

    const attendance = await Attendance.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: User,
          as: 'recordedBy',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['check_in_time', 'DESC']]
    });

    // Add duration to each record
    const attendanceWithDuration = attendance.rows.map(record => {
      const duration = calculateDuration(record.check_in_time, record.check_out_time);
      return {
        ...record.toJSON(),
        duration: formatDuration(duration),
        duration_minutes: duration?.totalMinutes || null
      };
    });

    const totalPages = Math.ceil(attendance.count / limit);

    res.json({
      success: true,
      data: {
        attendance: attendanceWithDuration,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords: attendance.count,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
      error: error.message
    });
  }
};

// Get attendance statistics
const getAttendanceStats = async (req, res) => {
  try {
    const { 
      user_id, 
      start_date, 
      end_date,
      period = 'month' // 'week', 'month', 'year'
    } = req.query;

    let whereClause = {};

    // User filtering (admin/employee can see any user, users can only see themselves)
    if (user_id) {
      if (user_id !== req.user.id.toString() && !['employee', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied. You can only view your own statistics.'
        });
      }
      whereClause.user_id = user_id;
    } else if (!['employee', 'admin'].includes(req.user.role)) {
      whereClause.user_id = req.user.id;
    }

    // Date filtering
    let periodStart, periodEnd;
    const now = new Date();
    
    if (start_date && end_date) {
      periodStart = new Date(start_date);
      periodEnd = new Date(`${end_date} 23:59:59`);
    } else {
      switch (period) {
        case 'week':
          periodStart = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          periodStart = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          periodStart = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          periodStart = new Date(now.setMonth(now.getMonth() - 1));
      }
      periodEnd = new Date();
    }

    whereClause.check_in_time = {
      [Op.between]: [periodStart, periodEnd]
    };

    // Get attendance records
    const attendanceRecords = await Attendance.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name']
        }
      ]
    });

    // Calculate statistics
    const totalVisits = attendanceRecords.length;
    const completedWorkouts = attendanceRecords.filter(record => record.check_out_time).length;
    const activeCheckIns = attendanceRecords.filter(record => !record.check_out_time).length;

    // Calculate total workout time
    const totalWorkoutMinutes = attendanceRecords
      .filter(record => record.check_out_time)
      .reduce((total, record) => {
        const duration = calculateDuration(record.check_in_time, record.check_out_time);
        return total + (duration?.totalMinutes || 0);
      }, 0);

    const averageWorkoutMinutes = completedWorkouts > 0 ? Math.round(totalWorkoutMinutes / completedWorkouts) : 0;

    // Group by date for daily stats
    const dailyStats = {};
    attendanceRecords.forEach(record => {
      const date = record.check_in_time.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { visits: 0, totalMinutes: 0 };
      }
      dailyStats[date].visits += 1;
      if (record.check_out_time) {
        const duration = calculateDuration(record.check_in_time, record.check_out_time);
        dailyStats[date].totalMinutes += duration?.totalMinutes || 0;
      }
    });

    res.json({
      success: true,
      data: {
        period: {
          start: periodStart,
          end: periodEnd,
          type: period
        },
        summary: {
          totalVisits,
          completedWorkouts,
          activeCheckIns,
          totalWorkoutHours: Math.round(totalWorkoutMinutes / 60 * 10) / 10,
          averageWorkoutMinutes,
          averageVisitsPerDay: Math.round(totalVisits / Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24)) * 10) / 10
        },
        dailyStats
      }
    });

  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance statistics',
      error: error.message
    });
  }
};

// Get currently checked-in users (admin/employee only)
const getCurrentlyCheckedIn = async (req, res) => {
  try {
    const activeCheckIns = await Attendance.findAll({
      where: {
        check_out_time: null
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'status']
        },
        {
          model: User,
          as: 'recordedBy',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['check_in_time', 'ASC']]
    });

    // Add duration since check-in
    const activeWithDuration = activeCheckIns.map(record => {
      const now = new Date();
      const timeSinceCheckIn = calculateDuration(record.check_in_time, now);
      return {
        ...record.toJSON(),
        timeSinceCheckIn: formatDuration(timeSinceCheckIn)
      };
    });

    res.json({
      success: true,
      data: {
        activeCheckIns: activeWithDuration,
        totalActive: activeCheckIns.length
      }
    });

  } catch (error) {
    console.error('Get currently checked-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch currently checked-in users',
      error: error.message
    });
  }
};

module.exports = {
  checkIn,
  checkOut,
  searchUsersForAttendance,
  verifyQRCode,
  getMyAttendance,
  getAllAttendance,
  getAttendanceStats,
  getCurrentlyCheckedIn
};