module.exports = (sequelize, DataTypes) => {
  const CoachAssignment = sequelize.define('CoachAssignment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    coach_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    assigned_date: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'coach_assignments',
    timestamps: false,
    underscored: true
  });

  CoachAssignment.associate = function(models) {
    CoachAssignment.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    CoachAssignment.belongsTo(models.User, { foreignKey: 'coach_id', as: 'coach' });
  };

  return CoachAssignment;
};