const { CoachAssignment, User } = require('../models');
const { Op } = require('sequelize');
const NotificationService = require('../services/notificationService');

// Create new coach assignment (admin only)
const createCoachAssignment = async (req, res) => {
  try {
    const { 
      coach_id, 
      user_id, 
      assigned_date, 
      notes 
    } = req.body;

    // Verify coach exists and has coach role
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

    // Verify user exists
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if assignment already exists and is active
    const existingAssignment = await CoachAssignment.findOne({
      where: {
        coach_id,
        user_id,
        is_active: true
      }
    });

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: 'Active assignment already exists between this coach and user'
      });
    }

    const assignment = await CoachAssignment.create({
      coach_id,
      user_id,
      assigned_date: assigned_date || new Date(),
      notes
    });

    const assignmentWithDetails = await CoachAssignment.findByPk(assignment.id, {
      include: [
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'status']
        }
      ]
    });

    // Create notifications for both coach and user
    try {
      // Notify the user about the new coach assignment
      await NotificationService.createCoachAssignmentNotification(
        user_id,
        'assigned',
        {
          coachName: coach.name,
          assignedDate: new Date(assigned_date || new Date()).toLocaleDateString()
        }
      );

      // Notify the coach about the new client assignment
      await NotificationService.createCoachAssignmentNotification(
        coach_id,
        'new_client',
        {
          clientName: user.name,
          assignedDate: new Date(assigned_date || new Date()).toLocaleDateString()
        }
      );
    } catch (notificationError) {
      console.error('Failed to create coach assignment notifications:', notificationError);
      // Don't fail the main operation if notification fails
    }

    res.status(201).json({
      success: true,
      message: 'Coach assignment created successfully',
      data: { assignment: assignmentWithDetails }
    });

  } catch (error) {
    console.error('Create coach assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create coach assignment',
      error: error.message
    });
  }
};

// Get all coach assignments
const getAllCoachAssignments = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      is_active, 
      coach_id,
      user_id 
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

    // Filter by user
    if (user_id) {
      whereClause.user_id = user_id;
    }

    const assignments = await CoachAssignment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'status']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['assigned_date', 'DESC']]
    });

    const totalPages = Math.ceil(assignments.count / limit);

    res.json({
      success: true,
      data: {
        assignments: assignments.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords: assignments.count,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all coach assignments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coach assignments',
      error: error.message
    });
  }
};

// Get coach assignment by ID
const getCoachAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await CoachAssignment.findByPk(id, {
      include: [
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'status']
        }
      ]
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Coach assignment not found'
      });
    }

    res.json({
      success: true,
      data: { assignment }
    });

  } catch (error) {
    console.error('Get coach assignment by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coach assignment',
      error: error.message
    });
  }
};

// Update coach assignment
const updateCoachAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      coach_id, 
      user_id, 
      assigned_date, 
      is_active, 
      notes 
    } = req.body;

    const assignment = await CoachAssignment.findByPk(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Coach assignment not found'
      });
    }

    // Verify new coach if changing
    if (coach_id && coach_id !== assignment.coach_id) {
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

    // Verify new user if changing
    if (user_id && user_id !== assignment.user_id) {
      const user = await User.findByPk(user_id);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'User not found'
        });
      }
    }

    const updateData = {};
    if (coach_id !== undefined) updateData.coach_id = coach_id;
    if (user_id !== undefined) updateData.user_id = user_id;
    if (assigned_date !== undefined) updateData.assigned_date = assigned_date;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (notes !== undefined) updateData.notes = notes;

    await assignment.update(updateData);

    // Create notifications for significant changes
    try {
      // If coach changed
      if (coach_id && coach_id !== assignment.coach_id) {
        // Get the new coach and user info for notifications
        const newCoach = await User.findByPk(coach_id, { attributes: ['id', 'name'] });
        const user = await User.findByPk(assignment.user_id, { attributes: ['id', 'name'] });
        
        if (newCoach && user) {
          // Notify user about coach change
          await NotificationService.createCoachAssignmentNotification(
            assignment.user_id,
            'coach_changed',
            {
              newCoachName: newCoach.name
            }
          );

          // Notify new coach about client
          await NotificationService.createCoachAssignmentNotification(
            coach_id,
            'new_client',
            {
              clientName: user.name,
              assignedDate: new Date().toLocaleDateString()
            }
          );
        }
      }

      // If assignment was deactivated
      if (is_active === false && assignment.is_active === true) {
        const coach = await User.findByPk(assignment.coach_id, { attributes: ['id', 'name'] });
        const user = await User.findByPk(assignment.user_id, { attributes: ['id', 'name'] });
        
        if (coach && user) {
          // Notify user about assignment ending
          await NotificationService.createCoachAssignmentNotification(
            assignment.user_id,
            'unassigned',
            {
              coachName: coach.name
            }
          );
        }
      }
    } catch (notificationError) {
      console.error('Failed to create update notifications:', notificationError);
      // Don't fail the main operation if notification fails
    }

    const updatedAssignment = await CoachAssignment.findByPk(id, {
      include: [
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'status']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Coach assignment updated successfully',
      data: { assignment: updatedAssignment }
    });

  } catch (error) {
    console.error('Update coach assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update coach assignment',
      error: error.message
    });
  }
};

// Delete coach assignment
const deleteCoachAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await CoachAssignment.findByPk(id, {
      include: [
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Coach assignment not found'
      });
    }

    // Create notifications before deleting
    try {
      if (assignment.coach && assignment.user) {
        // Notify user about assignment deletion
        await NotificationService.createCoachAssignmentNotification(
          assignment.user_id,
          'unassigned',
          {
            coachName: assignment.coach.name
          }
        );
      }
    } catch (notificationError) {
      console.error('Failed to create deletion notification:', notificationError);
      // Don't fail the main operation if notification fails
    }

    await assignment.destroy();

    res.json({
      success: true,
      message: 'Coach assignment deleted successfully'
    });

  } catch (error) {
    console.error('Delete coach assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete coach assignment',
      error: error.message
    });
  }
};

// Get my assigned users (for coaches to see their clients)
const getMyAssignedUsers = async (req, res) => {
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

    const assignments = await CoachAssignment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'status', 'phone']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['assigned_date', 'DESC']]
    });

    const totalPages = Math.ceil(assignments.count / limit);

    res.json({
      success: true,
      data: {
        assigned_users: assignments.rows.map(assignment => ({
          assignment_id: assignment.id,
          assigned_date: assignment.assigned_date,
          is_active: assignment.is_active,
          notes: assignment.notes,
          user: assignment.user
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords: assignments.count,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get my assigned users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned users',
      error: error.message
    });
  }
};

// Get my coach (for users to see their assigned coach)
const getMyCoach = async (req, res) => {
  try {
    const assignment = await CoachAssignment.findOne({
      where: {
        user_id: req.user.id,
        is_active: true
      },
      include: [
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ],
      order: [['assigned_date', 'DESC']]
    });

    if (!assignment) {
      return res.json({
        success: true,
        message: 'No coach assigned',
        data: { assignment: null }
      });
    }

    res.json({
      success: true,
      data: {
        assignment: {
          id: assignment.id,
          assigned_date: assignment.assigned_date,
          notes: assignment.notes,
          coach: assignment.coach
        }
      }
    });

  } catch (error) {
    console.error('Get my coach error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned coach',
      error: error.message
    });
  }
};

module.exports = {
  createCoachAssignment,
  getAllCoachAssignments,
  getCoachAssignmentById,
  updateCoachAssignment,
  deleteCoachAssignment,
  getMyAssignedUsers,
  getMyCoach
};