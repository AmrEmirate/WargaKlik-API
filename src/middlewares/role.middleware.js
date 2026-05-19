const { error } = require('../utils/response');

/**
 * Role-based authorization middleware
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Silakan login terlebih dahulu', 401);
    }
    if (!roles.includes(req.user.role)) {
      return error(res, 'Anda tidak memiliki akses untuk fitur ini', 403);
    }
    next();
  };
};

// Shortcut middlewares
const wargaOnly = authorize('warga');
const sekretarisUp = authorize('sekretaris', 'rt', 'wakil_rt');
const bendaharaUp = authorize('bendahara', 'rt', 'wakil_rt');
const pengurusOnly = authorize('sekretaris', 'bendahara', 'rt', 'wakil_rt');
const rtOnly = authorize('rt', 'wakil_rt');

module.exports = { authorize, wargaOnly, sekretarisUp, bendaharaUp, pengurusOnly, rtOnly };
