const { WargaIuran, IuranMaster, Warga } = require('../models');
const { success, error } = require('../utils/response');

/**
 * GET /api/warga-iuran/:warga_id
 * Get all iuran settings for a specific warga
 * Returns master iuran list with custom overrides merged
 */
const getWargaIuran = async (req, res) => {
  try {
    const { warga_id } = req.params;

    const warga = await Warga.findByPk(warga_id);
    if (!warga) return error(res, 'Warga tidak ditemukan', 404);

    // Get all active master iuran
    const masterList = await IuranMaster.findAll({ where: { is_active: true }, order: [['id', 'ASC']] });

    // Get custom settings for this warga
    const customList = await WargaIuran.findAll({ where: { warga_id } });
    const customMap = {};
    customList.forEach(c => { customMap[c.iuran_master_id] = c; });

    // Merge: show all master iuran with custom overrides
    const result = masterList.map(master => {
      const custom = customMap[master.id];
      return {
        iuran_master_id: master.id,
        nama: master.nama,
        nominal_master: parseFloat(master.nominal),
        periode: master.periode,
        nominal_custom: custom ? (custom.nominal_custom !== null ? parseFloat(custom.nominal_custom) : null) : null,
        is_excluded: custom ? custom.is_excluded : false,
        // The effective nominal that will be used for tagihan
        nominal_efektif: custom && custom.is_excluded 
          ? 0 
          : (custom && custom.nominal_custom !== null) 
            ? parseFloat(custom.nominal_custom) 
            : parseFloat(master.nominal),
        has_custom: !!custom
      };
    });

    return success(res, {
      warga: { id: warga.id, no_rumah: warga.no_rumah, kepala_keluarga: warga.kepala_keluarga },
      iuran: result,
      total_efektif: result.reduce((sum, i) => sum + i.nominal_efektif, 0)
    });
  } catch (err) {
    console.error('Get warga iuran error:', err);
    return error(res, 'Gagal mengambil data iuran warga', 500);
  }
};

/**
 * PUT /api/warga-iuran/:warga_id
 * Set custom iuran for a warga (bulk upsert)
 * Body: { items: [{ iuran_master_id, nominal_custom, is_excluded }] }
 */
const setWargaIuran = async (req, res) => {
  try {
    const { warga_id } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return error(res, 'Data items wajib diisi', 400);
    }

    const warga = await Warga.findByPk(warga_id);
    if (!warga) return error(res, 'Warga tidak ditemukan', 404);

    for (const item of items) {
      const { iuran_master_id, nominal_custom, is_excluded } = item;

      // Check if custom entry exists
      const existing = await WargaIuran.findOne({
        where: { warga_id, iuran_master_id }
      });

      // If no custom value and not excluded, delete override (revert to master)
      if (nominal_custom === null && !is_excluded) {
        if (existing) await existing.destroy();
        continue;
      }

      if (existing) {
        existing.nominal_custom = nominal_custom;
        existing.is_excluded = is_excluded || false;
        await existing.save();
      } else {
        await WargaIuran.create({
          warga_id,
          iuran_master_id,
          nominal_custom,
          is_excluded: is_excluded || false
        });
      }
    }

    return success(res, null, 'Pengaturan iuran warga berhasil disimpan');
  } catch (err) {
    console.error('Set warga iuran error:', err);
    return error(res, 'Gagal menyimpan pengaturan iuran warga', 500);
  }
};

module.exports = { getWargaIuran, setWargaIuran };
