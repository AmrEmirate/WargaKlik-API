const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WargaIuran = sequelize.define('warga_iuran', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  warga_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  iuran_master_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  nominal_custom: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'Nominal khusus untuk warga ini. NULL = pakai nominal master'
  },
  is_excluded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Jika true, warga ini tidak dikenakan iuran ini'
  }
}, {
  tableName: 'warga_iuran',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['warga_id', 'iuran_master_id']
    }
  ]
});

module.exports = WargaIuran;
