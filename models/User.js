module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 255]
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: [10, 20]
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    google_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    profile_picture: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    role: {
      type: DataTypes.ENUM('user', 'employee', 'admin', 'coach'),
      defaultValue: 'user',
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending_subscription', 'active', 'suspended', 'expired', 'frozen'),
      defaultValue: 'pending_subscription',
      allowNull: false
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    email_verification_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    email_verification_expires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true
  });

  User.associate = function(models) {
    User.hasMany(models.Subscription, { foreignKey: 'user_id', as: 'subscriptions' });
    User.hasMany(models.Attendance, { foreignKey: 'user_id', as: 'attendances' });
    User.hasMany(models.CoachAssignment, { foreignKey: 'user_id', as: 'coachAssignments' });
    User.hasMany(models.CoachAssignment, { foreignKey: 'coach_id', as: 'assignedMembers' });
    User.hasMany(models.Class, { foreignKey: 'coach_id', as: 'classes' });
    User.hasMany(models.Notification, { foreignKey: 'user_id', as: 'notifications' });
    User.hasMany(models.SubscriptionAudit, { foreignKey: 'performed_by', as: 'auditActions' });
  };

  return User;
};