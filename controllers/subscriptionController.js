const { Subscription, SubscriptionPlan, User, SubscriptionAudit } = require('../models');
const { Op } = require('sequelize');
const { createNotification, sendNotificationEmail, sendEmployeeNotification, sendMembershipWithQREmail } = require('../services/emailService');
const { generateSubscriptionQR, generateMembershipCardHTML } = require('../services/qrCodeService');

// Helper function to create audit trail
const createAuditTrail = async (subscriptionId, action, performedBy, oldStatus = null, newStatus = null, notes = null) => {
  try {
    await SubscriptionAudit.create({
      subscription_id: subscriptionId,
      action,
      performed_by: performedBy,
      old_status: oldStatus,
      new_status: newStatus,
      notes
    });
  } catch (error) {
    console.error('Audit trail creation failed:', error);
  }
};

// Get user's subscriptions (for authenticated user)
const getMySubscriptions = async (req, res) => {
  try {
    const { include_expired = 'false' } = req.query;
    
    const whereClause = { user_id: req.user.id };
    
    if (include_expired === 'false') {
      whereClause.confirmation_status = { [Op.ne]: 'rejected' };
    }

    const subscriptions = await Subscription.findAll({
      where: whereClause,
      include: [
        {
          model: SubscriptionPlan,
          as: 'plan',
          attributes: ['id', 'name', 'description', 'duration_months', 'features']
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
    console.error('Get my subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions',
      error: error.message
    });
  }
};

// Get all subscriptions (admin/employee only)
const getAllSubscriptions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      confirmation_status, 
      payment_status, 
      user_id 
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};

    if (status) whereClause.status = status;
    if (confirmation_status) whereClause.confirmation_status = confirmation_status;
    if (payment_status) whereClause.payment_status = payment_status;
    if (user_id) whereClause.user_id = user_id;

    const subscriptions = await Subscription.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: SubscriptionPlan,
          as: 'plan',
          attributes: ['id', 'name', 'description', 'duration_months', 'price']
        },
        {
          model: User,
          as: 'confirmedBy',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    const totalPages = Math.ceil(subscriptions.count / limit);

    res.json({
      success: true,
      data: {
        subscriptions: subscriptions.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalSubscriptions: subscriptions.count,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions',
      error: error.message
    });
  }
};

// Get subscription by ID (admin/employee only)
const getSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'role']
        },
        {
          model: SubscriptionPlan,
          as: 'plan'
        },
        {
          model: User,
          as: 'confirmedBy',
          attributes: ['id', 'name', 'role'],
          required: false
        },
        {
          model: SubscriptionAudit,
          as: 'audits',
          include: [{
            model: User,
            as: 'performedBy',
            attributes: ['id', 'name', 'role']
          }],
          order: [['created_at', 'DESC']]
        }
      ]
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    res.json({
      success: true,
      data: { subscription }
    });

  } catch (error) {
    console.error('Get subscription by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription',
      error: error.message
    });
  }
};

// Create new subscription (user chooses a plan)
const createSubscription = async (req, res) => {
  try {
    const { plan_id, payment_method, notes } = req.body;

    // Check if plan exists and is active
    const plan = await SubscriptionPlan.findByPk(plan_id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    if (!plan.is_active) {
      return res.status(400).json({
        success: false,
        message: 'This subscription plan is no longer available'
      });
    }

    // Check if user already has an active subscription
    const existingSubscription = await Subscription.findOne({
      where: {
        user_id: req.user.id,
        confirmation_status: { [Op.in]: ['pending', 'confirmed'] }
      }
    });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active or pending subscription',
        data: { existingSubscription: existingSubscription.id }
      });
    }

    // Create subscription
    const subscription = await Subscription.create({
      user_id: req.user.id,
      plan_id,
      payment_method,
      amount: plan.price,
      notes,
      payment_status: 'pending',
      confirmation_status: 'pending'
    });

    // Update user status to pending_subscription
    await req.user.update({ status: 'pending_subscription' });

    // Create audit trail
    await createAuditTrail(
      subscription.id,
      'created',
      req.user.id,
      null,
      'pending',
      `User selected ${plan.name} plan`
    );

    // Fetch the created subscription with plan details
    const createdSubscription = await Subscription.findByPk(subscription.id, {
      include: [{
        model: SubscriptionPlan,
        as: 'plan',
        attributes: ['id', 'name', 'description', 'duration_months']
      }]
    });

    // Send response first for fast API response
    res.status(201).json({
      success: true,
      message: 'Subscription request created successfully. Awaiting employee confirmation.',
      data: { subscription: createdSubscription }
    });

    // Send notifications asynchronously after response
    setImmediate(async () => {
      // Notify user
      try {
        await sendNotificationEmail(
          req.user.id,
          req.user.email,
          req.user.name,
          'Subscription Request Submitted',
          `Your subscription request for <strong>${plan.name}</strong> has been submitted and is pending approval. We will notify you once an employee reviews your request.`,
          'subscription'
        );
      } catch (notificationError) {
        console.error('User notification failed:', notificationError);
      }

      // Notify employees
      try {
        const employees = await User.findAll({
          where: {
            role: { [Op.in]: ['employee', 'admin'] },
            status: 'active'
          },
          attributes: ['email', 'name']
        });
        
        const employeeEmails = employees.map(emp => emp.email);
        
        if (employeeEmails.length > 0) {
          const employeeMessage = `
            <p><strong>New Subscription Request Received!</strong></p>
            <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 15px 0;">
              <h4 style="color: #1976d2; margin: 0 0 10px 0;">📋 Request Details:</h4>
              <ul style="margin: 0; color: #1976d2;">
                <li><strong>User:</strong> ${req.user.name} (${req.user.email})</li>
                <li><strong>Plan:</strong> ${plan.name}</li>
                <li><strong>Price:</strong> $${plan.price}</li>
                <li><strong>Payment Method:</strong> ${payment_method}</li>
                <li><strong>Request ID:</strong> #${subscription.id}</li>
              </ul>
            </div>
            <p>Please review and confirm this subscription request in the admin panel.</p>
          `;
          
          await sendEmployeeNotification(
            employeeEmails,
            'New Subscription Request',
            employeeMessage,
            'subscription_request'
          );
        }
      } catch (employeeNotificationError) {
        console.error('Employee notification failed:', employeeNotificationError);
      }
    });

  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription',
      error: error.message
    });
  }
};

// Confirm subscription (employee/admin only)
const confirmSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status = 'paid', start_date, notes } = req.body;

    const subscription = await Subscription.findByPk(id, {
      include: [
        { model: User, as: 'user' },
        { model: SubscriptionPlan, as: 'plan' }
      ]
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (subscription.confirmation_status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot confirm subscription with status: ${subscription.confirmation_status}`
      });
    }

    // Calculate dates
    const startDate = start_date ? new Date(start_date) : new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + subscription.plan.duration_months);

    // Update subscription
    const oldStatus = subscription.confirmation_status;
    await subscription.update({
      confirmation_status: 'confirmed',
      payment_status,
      confirmed_by: req.user.id,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      notes: notes ? `${subscription.notes || ''}\n[CONFIRMED] ${notes}`.trim() : subscription.notes
    });

    // Update user status to active
    await subscription.user.update({ status: 'active' });

    // Create audit trail
    await createAuditTrail(
      subscription.id,
      'confirmed',
      req.user.id,
      oldStatus,
      'confirmed',
      notes || 'Subscription confirmed by employee'
    );

    // Send response first for fast API response
    res.json({
      success: true,
      message: 'Subscription confirmed successfully',
      data: { subscription }
    });

    // Send notifications and generate QR code asynchronously after response
    setImmediate(async () => {
      try {
        // Generate attendance QR code for the user
        const qrCodeBuffer = await generateAttendanceQR(subscription.user_id);
        
        // Send membership confirmation email with attendance QR code
        await sendMembershipWithQREmail(
          subscription.user_id,
          subscription.user.email,
          subscription.user.name,
          qrCodeBuffer,
          {
            subscription: subscription,
            plan: subscription.plan
          }
        );

        console.log(`✅ Attendance QR code sent to ${subscription.user.email}`);
      } catch (error) {
        console.error('❌ QR Code generation and email failed:', error);
        
        // Fallback: Send notification without QR code
        const confirmationMessage = `
          <p>Great news! Your <strong>${subscription.plan.name}</strong> subscription has been confirmed and is now active.</p>
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; padding: 15px; margin: 15px 0;">
            <h4 style="color: #155724; margin: 0 0 10px 0;">📋 Subscription Details:</h4>
            <ul style="margin: 0; color: #155724;">
              <li><strong>Plan:</strong> ${subscription.plan.name}</li>
              <li><strong>Start Date:</strong> ${subscription.start_date ? new Date(subscription.start_date).toDateString() : 'N/A'}</li>
              <li><strong>End Date:</strong> ${subscription.end_date ? new Date(subscription.end_date).toDateString() : 'N/A'}</li>
              <li><strong>Payment Status:</strong> ${subscription.payment_status}</li>
              <li><strong>Confirmed By:</strong> ${req.user.name}</li>
            </ul>
          </div>
          <p>You can now enjoy all the benefits of your membership. Welcome to our gym family! 🏋️‍♂️</p>
          <p style="color: #856404;"><em>Note: Your gym access QR code will be sent separately.</em></p>
        `;
        
        await sendNotificationEmail(
          subscription.user_id,
          subscription.user.email,
          subscription.user.name,
          '✅ Subscription Confirmed!',
          confirmationMessage,
          'subscription'
        );
      }
    });

  } catch (error) {
    console.error('Confirm subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm subscription',
      error: error.message
    });
  }
};

// Reject subscription (employee/admin only)
const rejectSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const subscription = await Subscription.findByPk(id, {
      include: [
        { model: User, as: 'user' },
        { model: SubscriptionPlan, as: 'plan' }
      ]
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (subscription.confirmation_status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject subscription with status: ${subscription.confirmation_status}`
      });
    }

    const oldStatus = subscription.confirmation_status;
    await subscription.update({
      confirmation_status: 'rejected',
      confirmed_by: req.user.id,
      notes: reason ? `${subscription.notes || ''}\n[REJECTED] ${reason}`.trim() : subscription.notes
    });

    // Update user status back to pending_subscription (they can try again)
    await subscription.user.update({ status: 'pending_subscription' });

    // Create audit trail
    await createAuditTrail(
      subscription.id,
      'rejected',
      req.user.id,
      oldStatus,
      'rejected',
      reason || 'Subscription rejected by employee'
    );

    // Send response first for fast API response
    res.json({
      success: true,
      message: 'Subscription rejected successfully',
      data: { subscription }
    });

    // Send notification asynchronously after response
    setImmediate(async () => {
      try {
        const rejectionMessage = `
          <p>We regret to inform you that your <strong>${subscription.plan.name}</strong> subscription request has been rejected.</p>
          <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 15px; margin: 15px 0;">
            <h4 style="color: #721c24; margin: 0 0 10px 0;">❌ Rejection Details:</h4>
            <p style="margin: 0; color: #721c24;"><strong>Reason:</strong> ${reason || 'No specific reason provided. Please contact support for details.'}</p>
            <p style="margin: 10px 0 0 0; color: #721c24;"><strong>Reviewed By:</strong> ${req.user.name}</p>
          </div>
          <p>You can submit a new subscription request or contact our support team for assistance. We're here to help! 📞</p>
        `;
        
        await sendNotificationEmail(
          subscription.user_id,
          subscription.user.email,
          subscription.user.name,
          '❌ Subscription Request Rejected',
          rejectionMessage,
          'subscription'
        );
      } catch (notificationError) {
        console.error('Rejection notification failed:', notificationError);
      }
    });

  } catch (error) {
    console.error('Reject subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject subscription',
      error: error.message
    });
  }
};

// Freeze subscription (employee/admin only)
const freezeSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { frozen_until, frozen_reason } = req.body;

    const subscription = await Subscription.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (subscription.confirmation_status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Can only freeze confirmed subscriptions'
      });
    }

    await subscription.update({
      frozen_until: frozen_until || null,
      frozen_reason: frozen_reason || 'Subscription frozen by employee'
    });

    // Update user status to frozen
    await subscription.user.update({ status: 'frozen' });

    // Create audit trail
    await createAuditTrail(
      subscription.id,
      'frozen',
      req.user.id,
      'active',
      'frozen',
      frozen_reason || 'Subscription frozen'
    );

    // Send response first for fast API response
    res.json({
      success: true,
      message: 'Subscription frozen successfully',
      data: { subscription }
    });

    // Send email notification asynchronously after response
    setImmediate(async () => {
      try {
        const freezeMessage = `
          <p>Your subscription has been temporarily frozen by our staff.</p>
          <div style="background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 4px; padding: 15px; margin: 15px 0;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">🧊 Freeze Details:</h4>
            <ul style="margin: 0; color: #856404;">
              <li><strong>Reason:</strong> ${frozen_reason || 'Administrative freeze'}</li>
              <li><strong>Frozen Until:</strong> ${frozen_until ? new Date(frozen_until).toDateString() : 'Until further notice'}</li>
              <li><strong>Processed By:</strong> ${req.user.name}</li>
            </ul>
          </div>
          <p>During this freeze period, your membership benefits are temporarily suspended. Contact us for any questions or to discuss reactivation. 📞</p>
        `;
        
        await sendNotificationEmail(
          subscription.user_id,
          subscription.user.email,
          subscription.user.name,
          '🧊 Subscription Temporarily Frozen',
          freezeMessage,
          'subscription'
        );
      } catch (notificationError) {
        console.error('Freeze notification failed:', notificationError);
      }
    });

  } catch (error) {
    console.error('Freeze subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to freeze subscription',
      error: error.message
    });
  }
};

// Unfreeze subscription (employee/admin only)
const unfreezeSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (!subscription.frozen_until && !subscription.frozen_reason) {
      return res.status(400).json({
        success: false,
        message: 'Subscription is not frozen'
      });
    }

    await subscription.update({
      frozen_until: null,
      frozen_reason: null
    });

    // Update user status back to active
    await subscription.user.update({ status: 'active' });

    // Create audit trail
    await createAuditTrail(
      subscription.id,
      'unfrozen',
      req.user.id,
      'frozen',
      'active',
      'Subscription unfrozen by employee'
    );

    // Send response first for fast API response
    res.json({
      success: true,
      message: 'Subscription unfrozen successfully',
      data: { subscription }
    });

    // Send email notification asynchronously after response
    setImmediate(async () => {
      try {
        const unfreezeMessage = `
          <p>Great news! Your subscription freeze has been lifted and your membership is now active again.</p>
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; padding: 15px; margin: 15px 0;">
            <h4 style="color: #155724; margin: 0 0 10px 0;">🔥 Reactivation Details:</h4>
            <ul style="margin: 0; color: #155724;">
              <li><strong>Reactivated On:</strong> ${new Date().toDateString()}</li>
              <li><strong>Processed By:</strong> ${req.user.name}</li>
              <li><strong>Status:</strong> Active</li>
            </ul>
          </div>
          <p>You can now resume using all gym facilities and services. Welcome back! 💪</p>
        `;
        
        await sendNotificationEmail(
          subscription.user_id,
          subscription.user.email,
          subscription.user.name,
          '🔥 Subscription Reactivated!',
          unfreezeMessage,
          'subscription'
        );
      } catch (notificationError) {
        console.error('Unfreeze notification failed:', notificationError);
      }
    });

  } catch (error) {
    console.error('Unfreeze subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unfreeze subscription',
      error: error.message
    });
  }
};

// Cancel subscription (user request)
const cancelSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const subscription = await Subscription.findOne({
      where: {
        id,
        user_id: req.user.id
      },
      include: [{ model: SubscriptionPlan, as: 'plan' }]
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found or unauthorized'
      });
    }

    if (subscription.confirmation_status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Can only cancel confirmed subscriptions'
      });
    }

    // Add cancellation request to notes
    const cancellationNote = `\n[CANCELLATION REQUESTED] ${reason || 'User requested cancellation'} (${new Date().toISOString()})`;
    await subscription.update({
      notes: `${subscription.notes || ''}${cancellationNote}`
    });

    // Create audit trail
    await createAuditTrail(
      subscription.id,
      'modified',
      req.user.id,
      'confirmed',
      'cancellation_requested',
      reason || 'User requested cancellation'
    );

    // Send response first for fast API response
    res.json({
      success: true,
      message: 'Cancellation request submitted successfully. An employee will review your request.',
      data: { subscription }
    });

    // Send notifications asynchronously after response
    setImmediate(async () => {
      // Notify user
      try {
        const cancellationMessage = `
          <p>We have received your request to cancel your <strong>${subscription.plan.name}</strong> subscription.</p>
          <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 15px; margin: 15px 0;">
            <h4 style="color: #721c24; margin: 0 0 10px 0;">📋 Cancellation Request Details:</h4>
            <ul style="margin: 0; color: #721c24;">
              <li><strong>Subscription:</strong> ${subscription.plan.name}</li>
              <li><strong>Reason:</strong> ${reason || 'No reason provided'}</li>
              <li><strong>Request Date:</strong> ${new Date().toDateString()}</li>
              <li><strong>Status:</strong> Pending Review</li>
            </ul>
          </div>
          <p>An employee will review your cancellation request and contact you soon. If you have any urgent concerns, please contact our support team directly. 📞</p>
        `;
        
        await sendNotificationEmail(
          req.user.id,
          req.user.email,
          req.user.name,
          '📋 Cancellation Request Received',
          cancellationMessage,
          'subscription'
        );
      } catch (notificationError) {
        console.error('User cancellation notification failed:', notificationError);
      }

      // Notify employees
      try {
        const employees = await User.findAll({
          where: {
            role: { [Op.in]: ['employee', 'admin'] },
            status: 'active'
          },
          attributes: ['email', 'name']
        });
        
        const employeeEmails = employees.map(emp => emp.email);
        
        if (employeeEmails.length > 0) {
          const employeeCancelMessage = `
            <p><strong>Cancellation Request Received!</strong></p>
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0;">
              <h4 style="color: #856404; margin: 0 0 10px 0;">⚠️ Request Details:</h4>
              <ul style="margin: 0; color: #856404;">
                <li><strong>User:</strong> ${req.user.name} (${req.user.email})</li>
                <li><strong>Subscription:</strong> ${subscription.plan.name}</li>
                <li><strong>Reason:</strong> ${reason || 'No reason provided'}</li>
                <li><strong>Subscription ID:</strong> #${subscription.id}</li>
                <li><strong>Request Date:</strong> ${new Date().toDateString()}</li>
              </ul>
            </div>
            <p>Please review this cancellation request and take appropriate action in the admin panel.</p>
          `;
          
          await sendEmployeeNotification(
            employeeEmails,
            'Subscription Cancellation Request',
            employeeCancelMessage,
            'cancellation_request'
          );
        }
      } catch (employeeNotificationError) {
        console.error('Employee cancellation notification failed:', employeeNotificationError);
      }
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit cancellation request',
      error: error.message
    });
  }
};

module.exports = {
  getMySubscriptions,
  getAllSubscriptions,
  getSubscriptionById,
  createSubscription,
  confirmSubscription,
  rejectSubscription,
  freezeSubscription,
  unfreezeSubscription,
  cancelSubscription
};