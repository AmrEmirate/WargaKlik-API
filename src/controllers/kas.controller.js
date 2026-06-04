const { KasHarian, User, Pembayaran } = require('../models');
const { success, error, paginate } = require('../utils/response');

/**
 * GET /api/kas
 */
const getAllKas = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // FIX: cap at 100
    const offset = (page - 1) * limit;

    const { jenis, bulan, tahun } = req.query;
    let where = {};
    
    if (jenis) where.jenis = jenis;
    
    if (bulan && tahun) {
      const { Op } = require('sequelize');
      const startDate = new Date(tahun, bulan - 1, 1);
      const endDate = new Date(tahun, bulan, 0, 23, 59, 59, 999);
      where.tanggal = { [Op.between]: [startDate, endDate] };
    }

    const { count, rows } = await KasHarian.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        { model: User, as: 'pencatat', attributes: ['name'] },
        { model: Pembayaran, as: 'pembayaran', attributes: ['id', 'metode'] }
      ],
      order: [['tanggal', 'DESC'], ['id', 'DESC']]
    });

    // Get summary for the query
    const summaryMasuk = await KasHarian.sum('nominal', { where: { ...where, jenis: 'masuk' } });
    const summaryKeluar = await KasHarian.sum('nominal', { where: { ...where, jenis: 'keluar' } });

    return paginate(res, rows, {
      total: count,
      page,
      total_pages: Math.ceil(count / limit),
      summary: {
        masuk: summaryMasuk || 0,
        keluar: summaryKeluar || 0,
        saldo: (summaryMasuk || 0) - (summaryKeluar || 0)
      }
    });
  } catch (err) {
    console.error('Get kas error:', err);
    return error(res, 'Gagal mengambil data kas', 500);
  }
};

/**
 * POST /api/kas
 * Create manual cash entry (usually expense)
 */
const createKas = async (req, res) => {
  try {
    const { tanggal, jenis, kategori, keterangan, nominal } = req.body;
    let bukti_url = null;
    if (req.file) {
      bukti_url = `/uploads/${req.file.filename}`;
    }

    if (parseFloat(nominal) <= 0) {
      return error(res, 'Nominal harus lebih besar dari 0', 400);
    }

    if (jenis === 'keluar') {
      const summaryMasuk = await KasHarian.sum('nominal', { where: { jenis: 'masuk' } }) || 0;
      const summaryKeluar = await KasHarian.sum('nominal', { where: { jenis: 'keluar' } }) || 0;
      const saldo = summaryMasuk - summaryKeluar;
      if (parseFloat(nominal) > saldo) {
        return error(res, 'Nominal pengeluaran melebihi saldo kas saat ini', 400);
      }
    }

    const kas = await KasHarian.create({
      tanggal,
      jenis,
      kategori,
      keterangan,
      nominal,
      bukti_url,
      dicatat_oleh: req.user.id
    });

    return success(res, kas, 'Data kas berhasil dicatat', 201);
  } catch (err) {
    console.error('Create kas error:', err);
    return error(res, 'Gagal mencatat kas', 500);
  }
};

/**
 * GET /api/kas/stats
 * Get monthly stats for charts (last 6 months)
 */
const getStats = async (req, res) => {
  try {
    const sequelize = require('../config/database');
    const { Op } = require('sequelize');
    
    // Get stats for last 6 months
    const stats = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      
      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 0, 23, 59, 59, 999);

      const masuk = await KasHarian.sum('nominal', {
        where: {
          jenis: 'masuk',
          tanggal: { [Op.between]: [startDate, endDate] }
        }
      }) || 0;

      const keluar = await KasHarian.sum('nominal', {
        where: {
          jenis: 'keluar',
          tanggal: { [Op.between]: [startDate, endDate] }
        }
      }) || 0;

      stats.push({
        month: d.toLocaleString('id-ID', { month: 'short' }),
        masuk,
        keluar
      });
    }

    return success(res, stats);
  } catch (err) {
    console.error('Get kas stats error:', err);
    return error(res, 'Gagal mengambil statistik kas', 500);
  }
};

module.exports = { getAllKas, createKas, getStats };
