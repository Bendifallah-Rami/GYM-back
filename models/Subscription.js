module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define('Subscription', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    plan_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'subscription_plans',
        key: 'id'
      }
    },
    payment_method: {
      type: DataTypes.ENUM('cash', 'card'),
      allowNull: false
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'paid', 'failed'),
      defaultValue: 'pending',
      allowNull: false
    },
    confirmation_status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'rejected'),
      defaultValue: 'pending',
      allowNull: false
    },
    confirmed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    frozen_until: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    frozen_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'subscriptions',
    timestamps: true,
    underscored: true
  });

  Subscription.associate = function(models) {
    Subscription.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    Subscription.belongsTo(models.SubscriptionPlan, { foreignKey: 'plan_id', as: 'plan' });
    Subscription.belongsTo(models.User, { foreignKey: 'confirmed_by', as: 'confirmedBy' });
    Subscription.hasMany(models.SubscriptionAudit, { foreignKey: 'subscription_id', as: 'audits' });
  };

  return Subscription;
};