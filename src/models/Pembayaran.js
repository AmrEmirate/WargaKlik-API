const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pembayaran = sequelize.define('Pembayaran', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  tagihan_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tagihan',
      key: 'id'
    }
  },
  dicatat_oleh: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  metode: {
    type: DataTypes.ENUM('midtrans', 'manual'),
    allowNull: false
  },
  jumlah_bayar: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  tanggal_bayar: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  reference_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'success', 'failed', 'expired'),
    defaultValue: 'pending'
  },
  bukti_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  catatan: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'pembayaran'
});

module.exports = Pembayaran;
