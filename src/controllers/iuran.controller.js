const { IuranMaster } = require('../models');
const { success, error } = require('../utils/response');

/**
 * GET /api/iuran
 */
const getAllIuran = async (req, res) => {
  try {
    const activeOnly = req.query.active === 'true';
    const where = activeOnly ? { is_active: true } : {};
    
    const iuran = await IuranMaster.findAll({ where });
    return success(res, iuran);
  } catch (err) {
    return error(res, 'Gagal mengambil data iuran', 500);
  }
};

/**
 * POST /api/iuran
 */
const createIuran = async (req, res) => {
  try {
    const { nama, nominal, periode } = req.body;
    
    const iuran = await IuranMaster.create({
      nama,
      nominal,
      periode: periode || 'bulanan',
      is_active: true
    });
    
    return success(res, iuran, 'Iuran berhasil ditambahkan', 201);
  } catch (err) {
    return error(res, 'Gagal menambahkan iuran', 500);
  }
};

/**
 * PUT /api/iuran/:id
 */
const updateIuran = async (req, res) => {
  try {
    const { nama, nominal, periode, is_active } = req.body;
    const iuran = await IuranMaster.findByPk(req.params.id);
    
    if (!iuran) return error(res, 'Iuran tidak ditemukan', 404);
    
    await iuran.update({
      nama: nama || iuran.nama,
      nominal: nominal || iuran.nominal,
      periode: periode || iuran.periode,
      is_active: is_active !== undefined ? is_active : iuran.is_active
    });
    
    return success(res, iuran, 'Iuran berhasil diupdate');
  } catch (err) {
    return error(res, 'Gagal mengupdate iuran', 500);
  }
};

/**
 * DELETE /api/iuran/:id
 */
const deleteIuran = async (req, res) => {
  try {
    const { TagihanItem, WargaIuran } = require('../models');
    const iuran = await IuranMaster.findByPk(req.params.id);
    
    if (!iuran) return error(res, 'Iuran tidak ditemukan', 404);
    
    // Check if used in tagihan items or warga overrides
    const usedInTagihan = await TagihanItem.count({ where: { iuran_master_id: req.params.id } });
    const usedInWarga = await WargaIuran.count({ where: { iuran_master_id: req.params.id } });
    
    if (usedInTagihan > 0 || usedInWarga > 0) {
      return error(res, 'Iuran tidak bisa dihapus karena sudah memiliki riwayat transaksi atau sedang digunakan oleh warga. Silakan non-aktifkan saja.', 400);
    }
    
    await iuran.destroy();
    return success(res, null, 'Iuran berhasil dihapus');
  } catch (err) {
    return error(res, 'Gagal menghapus iuran', 500);
  }
};

module.exports = { getAllIuran, createIuran, updateIuran, deleteIuran };
