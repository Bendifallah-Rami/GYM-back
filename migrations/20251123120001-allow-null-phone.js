'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Change phone column to allow NULL values for OAuth users
    await queryInterface.changeColumn('users', 'phone', {
      type: Sequelize.STRING(20),
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert phone column to NOT NULL (this will fail if there are NULL values)
    await queryInterface.changeColumn('users', 'phone', {
      type: Sequelize.STRING(20),
      allowNull: false
    });
  }
};