const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * RefreshToken Model
 * Stores issued refresh tokens to support blacklisting/revocation.
 * On logout or password change, token is deleted from this table.
 */
const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  token_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    comment: 'SHA-256 hash of the refresh token'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'refresh_tokens',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['token_hash'] },
    { fields: ['expires_at'] }
  ]
});

module.exports = RefreshToken;
