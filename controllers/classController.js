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
      schedule_days 
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
      schedule_days
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
      data: { class: classWithCoach }
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
      is_active 
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
    if (capacity !== undefined) updateData.capacity = capacity;
    if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
    if (schedule_time !== undefined) updateData.schedule_time = schedule_time;
    if (schedule_days !== undefined) updateData.schedule_days = schedule_days;
    if (is_active !== undefined) updateData.is_active = is_active;

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

    res.json({
      success: true,
      message: 'Class updated successfully',
      data: { class: updatedClass }
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

module.exports = {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  deleteClass,
  getMyClasses
};