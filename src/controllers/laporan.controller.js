const { Laporan, User } = require('../models');
const { success, error, paginate } = require('../utils/response');
const pdfService = require('../services/pdf.service');

/**
 * GET /api/laporan
 */
const getAllLaporan = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100); // FIX: cap at 100
    const offset = (page - 1) * limit;

    const { jenis, status, tahun } = req.query;
    let where = {};

    if (jenis) where.jenis = jenis;
    if (status) where.status = status;
    if (tahun) where.tahun = tahun;

    // Warga can only see approved reports
    if (req.user.role === 'warga') {
      where.status = 'approved';
    }

    const { count, rows } = await Laporan.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        { model: User, as: 'pembuat', attributes: ['name', 'role'] },
        { model: User, as: 'penyetuju', attributes: ['name', 'role'] }
      ],
      order: [['tahun', 'DESC'], ['bulan', 'DESC']]
    });

    return paginate(res, rows, {
      total: count,
      page,
      total_pages: Math.ceil(count / limit)
    });
  } catch (err) {
    return error(res, 'Gagal mengambil data laporan', 500);
  }
};

/**
 * POST /api/laporan/generate
 */
const generateLaporan = async (req, res) => {
  try {
    const { jenis, bulan, tahun } = req.body;
    if (!jenis || !tahun) return error(res, 'Jenis dan tahun wajib diisi', 400);
    if (jenis === 'bulanan' && !bulan) return error(res, 'Bulan wajib diisi untuk laporan bulanan', 400);

    // Cek apakah laporan sudah ada
    const existing = await Laporan.findOne({
      where: { jenis, tahun, bulan: (jenis === 'bulanan' || jenis === 'tunggakan') ? bulan : null }
    });

    if (existing) {
      return error(res, 'Laporan untuk periode tersebut sudah dibuat', 400);
    }

    let fileUrl = null;
    if (jenis === 'bulanan') {
      fileUrl = await pdfService.generateLaporanBulanan(bulan, tahun);
    } else if (jenis === 'tahunan') {
      fileUrl = await pdfService.generateLaporanTahunan(tahun);
    } else if (jenis === 'tunggakan') {
      fileUrl = await pdfService.generateLaporanTunggakan(bulan, tahun);
    } else {
      return error(res, 'Jenis laporan tidak valid', 400);
    }

    const isOfficial = ['rt', 'wakil_rt'].includes(req.user.role);
    
    const laporan = await Laporan.create({
      jenis,
      bulan: (jenis === 'bulanan' || jenis === 'tunggakan') ? bulan : null,
      tahun,
      file_url: fileUrl,
      pembuat_id: req.user.id,
      status: isOfficial ? 'approved' : 'draft',
      penyetuju_id: isOfficial ? req.user.id : null,
      disetujui_at: isOfficial ? new Date() : null
    });

    return success(res, laporan, 'Laporan berhasil digenerate', 201);
  } catch (err) {
    console.error('Generate laporan error:', err);
    return error(res, 'Gagal generate laporan', 500);
  }
};

/**
 * PUT /api/laporan/:id/approve
 */
const approveLaporan = async (req, res) => {
  try {
    const { komentar } = req.body || {};
    const laporan = await Laporan.findByPk(req.params.id);

    if (!laporan) return error(res, 'Laporan tidak ditemukan', 404);
    if (laporan.status === 'approved') return error(res, 'Laporan sudah disetujui', 400);

    if (req.user.role !== 'rt' && req.user.role !== 'wakil_rt') {
      return error(res, 'Hanya RT atau Wakil RT yang dapat menyetujui laporan resmi', 403);
    }

    await laporan.update({
      status: 'approved',
      penyetuju_id: req.user.id,
      disetujui_at: new Date(),
      komentar: komentar || laporan.komentar
    });

    return success(res, laporan, 'Laporan berhasil disetujui');
  } catch (err) {
    console.error('Approve laporan error details:', {
      error: err.message,
      stack: err.stack,
      user: req.user ? { id: req.user.id, role: req.user.role } : 'no user'
    });
    return error(res, `Gagal menyetujui laporan: ${err.message}`, 500);
  }
};

/**
 * DELETE /api/laporan/:id
 */
const deleteLaporan = async (req, res) => {
  try {
    const laporan = await Laporan.findByPk(req.params.id);
    if (!laporan) return error(res, 'Laporan tidak ditemukan', 404);
    
    // Only allow deletion if draft
    if (laporan.status === 'approved') return error(res, 'Laporan yang sudah disetujui tidak dapat dihapus', 400);

    await laporan.destroy();
    return success(res, null, 'Laporan berhasil dihapus');
  } catch (err) {
    return error(res, 'Gagal menghapus laporan', 500);
  }
};

module.exports = { getAllLaporan, generateLaporan, approveLaporan, deleteLaporan };
