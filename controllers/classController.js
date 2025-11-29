const { Class, User } = require('../models');
const { Op } = require('sequelize');
const { createNotification, sendNotificationEmail } = require('../services/emailService');

// Create new class (admin/coach only)
const createClass = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      coach_id, 
      capacity, 
      duration_minutes, 
      schedule_time, 
      schedule_days,
      price = 0.00
    } = req.body;

    // Verify coach exists if coach_id is provided
    if (coach_id) {
      const coach = await User.findOne({ 
        where: { 
          id: coach_id, 
          role: ['coach', 'admin'] 
        } 
      });
      
      if (!coach) {
        return res.status(400).json({
          success: false,
          message: 'Coach not found or invalid role'
        });
      }
    }

    const newClass = await Class.create({
      name,
      description,
      coach_id,
      capacity,
      duration_minutes,
      schedule_time,
      schedule_days,
      price,
      registered_users: [],
      status: 'available'
    });

    const classWithCoach = await Class.findByPk(newClass.id, {
      include: [
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: { 
        class: {
          ...classWithCoach.toJSON(),
          available_spots: classWithCoach.capacity,
          registered_count: 0
        }
      }
    });

  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create class',
      error: error.message
    });
  }
};

// Get all classes
const getAllClasses = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      is_active, 
      coach_id,
      search 
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};

    // Filter by active status
    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    // Filter by coach
    if (coach_id) {
      whereClause.coach_id = coach_id;
    }

    // Search by name or description
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const classes = await Class.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });

    const totalPages = Math.ceil(classes.count / limit);

    res.json({
      success: true,
      data: {
        classes: classes.rows.map(cls => {
          const registeredUsers = cls.registered_users || [];
          return {
            ...cls.toJSON(),
            available_spots: cls.capacity - registeredUsers.length,
            registered_count: registeredUsers.length
          };
        }),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords: classes.count,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch classes',
      error: error.message
    });
  }
};

// Get class by ID
const getClassById = async (req, res) => {
  try {
    const { id } = req.params;

    const classData = await Class.findByPk(id, {
      include: [
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'name', 'email', 'phone'],
          required: false
        }
      ]
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    res.json({
      success: true,
      data: { class: classData }
    });

  } catch (error) {
    console.error('Get class by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class',
      error: error.message
    });
  }
};

// Update class (admin/coach only)
const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      coach_id, 
      capacity, 
      duration_minutes, 
      schedule_time, 
      schedule_days,
      is_active,
      price,
      status
    } = req.body;

    const classData = await Class.findByPk(id);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Check permissions: admin can edit all, coaches can only edit their own classes
    if (req.user.role === 'coach' && classData.coach_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own classes'
      });
    }

    // Verify coach exists if coach_id is being updated
    if (coach_id && coach_id !== classData.coach_id) {
      const coach = await User.findOne({ 
        where: { 
          id: coach_id, 
          role: ['coach', 'admin'] 
        } 
      });
      
      if (!coach) {
        return res.status(400).json({
          success: false,
          message: 'Coach not found or invalid role'
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (coach_id !== undefined) updateData.coach_id = coach_id;
    if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
    if (schedule_time !== undefined) updateData.schedule_time = schedule_time;
    if (schedule_days !== undefined) updateData.schedule_days = schedule_days;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (price !== undefined) updateData.price = price;
    if (status !== undefined) updateData.status = status;

    // Handle capacity updates - check if new capacity affects status
    if (capacity !== undefined) {
      updateData.capacity = capacity;
      const registeredUsers = classData.registered_users || [];
      
      if (capacity < registeredUsers.length) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce capacity below current registrations (${registeredUsers.length})`
        });
      }
      
      // Update status based on new capacity
      if (registeredUsers.length >= capacity) {
        updateData.status = 'full';
      } else if (classData.status === 'full' && registeredUsers.length < capacity) {
        updateData.status = 'available';
      }
    }

    await classData.update(updateData);

    const updatedClass = await Class.findByPk(id, {
      include: [
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    });

    const registeredUsers = updatedClass.registered_users || [];

    res.json({
      success: true,
      message: 'Class updated successfully',
      data: { 
        class: {
          ...updatedClass.toJSON(),
          available_spots: updatedClass.capacity - registeredUsers.length,
          registered_count: registeredUsers.length
        }
      }
    });

  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update class',
      error: error.message
    });
  }
};

// Delete class (admin only)
const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;

    const classData = await Class.findByPk(id);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    await classData.destroy();

    res.json({
      success: true,
      message: 'Class deleted successfully'
    });

  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete class',
      error: error.message
    });
  }
};

// Get classes by coach (for coaches to see their classes)
const getMyClasses = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      is_active 
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = { coach_id: req.user.id };

    // Filter by active status
    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    const classes = await Class.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });

    const totalPages = Math.ceil(classes.count / limit);

    res.json({
      success: true,
      data: {
        classes: classes.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords: classes.count,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get my classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your classes',
      error: error.message
    });
  }
};

// Join/Book a class (user action)
const joinClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { booking_date, notes } = req.body;

    // Check if class exists and is active
    const classData = await Class.findByPk(id, {
      include: [
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    if (!classData.is_active) {
      return res.status(400).json({
        success: false,
        message: 'This class is currently inactive'
      });
    }

    if (classData.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This class has been cancelled'
      });
    }

    if (classData.status === 'full') {
      return res.status(400).json({
        success: false,
        message: 'This class is full'
      });
    }

    // Check if user has active subscription
    if (!['active', 'frozen'].includes(req.user.status)) {
      return res.status(400).json({
        success: false,
        message: 'You need an active subscription to join classes'
      });
    }

    // Initialize registered_users if null
    const registeredUsers = classData.registered_users || [];

    // Check if user is already registered
    const isAlreadyRegistered = registeredUsers.some(user => user.id === req.user.id);
    if (isAlreadyRegistered) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this class'
      });
    }

    // Check capacity
    if (registeredUsers.length >= classData.capacity) {
      // Update status to full
      await classData.update({ status: 'full' });
      return res.status(400).json({
        success: false,
        message: 'This class has reached its capacity'
      });
    }

    // Add user to registered_users
    const userInfo = {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      registered_at: new Date(),
      booking_date: booking_date || new Date().toISOString().split('T')[0],
      notes: notes || null
    };

    const updatedRegisteredUsers = [...registeredUsers, userInfo];

    // Update class status if it becomes full
    let newStatus = classData.status;
    if (updatedRegisteredUsers.length >= classData.capacity) {
      newStatus = 'full';
    }

    await classData.update({
      registered_users: updatedRegisteredUsers,
      status: newStatus
    });

    res.json({
      success: true,
      message: `Successfully joined ${classData.name} class`,
      data: {
        class: {
          ...classData.toJSON(),
          registered_users: updatedRegisteredUsers,
          status: newStatus
        },
        participant: userInfo,
        available_spots: classData.capacity - updatedRegisteredUsers.length
      }
    });

  } catch (error) {
    console.error('Join class error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join class',
      error: error.message
    });
  }
};

// Leave/Cancel class booking (user action)
const leaveClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const classData = await Class.findByPk(id);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Initialize registered_users if null
    const registeredUsers = classData.registered_users || [];

    // Check if user is registered
    const userIndex = registeredUsers.findIndex(user => user.id === req.user.id);
    if (userIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'You are not registered for this class'
      });
    }

    // Remove user from registered_users
    const updatedRegisteredUsers = registeredUsers.filter(user => user.id !== req.user.id);

    // Update class status if it's no longer full
    let newStatus = classData.status;
    if (classData.status === 'full' && updatedRegisteredUsers.length < classData.capacity) {
      newStatus = 'available';
    }

    await classData.update({
      registered_users: updatedRegisteredUsers,
      status: newStatus
    });

    res.json({
      success: true,
      message: `Successfully cancelled booking for ${classData.name}`,
      data: {
        class: {
          ...classData.toJSON(),
          registered_users: updatedRegisteredUsers,
          status: newStatus
        },
        cancelled_by: {
          id: req.user.id,
          name: req.user.name
        },
        cancellation_reason: reason,
        cancelled_at: new Date(),
        available_spots: classData.capacity - updatedRegisteredUsers.length
      }
    });

  } catch (error) {
    console.error('Leave class error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel class booking',
      error: error.message
    });
  }
};

// Get my joined classes (user's available classes)
const getMyJoinedClasses = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      filter = 'all' // 'all', 'joined', 'available'
    } = req.query;
    
    const whereClause = { is_active: true };
    
    const classes = await Class.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['name', 'ASC']]
    });

    let filteredClasses = classes.map(cls => {
      const registeredUsers = cls.registered_users || [];
      const isUserRegistered = registeredUsers.some(user => user.id === req.user.id);
      const availableSpots = cls.capacity - registeredUsers.length;
      
      return {
        ...cls.toJSON(),
        is_user_registered: isUserRegistered,
        available_spots: availableSpots,
        registered_count: registeredUsers.length,
        can_join: !isUserRegistered && cls.status === 'available' && req.user.status === 'active' && availableSpots > 0,
        user_subscription_status: req.user.status
      };
    });

    // Apply filter
    if (filter === 'joined') {
      filteredClasses = filteredClasses.filter(cls => cls.is_user_registered);
    } else if (filter === 'available') {
      filteredClasses = filteredClasses.filter(cls => !cls.is_user_registered && cls.can_join);
    }

    res.json({
      success: true,
      message: filter === 'joined' ? 'Your registered classes' : 
               filter === 'available' ? 'Available classes for you to join' : 
               'All classes',
      data: {
        classes: filteredClasses,
        pagination: {
          currentPage: parseInt(page),
          totalRecords: filteredClasses.length
        },
        filter_applied: filter
      }
    });

  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch classes',
      error: error.message
    });
  }
};

// Get class participants (coach/admin only)
const getClassParticipants = async (req, res) => {
  try {
    const { id } = req.params;

    const classData = await Class.findByPk(id, {
      include: [
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Check permissions: admin can see all, coaches can only see their own classes
    if (req.user.role === 'coach' && classData.coach_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only view participants of your own classes'
      });
    }

    const registeredUsers = classData.registered_users || [];

    res.json({
      success: true,
      data: {
        class: {
          id: classData.id,
          name: classData.name,
          capacity: classData.capacity,
          status: classData.status,
          coach: classData.coach
        },
        participants: registeredUsers.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          registered_at: user.registered_at,
          booking_date: user.booking_date,
          notes: user.notes
        })),
        summary: {
          total_registered: registeredUsers.length,
          available_spots: classData.capacity - registeredUsers.length,
          status: classData.status
        }
      }
    });

  } catch (error) {
    console.error('Get class participants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class participants',
      error: error.message
    });
  }
};

module.exports = {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  deleteClass,
  getMyClasses,
  joinClass,
  leaveClass,
  getMyJoinedClasses,
  getClassParticipants
};