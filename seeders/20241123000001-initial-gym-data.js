'use strict';

const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const plans = [
      {
        name: 'Basic Monthly',
        description: 'Entry-level membership with standard gym access',
        duration_months: 1,
        price: '29.99',
        features: JSON.stringify(['Gym Access', 'Locker Room', 'Basic Equipment']),
        is_active: true,
        created_at: baseDate,
        updated_at: baseDate
      },
      {
        name: 'Premium Monthly',
        description: 'Full access plus classes and recovery amenities',
        duration_months: 1,
        price: '59.99',
        features: JSON.stringify(['Gym Access', 'Locker Room', 'All Equipment', 'Group Classes', 'Sauna']),
        is_active: true,
        created_at: baseDate,
        updated_at: baseDate
      },
      {
        name: 'Annual Basic',
        description: 'Year-long access with a lower monthly equivalent',
        duration_months: 12,
        price: '299.99',
        features: JSON.stringify(['Gym Access', 'Locker Room', 'Basic Equipment', 'Annual Discount']),
        is_active: true,
        created_at: baseDate,
        updated_at: baseDate
      },
      {
        name: 'Annual Premium',
        description: 'Premium annual membership with coaching perks',
        duration_months: 12,
        price: '599.99',
        features: JSON.stringify(['Gym Access', 'Locker Room', 'All Equipment', 'Group Classes', 'Sauna', 'Personal Training Session', 'Annual Discount']),
        is_active: true,
        created_at: baseDate,
        updated_at: baseDate
      }
    ];

    const insertedPlans = await queryInterface.bulkInsert('subscription_plans', plans, { returning: true });

    const users = [
      {
        name: 'System Admin',
        email: 'admin@gym.com',
        phone: '+213555100001',
        password_hash: await bcrypt.hash('admin123', 10),
        role: 'admin',
        status: 'active',
        email_verified: true,
        created_at: baseDate,
        updated_at: baseDate
      },
      {
        name: 'Sarah Employee',
        email: 'employee@gym.com',
        phone: '+213555100002',
        password_hash: await bcrypt.hash('employee123', 10),
        role: 'employee',
        status: 'active',
        email_verified: true,
        created_at: baseDate,
        updated_at: baseDate
      },
      {
        name: 'Mike Coach',
        email: 'coach@gym.com',
        phone: '+213555100003',
        password_hash: await bcrypt.hash('coach123', 10),
        role: 'coach',
        status: 'active',
        email_verified: true,
        created_at: baseDate,
        updated_at: baseDate
      },
      {
        name: 'Amina Benali',
        email: 'amina@example.com',
        phone: '+213555100004',
        password_hash: await bcrypt.hash('user123', 10),
        role: 'user',
        status: 'active',
        email_verified: true,
        created_at: baseDate,
        updated_at: baseDate
      },
      {
        name: 'Karim Haddad',
        email: 'karim@example.com',
        phone: '+213555100005',
        password_hash: await bcrypt.hash('user123', 10),
        role: 'user',
        status: 'active',
        email_verified: true,
        created_at: baseDate,
        updated_at: baseDate
      },
      {
        name: 'Leila Zeroual',
        email: 'leila@example.com',
        phone: '+213555100006',
        password_hash: await bcrypt.hash('user123', 10),
        role: 'user',
        status: 'pending_subscription',
        email_verified: false,
        created_at: baseDate,
        updated_at: baseDate
      },
      {
        name: 'Omar Saidi',
        email: 'omar@example.com',
        phone: '+213555100007',
        password_hash: await bcrypt.hash('user123', 10),
        role: 'user',
        status: 'expired',
        email_verified: true,
        created_at: baseDate,
        updated_at: baseDate
      }
    ];

    const insertedUsers = await queryInterface.bulkInsert('users', users, { returning: true });
    const userMap = Object.fromEntries(insertedUsers.map((user, index) => [index + 1, user]));

    const classes = [
      {
        name: 'Morning Yoga',
        description: 'Gentle flow and mobility session to start the day',
        coach_id: insertedUsers[2].id,
        capacity: 15,
        duration_minutes: 60,
        schedule_time: '08:00:00',
        schedule_days: JSON.stringify(['monday', 'wednesday', 'friday']),
        price: '15.00',
        registered_users: JSON.stringify([insertedUsers[3].id, insertedUsers[4].id]),
        status: 'available',
        is_active: true,
        created_at: baseDate
      },
      {
        name: 'HIIT Training',
        description: 'Fast-paced interval session for strength and cardio',
        coach_id: insertedUsers[2].id,
        capacity: 20,
        duration_minutes: 45,
        schedule_time: '18:30:00',
        schedule_days: JSON.stringify(['tuesday', 'thursday']),
        price: '20.00',
        registered_users: JSON.stringify([insertedUsers[4].id, insertedUsers[5].id]),
        status: 'available',
        is_active: true,
        created_at: baseDate
      },
      {
        name: 'Weight Training 101',
        description: 'Beginner-friendly introduction to lifting technique',
        coach_id: insertedUsers[2].id,
        capacity: 12,
        duration_minutes: 90,
        schedule_time: '10:00:00',
        schedule_days: JSON.stringify(['saturday']),
        price: '25.00',
        registered_users: JSON.stringify([insertedUsers[3].id]),
        status: 'available',
        is_active: true,
        created_at: baseDate
      },
      {
        name: 'Cardio Blast',
        description: 'High-energy circuit for endurance and stamina',
        coach_id: null,
        capacity: 25,
        duration_minutes: 30,
        schedule_time: '07:00:00',
        schedule_days: JSON.stringify(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
        price: '12.00',
        registered_users: JSON.stringify([insertedUsers[6].id]),
        status: 'available',
        is_active: true,
        created_at: baseDate
      }
    ];

    await queryInterface.bulkInsert('classes', classes);

    const coachAssignments = [
      {
        coach_id: insertedUsers[2].id,
        user_id: insertedUsers[3].id,
        assigned_date: baseDate,
        is_active: true,
        notes: 'Strength and conditioning plan for improved posture'
      },
      {
        coach_id: insertedUsers[2].id,
        user_id: insertedUsers[4].id,
        assigned_date: baseDate,
        is_active: true,
        notes: 'Fat-loss program with guided nutrition reminders'
      }
    ];

    await queryInterface.bulkInsert('coach_assignments', coachAssignments);

    const notifications = [
      {
        user_id: insertedUsers[0].id,
        title: 'Welcome to the gym dashboard',
        message: 'The system has been initialized with a realistic sample dataset.',
        type: 'general',
        is_read: false,
        created_at: baseDate
      },
      {
        user_id: insertedUsers[3].id,
        title: 'Subscription renewed',
        message: 'Your premium monthly plan is active and ready for use.',
        type: 'subscription',
        is_read: true,
        created_at: baseDate
      },
      {
        user_id: insertedUsers[4].id,
        title: 'New class reminder',
        message: 'HIIT Training is scheduled for tonight at 18:30.',
        type: 'class',
        is_read: false,
        created_at: baseDate
      },
      {
        user_id: insertedUsers[6].id,
        title: 'Membership expired',
        message: 'Please renew your membership to continue attending classes.',
        type: 'payment',
        is_read: false,
        created_at: baseDate
      }
    ];

    await queryInterface.bulkInsert('notifications', notifications);

    const subscriptions = [
      {
        user_id: insertedUsers[3].id,
        plan_id: insertedPlans[1].id,
        payment_method: 'card',
        payment_status: 'paid',
        confirmation_status: 'confirmed',
        confirmed_by: insertedUsers[0].id,
        start_date: new Date(baseDate.getFullYear(), baseDate.getMonth(), 1),
        end_date: new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1),
        amount: '59.99',
        notes: 'Member upgraded to premium monthly plan',
        created_at: baseDate,
        updated_at: baseDate
      },
      {
        user_id: insertedUsers[4].id,
        plan_id: insertedPlans[0].id,
        payment_method: 'cash',
        payment_status: 'pending',
        confirmation_status: 'pending',
        confirmed_by: null,
        start_date: null,
        end_date: null,
        amount: '29.99',
        notes: 'New member waiting for plan confirmation',
        created_at: baseDate,
        updated_at: baseDate
      },
      {
        user_id: insertedUsers[6].id,
        plan_id: insertedPlans[2].id,
        payment_method: 'card',
        payment_status: 'failed',
        confirmation_status: 'rejected',
        confirmed_by: insertedUsers[0].id,
        start_date: null,
        end_date: null,
        amount: '299.99',
        notes: 'Previous annual plan payment failed and was rejected',
        created_at: baseDate,
        updated_at: baseDate
      }
    ];

    const insertedSubscriptions = await queryInterface.bulkInsert('subscriptions', subscriptions, { returning: true });

    const subscriptionAudit = [
      {
        subscription_id: insertedSubscriptions[0].id,
        action: 'confirmed',
        performed_by: insertedUsers[0].id,
        old_status: 'pending',
        new_status: 'confirmed',
        notes: 'Admin confirmed premium monthly subscription',
        created_at: baseDate
      },
      {
        subscription_id: insertedSubscriptions[1].id,
        action: 'created',
        performed_by: insertedUsers[4].id,
        old_status: null,
        new_status: 'pending',
        notes: 'Member requested the basic monthly plan',
        created_at: baseDate
      },
      {
        subscription_id: insertedSubscriptions[2].id,
        action: 'rejected',
        performed_by: insertedUsers[0].id,
        old_status: 'pending',
        new_status: 'rejected',
        notes: 'Payment was declined and the request was rejected',
        created_at: baseDate
      }
    ];

    await queryInterface.bulkInsert('subscription_audit', subscriptionAudit);

    const attendance = [
      {
        user_id: insertedUsers[3].id,
        check_in_time: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 7, 30),
        check_out_time: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 9, 0),
        recorded_by: insertedUsers[1].id,
        notes: 'Morning cardio session',
        created_at: baseDate
      },
      {
        user_id: insertedUsers[4].id,
        check_in_time: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 18, 15),
        check_out_time: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 19, 0),
        recorded_by: insertedUsers[2].id,
        notes: 'HIIT class attendance',
        created_at: baseDate
      },
      {
        user_id: insertedUsers[6].id,
        check_in_time: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 8, 0),
        check_out_time: null,
        recorded_by: insertedUsers[1].id,
        notes: 'Signed in but did not checkout',
        created_at: baseDate
      }
    ];

    await queryInterface.bulkInsert('attendance', attendance);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('attendance', null, {});
    await queryInterface.bulkDelete('subscription_audit', null, {});
    await queryInterface.bulkDelete('subscriptions', null, {});
    await queryInterface.bulkDelete('notifications', null, {});
    await queryInterface.bulkDelete('coach_assignments', null, {});
    await queryInterface.bulkDelete('classes', null, {});
    await queryInterface.bulkDelete('users', null, {});
    await queryInterface.bulkDelete('subscription_plans', null, {});
  }
};