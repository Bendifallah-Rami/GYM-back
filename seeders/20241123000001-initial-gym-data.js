'use strict';

const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Insert subscription plans
    await queryInterface.bulkInsert('subscription_plans', [
      {
        name: 'Basic Monthly',
        description: 'Access to gym equipment and basic facilities',
        duration_months: 1,
        price: 29.99,
        features: JSON.stringify(["Gym Access", "Locker Room", "Basic Equipment"]),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Premium Monthly',
        description: 'Full access with additional perks',
        duration_months: 1,
        price: 59.99,
        features: JSON.stringify(["Gym Access", "Locker Room", "All Equipment", "Group Classes", "Sauna"]),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Annual Basic',
        description: 'Basic plan with annual discount',
        duration_months: 12,
        price: 299.99,
        features: JSON.stringify(["Gym Access", "Locker Room", "Basic Equipment", "Annual Discount"]),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Annual Premium',
        description: 'Premium plan with annual discount',
        duration_months: 12,
        price: 599.99,
        features: JSON.stringify(["Gym Access", "Locker Room", "All Equipment", "Group Classes", "Sauna", "Personal Training Session", "Annual Discount"]),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Insert default admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await queryInterface.bulkInsert('users', [
      {
        name: 'System Admin',
        email: 'admin@gym.com',
        phone: '+1234567890',
        password_hash: hashedPassword,
        role: 'admin',
        status: 'active',
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'John Employee',
        email: 'employee@gym.com',
        phone: '+1234567891',
        password_hash: await bcrypt.hash('employee123', 10),
        role: 'employee',
        status: 'active',
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Mike Coach',
        email: 'coach@gym.com',
        phone: '+1234567892',
        password_hash: await bcrypt.hash('coach123', 10),
        role: 'coach',
        status: 'active',
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Test User',
        email: 'user@gym.com',
        phone: '+1234567893',
        password_hash: await bcrypt.hash('user123', 10),
        role: 'user',
        status: 'pending_subscription',
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Insert sample classes
    await queryInterface.bulkInsert('classes', [
      {
        name: 'Morning Yoga',
        description: 'Relaxing yoga session to start your day',
        coach_id: 3, // Mike Coach
        capacity: 15,
        duration_minutes: 60,
        schedule_time: '08:00:00',
        schedule_days: JSON.stringify(['monday', 'wednesday', 'friday']),
        is_active: true,
        created_at: new Date()
      },
      {
        name: 'HIIT Training',
        description: 'High-intensity interval training for maximum results',
        coach_id: 3, // Mike Coach
        capacity: 20,
        duration_minutes: 45,
        schedule_time: '18:00:00',
        schedule_days: JSON.stringify(['tuesday', 'thursday']),
        is_active: true,
        created_at: new Date()
      },
      {
        name: 'Weight Training 101',
        description: 'Introduction to weight training for beginners',
        coach_id: 3, // Mike Coach
        capacity: 12,
        duration_minutes: 90,
        schedule_time: '10:00:00',
        schedule_days: JSON.stringify(['saturday']),
        is_active: true,
        created_at: new Date()
      },
      {
        name: 'Cardio Blast',
        description: 'High-energy cardio workout',
        coach_id: null, // No specific coach assigned
        capacity: 25,
        duration_minutes: 30,
        schedule_time: '07:00:00',
        schedule_days: JSON.stringify(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
        is_active: true,
        created_at: new Date()
      }
    ]);

    // Insert sample coach assignment
    await queryInterface.bulkInsert('coach_assignments', [
      {
        coach_id: 3, // Mike Coach
        user_id: 4,  // Test User
        assigned_date: new Date(),
        is_active: true,
        notes: 'Personal training focus on strength building'
      }
    ]);

    // Insert sample notifications
    await queryInterface.bulkInsert('notifications', [
      {
        user_id: 1, // System Admin
        title: 'Welcome to Gym Management System',
        message: 'System has been successfully initialized with sample data',
        type: 'general',
        is_read: false,
        created_at: new Date()
      },
      {
        user_id: 4, // Test User
        title: 'Welcome to Our Gym!',
        message: 'Please choose a subscription plan to get started',
        type: 'subscription',
        is_read: false,
        created_at: new Date()
      },
      {
        user_id: 4, // Test User
        title: 'Coach Assigned',
        message: 'Mike Coach has been assigned as your personal trainer',
        type: 'general',
        is_read: false,
        created_at: new Date()
      }
    ]);

    // Insert sample subscription for test user
    await queryInterface.bulkInsert('subscriptions', [
      {
        user_id: 4, // Test User
        plan_id: 1, // Basic Monthly
        payment_method: 'cash',
        payment_status: 'pending',
        confirmation_status: 'pending',
        confirmed_by: null,
        start_date: null,
        end_date: null,
        amount: 29.99,
        notes: 'Sample pending subscription',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Insert sample subscription audit
    await queryInterface.bulkInsert('subscription_audit', [
      {
        subscription_id: 1,
        action: 'created',
        performed_by: 4, // Test User created it
        old_status: null,
        new_status: 'pending',
        notes: 'User submitted subscription request',
        created_at: new Date()
      }
    ]);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('subscription_audit', null, {});
    await queryInterface.bulkDelete('subscriptions', null, {});
    await queryInterface.bulkDelete('notifications', null, {});
    await queryInterface.bulkDelete('coach_assignments', null, {});
    await queryInterface.bulkDelete('classes', null, {});
    await queryInterface.bulkDelete('users', null, {});
    await queryInterface.bulkDelete('subscription_plans', null, {});
  }
};