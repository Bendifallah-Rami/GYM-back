const nodemailer = require('nodemailer');
const { Notification } = require('../models');

// Enhanced email transporter setup
const createTransporter = () => {
  // Check if email is properly configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('⚠️  Email not configured - verification emails will be skipped');
    return null;
  }

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    // Enhanced connection settings to prevent timeout errors
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000,   // 30 seconds
    socketTimeout: 60000,     // 60 seconds
    pool: true,               // Use connection pooling
    maxConnections: 5,        // Max concurrent connections
    maxMessages: 100,         // Max messages per connection
    // TLS settings for better compatibility
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * Send email verification email
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {string} token - Verification token
 */
const sendVerificationEmail = async (email, name, token) => {
  try {
    const transporter = createTransporter();
    
    // Skip if transporter is not configured
    if (!transporter) {
      return { success: false, message: 'Email service not configured' };
    }

    // Verify transporter before sending
    try {
      await transporter.verify();
    } catch (verifyError) {
      throw new Error(`Email service unavailable: ${verifyError.message}`);
    }
    
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${token}`;
    
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Gym Management'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🏋️‍♂️ Verify Your Gym Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to ${process.env.APP_NAME || 'Gym Management'}!</h2>
          <p>Hello ${name},</p>
          <p>Thank you for registering with us. Please verify your email address to complete your registration.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #007bff;">${verificationUrl}</p>
          <p><small>This verification link will expire in 24 hours.</small></p>
          <hr style="border: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 14px;">
            If you didn't create this account, please ignore this email.
          </p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    return { 
      success: true, 
      message: 'Verification email sent successfully',
      messageId: result.messageId 
    };
    
  } catch (error) {
    // Log the error but don't throw - let registration continue
    console.error(`📧 Email sending failed for ${email}:`, error.message);
    return { 
      success: false, 
      message: `Email sending failed: ${error.message}` 
    };
  }
};

/**
 * Send welcome email after successful verification
 * @param {string} email - User email
 * @param {string} name - User name
 */
const sendWelcomeEmail = async (email, name) => {
  try {
    const transporter = createTransporter();
    
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;
    
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Gym Management'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Our Gym!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Email Verified Successfully! 🎉</h2>
          <p>Hello ${name},</p>
          <p>Congratulations! Your email has been verified and your gym membership account is now active.</p>
          <h3>Next Steps:</h3>
          <ul>
            <li>Choose a subscription plan that fits your needs</li>
            <li>Complete your profile information</li>
            <li>Book your first workout session</li>
            <li>Download our mobile app for easy access</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" 
               style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
          <p>We're excited to have you as part of our gym family!</p>
          <hr style="border: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 14px;">
            If you have any questions, feel free to contact our support team.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
    return { success: true };
    
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {string} token - Reset token
 */
const sendPasswordResetEmail = async (email, name, token) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;
    
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Gym Management'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Password Reset Request</h2>
          <p>Hello ${name},</p>
          <p>We received a request to reset your password. If you made this request, click the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #dc3545;">${resetUrl}</p>
          <p><small>This reset link will expire in 1 hour for security reasons.</small></p>
          <hr style="border: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 14px;">
            If you didn't request this password reset, please ignore this email and your password will remain unchanged.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
    return { success: true };
    
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create notification in database (silent operation)
 * @param {number} userId - User ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 */
const createNotification = async (userId, title, message, type = 'general') => {
  try {
    await Notification.create({
      user_id: userId,
      title,
      message,
      type
    });
    return { success: true };
  } catch (error) {
    console.error('📝 Notification creation failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification email and create database notification
 * @param {number} userId - User ID
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 */
const sendNotificationEmail = async (userId, email, name, title, message, type = 'general') => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Gym Management'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${title}</h2>
          <p>Hello ${name},</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #007bff; margin: 20px 0;">
            ${message}
          </div>
          <hr style="border: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 14px;">
            This is an automated notification from ${process.env.APP_NAME || 'Gym Management'}.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    await createNotification(userId, title, message, type);
    
    console.log(`Notification email sent to ${email}: ${title}`);
    return { success: true };
    
  } catch (error) {
    console.error('Error sending notification email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification to employees about subscription actions
 * @param {Array} employeeEmails - Array of employee email addresses
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 */
const sendEmployeeNotification = async (employeeEmails, title, message, type = 'employee_alert') => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      return { success: false, message: 'Email service not configured' };
    }

    const emailPromises = employeeEmails.map(email => {
      const mailOptions = {
        from: `"${process.env.APP_NAME || 'Gym Management'}" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `[STAFF ALERT] ${title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #007bff; color: white; padding: 20px; text-align: center;">
              <h2 style="margin: 0;">${process.env.APP_NAME || 'Gym Management'} - Staff Alert</h2>
            </div>
            <div style="padding: 30px;">
              <h3 style="color: #333; margin-bottom: 20px;">${title}</h3>
              <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 20px 0;">
                ${message}
              </div>
              <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                  <strong>Action Required:</strong> Please log into the admin panel to review and take appropriate action.
                </p>
              </div>
            </div>
            <hr style="border: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px; text-align: center;">
              This is an automated staff notification from ${process.env.APP_NAME || 'Gym Management'}.
            </p>
          </div>
        `
      };
      return transporter.sendMail(mailOptions);
    });

    await Promise.all(emailPromises);
    console.log(`Employee notifications sent to ${employeeEmails.length} staff members: ${title}`);
    return { success: true };
    
  } catch (error) {
    console.error('Error sending employee notifications:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test email configuration
 */
const testEmailConfiguration = async () => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      return { success: false, message: 'Email service not configured' };
    }
    await transporter.verify();
    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendNotificationEmail,
  sendEmployeeNotification,
  createNotification,
  testEmailConfiguration
};