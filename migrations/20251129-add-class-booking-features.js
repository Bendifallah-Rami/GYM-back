'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns to classes table
    await queryInterface.addColumn('classes', 'price', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    });

    await queryInterface.addColumn('classes', 'registered_users', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: []
    });

    await queryInterface.addColumn('classes', 'status', {
      type: Sequelize.ENUM('available', 'full', 'cancelled'),
      allowNull: false,
      defaultValue: 'available'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the columns in reverse order
    await queryInterface.removeColumn('classes', 'status');
    await queryInterface.removeColumn('classes', 'registered_users');
    await queryInterface.removeColumn('classes', 'price');
    
    // Remove the ENUM type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_classes_status";');
  }
};