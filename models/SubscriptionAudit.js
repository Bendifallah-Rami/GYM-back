module.exports = (sequelize, DataTypes) => {
  const SubscriptionAudit = sequelize.define('SubscriptionAudit', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    subscription_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'subscriptions',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.ENUM('created', 'confirmed', 'rejected', 'modified', 'frozen', 'unfrozen'),
      allowNull: false
    },
    performed_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    old_status: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    new_status: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'subscription_audit',
    timestamps: true,
    underscored: true,
    updatedAt: false
  });

  SubscriptionAudit.associate = function(models) {
    SubscriptionAudit.belongsTo(models.Subscription, { foreignKey: 'subscription_id', as: 'subscription' });
    SubscriptionAudit.belongsTo(models.User, { foreignKey: 'performed_by', as: 'performedBy' });
  };

  return SubscriptionAudit;
};