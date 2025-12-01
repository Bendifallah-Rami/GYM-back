const { Notification } = require('../models');

// Notification service for easy integration across the application
class NotificationService {
  
  // Create a single notification
  static async createNotification({ user_id, title, message, type = 'general' }) {
    try {
      const notification = await Notification.create({
        user_id,
        title,
        message,
        type
      });
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Create bulk notifications for multiple users
  static async createBulkNotifications({ user_ids, title, message, type = 'general' }) {
    try {
      const notifications = await Promise.all(
        user_ids.map(user_id => 
          Notification.create({
            user_id,
            title,
            message,
            type
          })
        )
      );
      return notifications;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  // SUBSCRIPTION NOTIFICATIONS
  static async createSubscriptionNotification(user_id, action, subscriptionData = {}) {
    const notifications = {
      'submitted': {
        title: 'Subscription Request Submitted',
        message: 'Your gym membership request has been submitted and is under review. We will notify you once it\'s processed.',
        type: 'subscription'
      },
      'confirmed': {
        title: 'Subscription Confirmed! 🎉',
        message: `Welcome to our gym family! Your ${subscriptionData.plan_name || 'membership'} subscription has been activated. You can now enjoy all gym facilities.`,
        type: 'subscription'
      },
      'rejected': {
        title: 'Subscription Request Update',
        message: `Your subscription request has been reviewed. ${subscriptionData.reason || 'Please contact our staff for more information.'}`,
        type: 'subscription'
      },
      'frozen': {
        title: 'Subscription Frozen',
        message: 'Your membership has been temporarily frozen. Your subscription will be paused until you reactivate it.',
        type: 'subscription'
      },
      'unfrozen': {
        title: 'Subscription Reactivated',
        message: 'Welcome back! Your membership has been reactivated and you can resume using all gym facilities.',
        type: 'subscription'
      },
      'cancelled': {
        title: 'Subscription Cancelled',
        message: 'Your membership has been cancelled. Thank you for being part of our gym community. We hope to see you again!',
        type: 'subscription'
      },
      'expiring_soon': {
        title: 'Subscription Expiring Soon ⏰',
        message: `Your subscription will expire in ${subscriptionData.days_left || 'few'} days. Renew now to continue enjoying our facilities without interruption.`,
        type: 'subscription'
      },
      'expired': {
        title: 'Subscription Expired',
        message: 'Your gym membership has expired. Please renew your subscription to continue accessing the gym.',
        type: 'subscription'
      }
    };

    const notificationData = notifications[action];
    if (!notificationData) {
      throw new Error(`Invalid subscription notification action: ${action}`);
    }

    return this.createNotification({
      user_id,
      ...notificationData
    });
  }

  // CLASS NOTIFICATIONS
  static async createClassNotification(user_id, action, classData = {}) {
    const notifications = {
      'joined': {
        title: 'Class Booking Confirmed ✅',
        message: `You have successfully joined the "${classData.name || 'fitness'}" class. Class time: ${classData.schedule_time || 'TBD'}. See you there!`,
        type: 'class'
      },
      'cancelled': {
        title: 'Class Booking Cancelled',
        message: `Your booking for "${classData.name || 'the'}" class has been cancelled. The spot is now available for other members.`,
        type: 'class'
      },
      'class_cancelled': {
        title: 'Class Cancelled by Gym',
        message: `Unfortunately, the "${classData.name || ''}" class scheduled for ${classData.schedule_time || 'today'} has been cancelled. We apologize for any inconvenience.`,
        type: 'class'
      },
      'reminder': {
        title: 'Class Reminder 🔔',
        message: `Reminder: Your "${classData.name || 'fitness'}" class is starting in ${classData.time_until || '1 hour'}. Don't forget your workout gear!`,
        type: 'class'
      },
      'status_changed': {
        title: 'Class Status Update',
        message: `The status of "${classData.name || 'your'}" class has been updated to: ${classData.status || 'updated'}. Please check the latest details.`,
        type: 'class'
      },
      'new_class': {
        title: 'New Class Available! 🆕',
        message: `A new "${classData.name || 'fitness'}" class is now available. ${classData.description || 'Check it out and book your spot!'}`,
        type: 'class'
      }
    };

    const notificationData = notifications[action];
    if (!notificationData) {
      throw new Error(`Invalid class notification action: ${action}`);
    }

    return this.createNotification({
      user_id,
      ...notificationData
    });
  }

  // PAYMENT NOTIFICATIONS
  static async createPaymentNotification(user_id, action, paymentData = {}) {
    const notifications = {
      'received': {
        title: 'Payment Received ✅',
        message: `Your payment of $${paymentData.amount || 'XX.XX'} has been successfully processed. Thank you for your payment!`,
        type: 'payment'
      },
      'failed': {
        title: 'Payment Failed ❌',
        message: `Your payment attempt was unsuccessful. Please check your payment method and try again, or contact support for assistance.`,
        type: 'payment'
      },
      'reminder': {
        title: 'Payment Reminder 💳',
        message: `Your payment of $${paymentData.amount || 'XX.XX'} is due ${paymentData.due_date || 'soon'}. Please complete your payment to avoid service interruption.`,
        type: 'payment'
      },
      'refund': {
        title: 'Refund Processed',
        message: `Your refund of $${paymentData.amount || 'XX.XX'} has been processed and will appear in your account within 3-5 business days.`,
        type: 'payment'
      }
    };

    const notificationData = notifications[action];
    if (!notificationData) {
      throw new Error(`Invalid payment notification action: ${action}`);
    }

    return this.createNotification({
      user_id,
      ...notificationData
    });
  }

  // GENERAL NOTIFICATIONS
  static async createGeneralNotification(user_id, action, data = {}) {
    const notifications = {
      'welcome': {
        title: 'Welcome to Our Gym! 🏋️‍♂️',
        message: 'Welcome to our fitness community! We\'re excited to help you achieve your fitness goals. Don\'t hesitate to ask our staff if you need any assistance.',
        type: 'general'
      },
      'profile_updated': {
        title: 'Profile Updated',
        message: 'Your profile information has been successfully updated.',
        type: 'general'
      },
      'password_changed': {
        title: 'Password Changed',
        message: 'Your password has been successfully changed. If this wasn\'t you, please contact support immediately.',
        type: 'general'
      },
      'maintenance': {
        title: 'Gym Maintenance Schedule 🔧',
        message: `Please note: ${data.maintenance_info || 'Scheduled maintenance will affect gym operations. Check with staff for details.'}`,
        type: 'general'
      },
      'new_feature': {
        title: 'New Feature Available! 🆕',
        message: `${data.feature_description || 'We\'ve added a new feature to improve your gym experience. Check it out!'}`,
        type: 'general'
      },
      'achievement': {
        title: 'Achievement Unlocked! 🏆',
        message: `Congratulations! You've achieved: ${data.achievement || 'a new milestone'}. Keep up the great work!`,
        type: 'general'
      }
    };

    const notificationData = notifications[action];
    if (!notificationData) {
      // If action not found, create a custom general notification
      return this.createNotification({
        user_id,
        title: data.title || 'Notification',
        message: data.message || 'You have a new notification.',
        type: 'general'
      });
    }

    return this.createNotification({
      user_id,
      ...notificationData
    });
  }

  // EMAIL VERIFICATION NOTIFICATIONS
  static async createEmailVerificationNotification(user_id, verificationData = {}) {
    return this.createNotification({
      user_id,
      title: 'Email Verification Required',
      message: `Please verify your email address to complete your account setup. Check your inbox for the verification link.`,
      type: 'email_verification'
    });
  }

  // COACH ASSIGNMENT NOTIFICATIONS
  static async createCoachAssignmentNotification(user_id, action, coachData = {}) {
    const notifications = {
      'assigned': {
        title: 'Coach Assigned! 👨‍🏫',
        message: `You have been assigned a personal coach: ${coachData.coach_name || 'Your coach'}. They will help guide your fitness journey.`,
        type: 'general'
      },
      'changed': {
        title: 'Coach Assignment Updated',
        message: `Your personal coach has been changed to: ${coachData.coach_name || 'a new coach'}. They will be in touch soon.`,
        type: 'general'
      },
      'ended': {
        title: 'Coach Assignment Completed',
        message: `Your coaching session with ${coachData.coach_name || 'your coach'} has been completed. Thank you for training with us!`,
        type: 'general'
      }
    };

    const notificationData = notifications[action];
    if (!notificationData) {
      throw new Error(`Invalid coach assignment notification action: ${action}`);
    }

    return this.createNotification({
      user_id,
      ...notificationData
    });
  }

  // ATTENDANCE NOTIFICATIONS
  static async createAttendanceNotification(user_id, action, attendanceData = {}) {
    const notifications = {
      'checked_in': {
        title: 'Checked In ✅',
        message: `Welcome to the gym! You've been checked in at ${attendanceData.time || 'now'}. Have a great workout!`,
        type: 'general'
      },
      'checked_out': {
        title: 'Workout Complete 🏃‍♂️',
        message: `Great job! You've completed a ${attendanceData.duration || 'workout session'}. Keep up the excellent work!`,
        type: 'general'
      },
      'milestone': {
        title: 'Workout Milestone! 🎉',
        message: `Congratulations! You've reached ${attendanceData.milestone || 'a new milestone'} gym visits. You're crushing your fitness goals!`,
        type: 'general'
      }
    };

    const notificationData = notifications[action];
    if (!notificationData) {
      throw new Error(`Invalid attendance notification action: ${action}`);
    }

    return this.createNotification({
      user_id,
      ...notificationData
    });
  }
}

module.exports = NotificationService;