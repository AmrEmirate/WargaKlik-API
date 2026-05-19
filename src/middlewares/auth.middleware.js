const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { error } = require('../utils/response');

/**
 * Verify JWT token from Authorization header
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Token tidak ditemukan', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'otp_code', 'otp_expiry'] }
    });

    if (!user) {
      return error(res, 'User tidak ditemukan', 401);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Token sudah kadaluarsa', 401);
    }
    if (err.name === 'JsonWebTokenError') {
      return error(res, 'Token tidak valid', 401);
    }
    return error(res, 'Gagal autentikasi', 401);
  }
};

module.exports = { authenticate };
