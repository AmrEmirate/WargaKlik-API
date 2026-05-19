const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notifikasi = sequelize.define('Notifikasi', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('tagihan', 'pembayaran', 'pengumuman', 'sistem'),
    defaultValue: 'sistem'
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  ref_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  ref_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  tableName: 'notifikasi'
});

module.exports = Notifikasi;
