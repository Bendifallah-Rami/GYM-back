const { SubscriptionPlan, Subscription } = require('../models');
const { Op } = require('sequelize');

// Get all subscription plans (public access for users to view available plans)
const getSubscriptionPlans = async (req, res) => {
  try {
    const { active_only = 'false', include_features = 'true' } = req.query;

    // Build where clause
    const whereClause = {};
    if (active_only === 'true') {
      whereClause.is_active = true;
    }

    const plans = await SubscriptionPlan.findAll({
      where: whereClause,
      attributes: include_features === 'false' 
        ? { exclude: ['features'] }
        : undefined,
      order: [['price', 'ASC'], ['duration_months', 'ASC']],
      include: req.user && (req.user.role === 'admin' || req.user.role === 'employee') 
        ? [{
            model: Subscription,
            as: 'subscriptions',
            attributes: ['id', 'user_id', 'confirmation_status', 'payment_status'],
            required: false
          }]
        : []
    });

    res.json({
      success: true,
      data: { plans }
    });

  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans',
      error: error.message
    });
  }
};

// Get subscription plan by ID
const getSubscriptionPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid plan ID is required'
      });
    }

    const plan = await SubscriptionPlan.findByPk(id, {
      include: req.user && (req.user.role === 'admin' || req.user.role === 'employee')
        ? [{
            model: Subscription,
            as: 'subscriptions',
            attributes: ['id', 'user_id', 'confirmation_status', 'payment_status'],
            required: false
          }]
        : []
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    // If user is not admin/employee, only show active plans or hide inactive ones
    if ((!req.user || (req.user.role !== 'admin' && req.user.role !== 'employee')) && !plan.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    res.json({
      success: true,
      data: { plan }
    });

  } catch (error) {
    console.error('Get subscription plan by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plan',
      error: error.message
    });
  }
};

// Create subscription plan (admin only)
const createSubscriptionPlan = async (req, res) => {
  try {
    const { name, description, duration_months, price, features, is_active = true } = req.body;

    // Validation
    if (!name || !duration_months || !price) {
      return res.status(400).json({
        success: false,
        message: 'Name, duration_months, and price are required'
      });
    }

    if (duration_months < 1 || duration_months > 120) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be between 1 and 120 months'
      });
    }

    if (price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be 0 or greater'
      });
    }

    // Check if plan name already exists
    const existingPlan = await SubscriptionPlan.findOne({ where: { name } });
    if (existingPlan) {
      return res.status(400).json({
        success: false,
        message: 'Subscription plan with this name already exists'
      });
    }

    const plan = await SubscriptionPlan.create({
      name,
      description,
      duration_months: parseInt(duration_months),
      price: parseFloat(price),
      features: Array.isArray(features) ? features : [],
      is_active: Boolean(is_active)
    });

    res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully',
      data: { plan }
    });

  } catch (error) {
    console.error('Create subscription plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription plan',
      error: error.message
    });
  }
};

// Update subscription plan (admin only)
const updateSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, duration_months, price, features, is_active } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid plan ID is required'
      });
    }

    const plan = await SubscriptionPlan.findByPk(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    // Validate updated values
    if (duration_months && (duration_months < 1 || duration_months > 120)) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be between 1 and 120 months'
      });
    }

    if (price !== undefined && price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be 0 or greater'
      });
    }

    // Check if new name conflicts with existing plans
    if (name && name !== plan.name) {
      const existingPlan = await SubscriptionPlan.findOne({ where: { name } });
      if (existingPlan) {
        return res.status(400).json({
          success: false,
          message: 'Subscription plan with this name already exists'
        });
      }
    }

    // Update plan
    const updatedPlan = await plan.update({
      name: name || plan.name,
      description: description !== undefined ? description : plan.description,
      duration_months: duration_months ? parseInt(duration_months) : plan.duration_months,
      price: price !== undefined ? parseFloat(price) : plan.price,
      features: features !== undefined ? (Array.isArray(features) ? features : []) : plan.features,
      is_active: is_active !== undefined ? Boolean(is_active) : plan.is_active
    });

    res.json({
      success: true,
      message: 'Subscription plan updated successfully',
      data: { plan: updatedPlan }
    });

  } catch (error) {
    console.error('Update subscription plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription plan',
      error: error.message
    });
  }
};

// Delete subscription plan (admin only)
const deleteSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid plan ID is required'
      });
    }

    const plan = await SubscriptionPlan.findByPk(id, {
      include: [{
        model: Subscription,
        as: 'subscriptions',
        required: false
      }]
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    // Check if plan has active subscriptions
    if (plan.subscriptions && plan.subscriptions.length > 0) {
      const activeSubscriptions = plan.subscriptions.filter(sub => 
        sub.confirmation_status === 'confirmed' || sub.confirmation_status === 'pending'
      );

      if (activeSubscriptions.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete plan with ${activeSubscriptions.length} active subscription(s). Deactivate the plan instead.`,
          data: {
            activeSubscriptions: activeSubscriptions.length,
            totalSubscriptions: plan.subscriptions.length
          }
        });
      }
    }

    await plan.destroy();

    res.json({
      success: true,
      message: 'Subscription plan deleted successfully'
    });

  } catch (error) {
    console.error('Delete subscription plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete subscription plan',
      error: error.message
    });
  }
};

// Toggle plan activation status (admin only)
const togglePlanStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid plan ID is required'
      });
    }

    const plan = await SubscriptionPlan.findByPk(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    const updatedPlan = await plan.update({
      is_active: !plan.is_active
    });

    res.json({
      success: true,
      message: `Subscription plan ${updatedPlan.is_active ? 'activated' : 'deactivated'} successfully`,
      data: { plan: updatedPlan }
    });

  } catch (error) {
    console.error('Toggle plan status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle plan status',
      error: error.message
    });
  }
};

module.exports = {
  getSubscriptionPlans,
  getSubscriptionPlanById,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  togglePlanStatus
};