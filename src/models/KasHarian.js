const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const KasHarian = sequelize.define('KasHarian', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  pembayaran_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'pembayaran',
      key: 'id'
    }
  },
  tanggal: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  jenis: {
    type: DataTypes.ENUM('masuk', 'keluar'),
    allowNull: false
  },
  kategori: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  keterangan: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  nominal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  bukti_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  dicatat_oleh: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'kas_harian'
});

module.exports = KasHarian;
