'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create ENUM types first
    await queryInterface.sequelize.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_role') THEN
          CREATE TYPE enum_users_role AS ENUM('user', 'employee', 'admin', 'coach');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_status') THEN
          CREATE TYPE enum_users_status AS ENUM('pending_subscription', 'active', 'suspended', 'expired', 'frozen');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_subscriptions_payment_method') THEN
          CREATE TYPE enum_subscriptions_payment_method AS ENUM('cash', 'card');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_subscriptions_payment_status') THEN
          CREATE TYPE enum_subscriptions_payment_status AS ENUM('pending', 'paid', 'failed');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_subscriptions_confirmation_status') THEN
          CREATE TYPE enum_subscriptions_confirmation_status AS ENUM('pending', 'confirmed', 'rejected');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_notifications_type') THEN
          CREATE TYPE enum_notifications_type AS ENUM('subscription', 'payment', 'class', 'general', 'email_verification');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_subscription_audit_action') THEN
          CREATE TYPE enum_subscription_audit_action AS ENUM('created', 'confirmed', 'rejected', 'modified', 'frozen', 'unfrozen');
        END IF;
      END
      $$;
    `);

    // Users table
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      google_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true
      },
      profile_picture: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      role: {
        type: Sequelize.ENUM('user', 'employee', 'admin', 'coach'),
        defaultValue: 'user',
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending_subscription', 'active', 'suspended', 'expired', 'frozen'),
        defaultValue: 'pending_subscription',
        allowNull: false
      },
      email_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      email_verification_token: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      email_verification_expires: {
        type: Sequelize.DATE,
        allowNull: true
      },
      last_login: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Subscription Plans table
    await queryInterface.createTable('subscription_plans', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      duration_months: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      features: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: '[]'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Subscriptions table
    await queryInterface.createTable('subscriptions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      plan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'subscription_plans',
          key: 'id'
        }
      },
      payment_method: {
        type: Sequelize.ENUM('cash', 'card'),
        allowNull: false
      },
      payment_status: {
        type: Sequelize.ENUM('pending', 'paid', 'failed'),
        defaultValue: 'pending',
        allowNull: false
      },
      confirmation_status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'rejected'),
        defaultValue: 'pending',
        allowNull: false
      },
      confirmed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      frozen_until: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      frozen_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Attendance table
    await queryInterface.createTable('attendance', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      check_in_time: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      },
      check_out_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      recorded_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Classes table
    await queryInterface.createTable('classes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      coach_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      capacity: {
        type: Sequelize.INTEGER,
        defaultValue: 20,
        allowNull: false
      },
      duration_minutes: {
        type: Sequelize.INTEGER,
        defaultValue: 60,
        allowNull: false
      },
      schedule_time: {
        type: Sequelize.TIME,
        allowNull: true
      },
      schedule_days: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: '[]'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Coach Assignments table
    await queryInterface.createTable('coach_assignments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      coach_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      assigned_date: {
        type: Sequelize.DATEONLY,
        defaultValue: Sequelize.NOW,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      }
    });

    // Notifications table
    await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('subscription', 'payment', 'class', 'general', 'email_verification'),
        defaultValue: 'general',
        allowNull: false
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Subscription Audit table
    await queryInterface.createTable('subscription_audit', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      subscription_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'subscriptions',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      action: {
        type: Sequelize.ENUM('created', 'confirmed', 'rejected', 'modified', 'frozen', 'unfrozen'),
        allowNull: false
      },
      performed_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      old_status: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      new_status: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes
    await queryInterface.addIndex('users', ['email'], { unique: true });
    await queryInterface.addIndex('users', ['google_id'], { unique: true });
    await queryInterface.addIndex('users', ['role', 'status']);
    await queryInterface.addIndex('users', ['email_verification_token']);
    await queryInterface.addIndex('subscriptions', ['user_id', 'confirmation_status']);
    await queryInterface.addIndex('attendance', ['user_id', 'check_in_time']);
    await queryInterface.addIndex('notifications', ['user_id', 'is_read']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('subscription_audit');
    await queryInterface.dropTable('notifications');
    await queryInterface.dropTable('coach_assignments');
    await queryInterface.dropTable('classes');
    await queryInterface.dropTable('attendance');
    await queryInterface.dropTable('subscriptions');
    await queryInterface.dropTable('subscription_plans');
    await queryInterface.dropTable('users');
    
    // Drop ENUM types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_users_role CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_users_status CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_subscriptions_payment_method CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_subscriptions_payment_status CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_subscriptions_confirmation_status CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_notifications_type CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_subscription_audit_action CASCADE');
  }
};
