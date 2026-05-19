const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Warga = sequelize.define('Warga', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  no_rumah: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  kepala_keluarga: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  no_kk: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  jumlah_anggota: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  status_rumah: {
    type: DataTypes.ENUM('tetap', 'kontrak', 'kosong'),
    defaultValue: 'tetap'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'warga'
});

module.exports = Warga;
