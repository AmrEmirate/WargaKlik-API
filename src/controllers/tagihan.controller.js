const { Tagihan, TagihanItem, Warga, User, Pembayaran, WargaIuran } = require('../models');
const { success, error, paginate } = require('../utils/response');
const { Op } = require('sequelize');

/**
 * GET /api/tagihan
 */
const getAllTagihan = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100); // FIX: cap at 100
    const offset = (page - 1) * limit;
    
    // Filters
    const { status, bulan, tahun, warga_id } = req.query;
    let where = {};
    
    if (status) where.status = status;
    if (bulan) where.bulan = bulan;
    if (tahun) where.tahun = tahun;
    if (warga_id) where.warga_id = warga_id;

    // Role check: if warga, only see their own tagihan
    if (req.user.role === 'warga') {
      const warga = await Warga.findOne({ where: { user_id: req.user.id } });
      if (!warga) return error(res, 'Data warga tidak ditemukan', 404);
      where.warga_id = warga.id;
    }

    const { count, rows } = await Tagihan.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        { 
          model: Warga, 
          as: 'warga',
          attributes: ['id', 'no_rumah', 'kepala_keluarga', 'is_active']
        },
        {
          model: Pembayaran,
          as: 'pembayaran',
          where: { status: 'success' },
          required: false
        }
      ],
      order: [['tahun', 'DESC'], ['bulan', 'DESC'], ['id', 'DESC']]
    });

    // Calculate global stats (all pages)
    const [summary, totalLunas, totalWarga] = await Promise.all([
      Tagihan.findOne({
        where: { ...where, status: { [Op.ne]: 'lunas' } },
        attributes: [
          [Tagihan.sequelize.fn('SUM', Tagihan.sequelize.col('total_nominal')), 'total_unpaid']
        ],
        raw: true
      }),
      Tagihan.count({ where: { ...where, status: 'lunas' } }),
      Tagihan.count({
        distinct: true,
        col: 'warga_id',
        where
      })
    ]);

    return paginate(res, rows, {
      total: count,
      page,
      total_pages: Math.ceil(count / limit),
      total_unpaid: parseFloat(summary?.total_unpaid || 0),
      total_lunas: totalLunas,
      total_warga: totalWarga
    });
  } catch (err) {
    console.error('Get tagihan error:', err);
    return error(res, 'Gagal mengambil data tagihan', 500);
  }
};

/**
 * GET /api/tagihan/:id
 */
const getTagihanById = async (req, res) => {
  try {
    const tagihan = await Tagihan.findByPk(req.params.id, {
      include: [
        { model: Warga, as: 'warga' },
        { model: TagihanItem, as: 'items', include: ['iuran_master'] },
        { model: Pembayaran, as: 'pembayaran' }
      ]
    });

    if (!tagihan) return error(res, 'Tagihan tidak ditemukan', 404);

    // Auth check for warga
    if (req.user.role === 'warga') {
      const warga = await Warga.findOne({ where: { user_id: req.user.id } });
      if (!warga || tagihan.warga_id !== warga.id) {
        return error(res, 'Akses ditolak', 403);
      }
    }

    return success(res, tagihan);
  } catch (err) {
    return error(res, 'Gagal mengambil detail tagihan', 500);
  }
};

/**
 * POST /api/tagihan/generate (Admin manual trigger)
 * Generate tagihan for specific bulan/tahun
 * Supports per-warga custom iuran amounts via warga_iuran table
 */
const generateTagihan = async (req, res) => {
  try {
    const { bulan, tahun, warga_id } = req.body;
    if (!bulan || !tahun) return error(res, 'Bulan dan tahun wajib diisi', 400);

    const { IuranMaster } = require('../models');
    
    const iuranList = await IuranMaster.findAll({ where: { is_active: true } });
    if (iuranList.length === 0) return error(res, 'Tidak ada iuran aktif', 400);

    let whereClause = { is_active: true };
    if (warga_id) {
      whereClause.id = warga_id;
    }
    const wargaList = await Warga.findAll({ where: whereClause });
    
    let created = 0;
    let skipped = 0;

    for (const warga of wargaList) {
      const existing = await Tagihan.findOne({
        where: { warga_id: warga.id, bulan, tahun }
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Get custom iuran settings for this warga
      const customIuran = await WargaIuran.findAll({
        where: { warga_id: warga.id }
      });
      const customMap = {};
      customIuran.forEach(ci => {
        customMap[ci.iuran_master_id] = ci;
      });

      const bulananIuran = iuranList.filter(i => i.periode === 'bulanan');
      const tahunanIuran = (parseInt(bulan) === 1) ? iuranList.filter(i => i.periode === 'tahunan') : [];
      const applicableIuran = [...bulananIuran, ...tahunanIuran];

      if (applicableIuran.length === 0) continue;

      // Calculate items with custom amounts
      const items = [];
      let totalNominal = 0;

      for (const iuran of applicableIuran) {
        const custom = customMap[iuran.id];
        
        // Skip if warga is excluded from this iuran
        if (custom && custom.is_excluded) continue;
        
        // Use custom nominal if set, otherwise use master nominal
        const nominal = (custom && custom.nominal_custom !== null) 
          ? parseFloat(custom.nominal_custom) 
          : parseFloat(iuran.nominal);
        
        items.push({
          iuran_master_id: iuran.id,
          nominal,
          keterangan: iuran.nama
        });
        totalNominal += nominal;
      }

      if (items.length === 0) continue;

      const tagihan = await Tagihan.create({
        warga_id: warga.id,
        bulan,
        tahun,
        periode_mulai: new Date(tahun, bulan - 1, 1),
        periode_selesai: new Date(tahun, bulan, 0),
        total_nominal: totalNominal,
        status: 'belum_bayar'
      });

      for (const item of items) {
        await TagihanItem.create({
          tagihan_id: tagihan.id,
          ...item
        });
      }

      created++;
    }

    return success(res, { created, skipped }, `Berhasil generate ${created} tagihan. ${skipped} tagihan dilewati (sudah ada).`);
  } catch (err) {
    console.error('Generate tagihan error:', err);
    return error(res, 'Gagal generate tagihan', 500);
  }
};

/**
 * POST /api/tagihan/generate-future
 * Generate future tagihan for a specific warga
 */
const generateFutureTagihan = async (req, res) => {
  try {
    const { warga_id, count } = req.body;
    const numMonths = parseInt(count) || 1;
    
    let targetWargaId = warga_id;
    if (req.user.role === 'warga') {
      const warga = await Warga.findOne({ where: { user_id: req.user.id } });
      if (!warga) return error(res, 'Data warga tidak ditemukan', 404);
      targetWargaId = warga.id;
    }

    if (!targetWargaId) return error(res, 'Warga ID wajib diisi', 400);

    const warga = await Warga.findByPk(targetWargaId);
    if (!warga) return error(res, 'Warga tidak ditemukan', 404);

    // Find the latest tagihan for this warga to determine starting point
    const latest = await Tagihan.findOne({
      where: { warga_id: targetWargaId },
      order: [['tahun', 'DESC'], ['bulan', 'DESC']]
    });

    let currentBulan, currentTahun;
    if (latest) {
      currentBulan = latest.bulan;
      currentTahun = latest.tahun;
    } else {
      const now = new Date();
      currentBulan = now.getMonth() + 1;
      currentTahun = now.getFullYear();
    }

    const { IuranMaster } = require('../models');
    const iuranList = await IuranMaster.findAll({ where: { is_active: true } });
    
    // Custom iuran settings
    const customIuran = await WargaIuran.findAll({ where: { warga_id: targetWargaId } });
    const customMap = {};
    customIuran.forEach(ci => { customMap[ci.iuran_master_id] = ci; });

    let createdCount = 0;
    for (let i = 1; i <= numMonths; i++) {
      // Increment month
      currentBulan++;
      if (currentBulan > 12) {
        currentBulan = 1;
        currentTahun++;
      }

      // Check if already exists
      const existing = await Tagihan.findOne({
        where: { warga_id: targetWargaId, bulan: currentBulan, tahun: currentTahun }
      });
      if (existing) continue;

      // Filter applicable iuran
      const bulananIuran = iuranList.filter(ir => ir.periode === 'bulanan');
      const tahunanIuran = (currentBulan === 1) ? iuranList.filter(ir => ir.periode === 'tahunan') : [];
      const applicable = [...bulananIuran, ...tahunanIuran];

      if (applicable.length === 0) continue;

      const items = [];
      let totalNominal = 0;

      for (const iuran of applicable) {
        const custom = customMap[iuran.id];
        if (custom && custom.is_excluded) continue;
        
        const nominal = (custom && custom.nominal_custom !== null) 
          ? parseFloat(custom.nominal_custom) 
          : parseFloat(iuran.nominal);
        
        items.push({
          iuran_master_id: iuran.id,
          nominal,
          keterangan: iuran.nama
        });
        totalNominal += nominal;
      }

      if (items.length === 0) continue;

      const tagihan = await Tagihan.create({
        warga_id: targetWargaId,
        bulan: currentBulan,
        tahun: currentTahun,
        periode_mulai: new Date(currentTahun, currentBulan - 1, 1),
        periode_selesai: new Date(currentTahun, currentBulan, 0),
        total_nominal: totalNominal,
        status: 'belum_bayar'
      });

      for (const item of items) {
        await TagihanItem.create({
          tagihan_id: tagihan.id,
          ...item
        });
      }
      createdCount++;
    }

    return success(res, { createdCount }, `Berhasil membuat ${createdCount} tagihan bulan depan.`);
  } catch (err) {
    console.error('Generate future tagihan error:', err);
    return error(res, 'Gagal membuat tagihan bulan depan', 500);
  }
};

module.exports = { getAllTagihan, getTagihanById, generateTagihan, generateFutureTagihan };

