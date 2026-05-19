const { Notifikasi } = require('../models');
const { success, error, paginate } = require('../utils/response');

/**
 * GET /api/notifikasi
 */
const getMyNotifikasi = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await Notifikasi.findAndCountAll({
      where: { user_id: req.user.id },
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    const unreadCount = await Notifikasi.count({
      where: { user_id: req.user.id, is_read: false }
    });

    return paginate(res, rows, {
      total: count,
      page,
      total_pages: Math.ceil(count / limit),
      unread_count: unreadCount
    });
  } catch (err) {
    return error(res, 'Gagal mengambil notifikasi', 500);
  }
};

/**
 * PUT /api/notifikasi/:id/read
 */
const markAsRead = async (req, res) => {
  try {
    const notifikasi = await Notifikasi.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });

    if (!notifikasi) return error(res, 'Notifikasi tidak ditemukan', 404);

    await notifikasi.update({ is_read: true });
    return success(res, null, 'Notifikasi dibaca');
  } catch (err) {
    return error(res, 'Gagal mengupdate notifikasi', 500);
  }
};

/**
 * PUT /api/notifikasi/read-all
 */
const markAllAsRead = async (req, res) => {
  try {
    await Notifikasi.update(
      { is_read: true },
      { where: { user_id: req.user.id, is_read: false } }
    );
    return success(res, null, 'Semua notifikasi dibaca');
  } catch (err) {
    return error(res, 'Gagal mengupdate notifikasi', 500);
  }
};

module.exports = { getMyNotifikasi, markAsRead, markAllAsRead };
