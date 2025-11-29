module.exports = (sequelize, DataTypes) => {
  const Class = sequelize.define('Class', {
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    coach_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    capacity: {
      type: DataTypes.INTEGER,
      defaultValue: 20,
      allowNull: false,
      validate: {
        min: 1,
        max: 100
      }
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      defaultValue: 60,
      allowNull: false,
      validate: {
        min: 15,
        max: 240
      }
    },
    schedule_time: {
      type: DataTypes.TIME,
      allowNull: true
    },
    schedule_days: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    registered_users: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      validate: {
        isArray(value) {
          if (value && !Array.isArray(value)) {
            throw new Error('Registered users must be an array');
          }
        }
      }
    },
    status: {
      type: DataTypes.ENUM('available', 'full', 'cancelled'),
      allowNull: false,
      defaultValue: 'available'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  }, {
    tableName: 'classes',
    timestamps: true,
    underscored: true,
    updatedAt: false
  });

  Class.associate = function(models) {
    Class.belongsTo(models.User, { foreignKey: 'coach_id', as: 'coach' });
  };

  return Class;
};