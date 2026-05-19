const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Tagihan = sequelize.define('Tagihan', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  warga_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'warga',
      key: 'id'
    }
  },
  bulan: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tahun: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  periode_mulai: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  periode_selesai: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  total_nominal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('belum_bayar', 'lunas'),
    defaultValue: 'belum_bayar'
  }
}, {
  tableName: 'tagihan',
  indexes: [
    {
      unique: true,
      fields: ['warga_id', 'bulan', 'tahun']
    }
  ]
});

module.exports = Tagihan;
