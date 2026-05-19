const cron = require('node-cron');
const { Warga, IuranMaster, Tagihan, TagihanItem, WargaIuran } = require('../models');

/**
 * Generate monthly tagihan for all active warga
 * Runs on the 1st of every month at 00:01
 * Supports per-warga custom iuran amounts via warga_iuran table
 */
const setupGenerateTagihan = () => {
  cron.schedule('1 0 1 * *', async () => {
    console.log('⏰ [CRON] Generating tagihan otomatis...');
    try {
      const now = new Date();
      const bulan = now.getMonth() + 1;
      const tahun = now.getFullYear();

      // Get all active iuran
      const iuranList = await IuranMaster.findAll({ where: { is_active: true } });
      if (iuranList.length === 0) {
        console.log('⏰ [CRON] Tidak ada iuran aktif, skip.');
        return;
      }

      // Get all active warga
      const wargaList = await Warga.findAll({ where: { is_active: true } });

      let created = 0;
      let skipped = 0;

      for (const warga of wargaList) {
        // Check if tagihan already exists
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

        // Calculate applicable iuran
        const bulananIuran = iuranList.filter(i => i.periode === 'bulanan');
        const tahunanIuran = bulan === 1 ? iuranList.filter(i => i.periode === 'tahunan') : [];
        const applicableIuran = [...bulananIuran, ...tahunanIuran];

        if (applicableIuran.length === 0) continue;

        // Build items with custom amounts
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

        // Create tagihan
        const tagihan = await Tagihan.create({
          warga_id: warga.id,
          bulan,
          tahun,
          periode_mulai: new Date(tahun, bulan - 1, 1),
          periode_selesai: new Date(tahun, bulan, 0),
          total_nominal: totalNominal,
          status: 'belum_bayar'
        });

        // Create tagihan items
        for (const item of items) {
          await TagihanItem.create({
            tagihan_id: tagihan.id,
            ...item
          });
        }

        created++;
      }

      console.log(`[CRON] Tagihan generated: ${created} created, ${skipped} skipped`);
    } catch (err) {
      console.error('[CRON] Generate tagihan error:', err);
    }
  });

  console.log('Cron: Generate tagihan scheduled (1st of every month, 00:01)');
};

module.exports = setupGenerateTagihan;
