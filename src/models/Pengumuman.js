const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pengumuman = sequelize.define('Pengumuman', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('info', 'penting', 'darurat'),
    defaultValue: 'info'
  },
  target_role: {
    type: DataTypes.ENUM('semua', 'warga', 'pengurus'),
    defaultValue: 'semua'
  },
  author_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  is_published: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'pengumuman'
});

module.exports = Pengumuman;
