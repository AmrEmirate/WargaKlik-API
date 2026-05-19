const { Sequelize } = require('sequelize');

const isSqlite = process.env.DB_DIALECT === 'sqlite';

const sequelize = isSqlite 
  ? new Sequelize({
      dialect: 'sqlite',
      storage: process.env.DB_NAME || ':memory:',
      logging: false,
      define: {
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    })
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASS,
      {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        dialect: process.env.DB_DIALECT || 'mysql',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        timezone: '+07:00',
        define: {
          underscored: true,
          timestamps: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      }
    );

module.exports = sequelize;
