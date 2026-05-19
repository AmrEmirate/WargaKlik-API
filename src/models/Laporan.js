const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Laporan = sequelize.define('Laporan', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  file_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  bulan: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  tahun: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  jenis: {
    type: DataTypes.ENUM('bulanan', 'tahunan', 'tunggakan'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'approved'),
    defaultValue: 'draft'
  },
  komentar: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  pembuat_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  penyetuju_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  disetujui_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'laporan'
});

module.exports = Laporan;
