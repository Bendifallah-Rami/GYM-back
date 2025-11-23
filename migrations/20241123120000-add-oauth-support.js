module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add Google OAuth columns if they don't exist
    const tableInfo = await queryInterface.describeTable('Users');
    
    if (!tableInfo.google_id) {
      await queryInterface.addColumn('Users', 'google_id', {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true
      });
    }
    
    if (!tableInfo.profile_picture) {
      await queryInterface.addColumn('Users', 'profile_picture', {
        type: Sequelize.STRING(500),
        allowNull: true
      });
    }

    // Make password_hash nullable for OAuth users
    if (tableInfo.password_hash && tableInfo.password_hash.allowNull === false) {
      await queryInterface.changeColumn('Users', 'password_hash', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    }

    // Make phone nullable for OAuth users (they can fill it later)
    if (tableInfo.phone && tableInfo.phone.allowNull === false) {
      await queryInterface.changeColumn('Users', 'phone', {
        type: Sequelize.STRING(20),
        allowNull: true
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'google_id');
    await queryInterface.removeColumn('Users', 'profile_picture');
    
    // Revert password_hash to not nullable
    await queryInterface.changeColumn('Users', 'password_hash', {
      type: Sequelize.STRING(255),
      allowNull: false
    });
    
    // Revert phone to not nullable
    await queryInterface.changeColumn('Users', 'phone', {
      type: Sequelize.STRING(20),
      allowNull: false
    });
  }
};