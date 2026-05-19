const { Pengumuman, User } = require('../models');
const { success, error, paginate } = require('../utils/response');
const notificationService = require('../services/notification.service');
const xss = require('xss');

/**
 * GET /api/pengumuman
 */
const getAllPengumuman = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let where = {};
    
    // Warga only sees published announcements targeting them or everyone
    if (req.user.role === 'warga') {
      where.is_published = true;
      where.target_role = ['semua', 'warga'];
    }

    const { count, rows } = await Pengumuman.findAndCountAll({
      where,
      limit,
      offset,
      include: [{ model: User, as: 'author', attributes: ['name', 'role'] }],
      order: [['created_at', 'DESC']]
    });

    return paginate(res, rows, {
      total: count,
      page,
      total_pages: Math.ceil(count / limit)
    });
  } catch (err) {
    return error(res, 'Gagal mengambil pengumuman', 500);
  }
};

/**
 * POST /api/pengumuman
 */
const createPengumuman = async (req, res) => {
  try {
    const { title, content, type, target_role, is_published } = req.body;

    const pengumuman = await Pengumuman.create({
      title: xss(title),
      content: xss(content),
      type: type || 'info',
      target_role: target_role || 'semua',
      author_id: req.user.id,
      is_published: is_published || false
    });

    if (pengumuman.is_published) {
      await notificationService.notifyAll(pengumuman.target_role, {
        title: `Pengumuman: ${pengumuman.title}`,
        message: pengumuman.content,
        type: 'pengumuman',
        refId: pengumuman.id,
        refType: 'pengumuman',
        channels: ['inapp'] // Too spammy for email/wa unless it's 'penting/darurat'
      });
    }

    return success(res, pengumuman, 'Pengumuman berhasil dibuat', 201);
  } catch (err) {
    return error(res, 'Gagal membuat pengumuman', 500);
  }
};

/**
 * PUT /api/pengumuman/:id
 */
const updatePengumuman = async (req, res) => {
  try {
    const { title, content, type, target_role, is_published } = req.body;
    const pengumuman = await Pengumuman.findByPk(req.params.id);

    if (!pengumuman) return error(res, 'Pengumuman tidak ditemukan', 404);

    const wasPublished = pengumuman.is_published;

    await pengumuman.update({
      title: title ? xss(title) : pengumuman.title,
      content: content ? xss(content) : pengumuman.content,
      type: type || pengumuman.type,
      target_role: target_role || pengumuman.target_role,
      is_published: is_published !== undefined ? is_published : pengumuman.is_published
    });

    // Notify if newly published
    if (!wasPublished && pengumuman.is_published) {
      await notificationService.notifyAll(pengumuman.target_role, {
        title: `Pengumuman: ${pengumuman.title}`,
        message: pengumuman.content,
        type: 'pengumuman',
        refId: pengumuman.id,
        refType: 'pengumuman',
        channels: ['inapp']
      });
    }

    return success(res, pengumuman, 'Pengumuman berhasil diupdate');
  } catch (err) {
    return error(res, 'Gagal mengupdate pengumuman', 500);
  }
};

/**
 * DELETE /api/pengumuman/:id
 */
const deletePengumuman = async (req, res) => {
  try {
    const pengumuman = await Pengumuman.findByPk(req.params.id);
    if (!pengumuman) return error(res, 'Pengumuman tidak ditemukan', 404);

    await pengumuman.destroy();
    return success(res, null, 'Pengumuman berhasil dihapus');
  } catch (err) {
    return error(res, 'Gagal menghapus pengumuman', 500);
  }
};

module.exports = { getAllPengumuman, createPengumuman, updatePengumuman, deletePengumuman };
