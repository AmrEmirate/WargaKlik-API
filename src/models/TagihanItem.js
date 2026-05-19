const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TagihanItem = sequelize.define('TagihanItem', {
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
  iuran_master_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'iuran_master',
      key: 'id'
    }
  },
  nominal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  keterangan: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'tagihan_items',
  timestamps: false
});

module.exports = TagihanItem;
