require('dotenv').config();

module.exports = {
  // Use DATABASE_URL in production (Render provides this)
  use_env_variable: process.env.NODE_ENV === 'production' ? 'DATABASE_URL' : false,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Rami.2006',
  database: process.env.DB_NAME || 'gym_db',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
};