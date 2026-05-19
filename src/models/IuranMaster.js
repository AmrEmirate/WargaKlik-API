const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const IuranMaster = sequelize.define('IuranMaster', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  nama: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  nominal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  periode: {
    type: DataTypes.ENUM('bulanan', 'tahunan'),
    defaultValue: 'bulanan'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'iuran_master'
});

module.exports = IuranMaster;
