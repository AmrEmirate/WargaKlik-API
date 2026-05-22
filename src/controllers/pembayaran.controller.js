const { Pembayaran, Tagihan, KasHarian, User, Warga } = require('../models');
const { success, error, paginate } = require('../utils/response');
const midtransService = require('../services/midtrans.service');
const notificationService = require('../services/notification.service');
const sequelize = require('../config/database');

/**
 * GET /api/pembayaran
 */
const getAllPembayaran = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100); // FIX: cap at 100
    const offset = (page - 1) * limit;

    let where = {};
    if (req.user.role === 'warga') {
      const warga = await Warga.findOne({ where: { user_id: req.user.id } });
      if (!warga) return error(res, 'Data warga tidak ditemukan', 404);
      
      const tagihans = await Tagihan.findAll({ where: { warga_id: warga.id }, attributes: ['id'] });
      const tagihanIds = tagihans.map(t => t.id);
      where.tagihan_id = tagihanIds;
    }

    const { count, rows } = await Pembayaran.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        { 
          model: Tagihan, 
          as: 'tagihan',
          include: [{ model: Warga, as: 'warga', attributes: ['no_rumah', 'kepala_keluarga'] }]
        },
        { model: User, as: 'pencatat', attributes: ['name'] }
      ],
      order: [['tanggal_bayar', 'DESC'], ['id', 'DESC']]
    });

    return paginate(res, rows, {
      total: count,
      page,
      total_pages: Math.ceil(count / limit)
    });
  } catch (err) {
    console.error('Get pembayaran error:', err);
    return error(res, 'Gagal mengambil data pembayaran', 500);
  }
};

/**
 * POST /api/pembayaran/midtrans/snap
 * Request Snap Token for a Tagihan
 */
const createMidtransTransaction = async (req, res) => {
  try {
    const { tagihan_ids, tagihan_id } = req.body;
    const rawIds = tagihan_ids || tagihan_id;
    const ids = Array.isArray(rawIds) ? rawIds : [rawIds];
    
    if (!ids || ids.length === 0) return error(res, 'Tagihan ID tidak boleh kosong', 400);

    const tagihanList = await Tagihan.findAll({
      where: { id: ids },
      include: [
        { model: Warga, as: 'warga', include: [{ model: User, as: 'user' }] },
        { 
          model: Pembayaran, 
          as: 'pembayaran', 
          where: { status: 'success' }, 
          required: false 
        }
      ]
    });

    if (tagihanList.length === 0) return error(res, 'Tagihan tidak ditemukan', 404);
    
    // Check if all tagihan belong to the same warga (security check)
    const wargaId = tagihanList[0].warga_id;
    if (tagihanList.some(t => t.warga_id !== wargaId)) {
      return error(res, 'Tagihan harus berasal dari warga yang sama', 400);
    }

    // Auth check for warga
    if (req.user.role === 'warga' && tagihanList[0].warga.user_id !== req.user.id) {
      return error(res, 'Akses ditolak', 403);
    }

    if (tagihanList.some(t => t.status === 'lunas')) {
      return error(res, 'Salah satu tagihan sudah lunas', 400);
    }

    // Generate unique order ID for this bulk transaction
    const orderId = `RAPEL-${Date.now()}-${wargaId}`;
    let totalGrossAmount = 0;
    const itemDetails = [];

    for (const tagihan of tagihanList) {
      const paidAmount = tagihan.pembayaran?.reduce((sum, p) => sum + parseFloat(p.jumlah_bayar), 0) || 0;
      const remaining = parseFloat(tagihan.total_nominal) - paidAmount;
      
      if (remaining <= 0) continue;

      const amount = Math.round(remaining);
      totalGrossAmount += amount;
      itemDetails.push({
        id: `TAGIHAN-${tagihan.id}`,
        price: amount,
        quantity: 1,
        name: `Iuran RT ${tagihan.bulan}/${tagihan.tahun}`
      });
    }

    if (totalGrossAmount <= 0) return error(res, 'Total pembayaran tidak valid', 400);

    const customerDetails = {
      first_name: tagihanList[0].warga.kepala_keluarga,
      email: tagihanList[0].warga.user?.email || '',
      phone: tagihanList[0].warga.user?.no_telepon || ''
    };

    const snapData = await midtransService.createTransaction(orderId, totalGrossAmount, customerDetails, itemDetails);

    // Record pending payments for each tagihan
    for (const tagihan of tagihanList) {
      await Pembayaran.create({
        tagihan_id: tagihan.id,
        metode: 'midtrans',
        jumlah_bayar: tagihan.total_nominal,
        tanggal_bayar: new Date(),
        reference_id: orderId,
        status: 'pending'
      });
    }

    return success(res, snapData, 'Token Midtrans berhasil digenerate');
  } catch (err) {
    console.error('Midtrans create bulk error:', err);
    return error(res, 'Gagal membuat transaksi rapel', 500);
  }
};

/**
 * POST /api/pembayaran/midtrans/webhook
 */
const midtransWebhook = async (req, res) => {
  try {
    const { order_id, transaction_status, status_code, gross_amount, signature_key } = req.body;

    const calculatedSignature = midtransService.verifySignature(order_id, status_code, gross_amount);
    if (calculatedSignature !== signature_key) {
      return res.status(403).json({ message: 'Invalid signature' });
    }

    // Find ALL pembayaran records with this reference_id
    const pembayaranList = await Pembayaran.findAll({ 
      where: { reference_id: order_id },
      include: [{ 
        model: Tagihan, 
        as: 'tagihan',
        include: [{ model: Warga, as: 'warga', include: [{ model: User, as: 'user' }] }]
      }]
    });

    if (pembayaranList.length === 0) {
      return res.status(404).json({ message: 'Pembayaran tidak ditemukan' });
    }

    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      await sequelize.transaction(async (t) => {
        for (const pembayaran of pembayaranList) {
          const tagihan = pembayaran.tagihan;
          
          await pembayaran.update({ status: 'success' }, { transaction: t });
          await tagihan.update({ status: 'lunas' }, { transaction: t });
          
          await KasHarian.create({
            pembayaran_id: pembayaran.id,
            tanggal: new Date(),
            jenis: 'masuk',
            kategori: 'iuran',
            keterangan: `Pembayaran Iuran RT ${tagihan.bulan}/${tagihan.tahun} - ${tagihan.warga.no_rumah} (Rapel)`,
            nominal: pembayaran.jumlah_bayar,
            dicatat_oleh: tagihan.warga.user_id || 1 // Fallback to admin if no user
          }, { transaction: t });

          // Notify per tagihan or once for all? 
          // Per tagihan is clearer for the user to see which months are paid.
          if (tagihan.warga.user_id) {
            await notificationService.notify(tagihan.warga.user_id, {
              title: 'Pembayaran Berhasil',
              message: `Pembayaran iuran bulan ${tagihan.bulan}/${tagihan.tahun} sebesar Rp ${Number(pembayaran.jumlah_bayar).toLocaleString('id-ID')} telah berhasil.`,
              type: 'pembayaran',
              amount: pembayaran.jumlah_bayar,
              refId: pembayaran.id,
              refType: 'pembayaran',
              channels: ['inapp', 'email', 'whatsapp']
            });
          }
        }
      });
    } else if (transaction_status === 'expire' || transaction_status === 'cancel' || transaction_status === 'deny') {
      const finalStatus = transaction_status === 'expire' ? 'expired' : 'failed';
      await Pembayaran.update({ status: finalStatus }, { where: { reference_id: order_id } });
    }

    return res.status(200).json({ message: 'Webhook processed' });
  } catch (err) {
    console.error('Midtrans webhook error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/pembayaran/manual
 */
const createManualPayment = async (req, res) => {
  try {
    let { tagihan_ids, jumlah_bayar, tanggal_bayar, catatan } = req.body;
    
    if (!tanggal_bayar) {
      tanggal_bayar = new Date().toISOString().split('T')[0];
    } else {
      try {
        tanggal_bayar = new Date(tanggal_bayar).toISOString().split('T')[0];
      } catch (e) {
        tanggal_bayar = new Date().toISOString().split('T')[0];
      }
    }

    const ids = Array.isArray(tagihan_ids) ? tagihan_ids : [tagihan_ids];
    
    if (!ids || ids.length === 0) return error(res, 'Pilih minimal satu tagihan untuk dibayar', 400);
    if (!jumlah_bayar || parseFloat(jumlah_bayar) <= 0) return error(res, 'Jumlah bayar tidak valid', 400);

    let bukti_url = null;
    if (req.file) {
      bukti_url = `/uploads/${req.file.filename}`;
    }

    const tagihanList = await Tagihan.findAll({
      where: { id: ids },
      include: [{ model: Warga, as: 'warga' }]
    });

    if (tagihanList.length === 0) return error(res, 'Tagihan tidak ditemukan', 404);

    await sequelize.transaction(async (t) => {
      let remainingPayment = parseFloat(jumlah_bayar);

      for (const tagihan of tagihanList) {
        if (remainingPayment <= 0) break;

        const toPay = Math.min(remainingPayment, parseFloat(tagihan.total_nominal));
        
        const pembayaran = await Pembayaran.create({
          tagihan_id: tagihan.id,
          dicatat_oleh: req.user.id,
          metode: 'manual',
          jumlah_bayar: toPay,
          tanggal_bayar,
          status: 'success',
          bukti_url,
          catatan: ids.length > 1 ? `${catatan || ''} (Pembayaran Rapel)`.trim() : catatan
        }, { transaction: t });

        if (toPay >= parseFloat(tagihan.total_nominal)) {
          await tagihan.update({ status: 'lunas' }, { transaction: t });
        }

        await KasHarian.create({
          pembayaran_id: pembayaran.id,
          tanggal: tanggal_bayar,
          jenis: 'masuk',
          kategori: 'iuran',
          keterangan: `Penerimaan Tunai: Iuran RT ${tagihan.bulan}/${tagihan.tahun} - ${tagihan.warga.no_rumah} ${ids.length > 1 ? '(Rapel)' : ''}`,
          nominal: toPay,
          bukti_url,
          dicatat_oleh: req.user.id
        }, { transaction: t });

        remainingPayment -= toPay;
      }
    });

    // Send consolidated notification outside transaction to improve speed and reliability
    try {
      const firstTagihan = tagihanList[0];
      if (firstTagihan.warga.user_id) {
        const totalPaid = tagihanList.reduce((sum, t) => sum + parseFloat(t.total_nominal), 0);
        const periods = tagihanList.map(t => `${t.bulan}/${t.tahun}`).join(', ');
        
        notificationService.notify(firstTagihan.warga.user_id, {
          title: 'Pembayaran Diterima',
          message: tagihanList.length > 1 
            ? `Pembayaran iuran manual (Rapel) untuk periode [${periods}] sebesar Rp ${Number(totalPaid).toLocaleString('id-ID')} telah dicatat oleh pengurus.`
            : `Pembayaran iuran manual bulan ${firstTagihan.bulan}/${firstTagihan.tahun} sebesar Rp ${Number(totalPaid).toLocaleString('id-ID')} telah dicatat oleh pengurus.`,
          type: 'pembayaran',
          amount: totalPaid,
          channels: ['inapp', 'email', 'whatsapp']
        }).catch(err => console.error('Delayed notification error:', err));
      }
    } catch (notifyErr) {
      console.error('Notification logic error:', notifyErr);
    }

    return success(res, null, `Berhasil mencatat pembayaran untuk ${tagihanList.length} tagihan`, 201);
  } catch (err) {
    console.error('Manual payment bulk error:', err);
    return error(res, 'Gagal mencatat pembayaran rapel', 500);
  }
};

/**
 * POST /api/pembayaran/midtrans/sync
 * Manually sync transaction status from Midtrans (useful for localhost testing)
 */
const syncMidtransTransaction = async (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id) return error(res, 'Order ID wajib diisi', 400);

    const statusResponse = await midtransService.checkStatus(order_id);
    const { transaction_status, status_code, gross_amount, signature_key } = statusResponse;

    // Trigger the same logic as webhook but directly
    // Instead of verifying signature (since we got it straight from Midtrans), we can just process it
    const pembayaranList = await Pembayaran.findAll({ 
      where: { reference_id: order_id },
      include: [{ 
        model: Tagihan, 
        as: 'tagihan',
        include: [{ model: Warga, as: 'warga', include: [{ model: User, as: 'user' }] }]
      }]
    });

    if (pembayaranList.length === 0) {
      return res.status(404).json({ message: 'Pembayaran tidak ditemukan' });
    }

    if (pembayaranList[0].status === 'success') {
      return success(res, null, 'Status sudah lunas sebelumnya');
    }

    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      await sequelize.transaction(async (t) => {
        for (const pembayaran of pembayaranList) {
          const tagihan = pembayaran.tagihan;
          
          await pembayaran.update({ status: 'success' }, { transaction: t });
          await tagihan.update({ status: 'lunas' }, { transaction: t });
          
          await KasHarian.create({
            pembayaran_id: pembayaran.id,
            tanggal: new Date(),
            jenis: 'masuk',
            kategori: 'iuran',
            keterangan: `Pembayaran Iuran RT ${tagihan.bulan}/${tagihan.tahun} - ${tagihan.warga.no_rumah} (Rapel)`,
            nominal: pembayaran.jumlah_bayar,
            dicatat_oleh: tagihan.warga.user_id || 1
          }, { transaction: t });

          if (tagihan.warga.user_id) {
            await notificationService.notify(tagihan.warga.user_id, {
              title: 'Pembayaran Berhasil',
              message: `Pembayaran iuran bulan ${tagihan.bulan}/${tagihan.tahun} sebesar Rp ${Number(pembayaran.jumlah_bayar).toLocaleString('id-ID')} telah berhasil.`,
              type: 'pembayaran',
              amount: pembayaran.jumlah_bayar,
              refId: pembayaran.id,
              refType: 'pembayaran',
              channels: ['inapp', 'email', 'whatsapp']
            });
          }
        }
      });
      return success(res, null, 'Status pembayaran berhasil di-sync (Lunas)');
    } else if (transaction_status === 'expire' || transaction_status === 'cancel' || transaction_status === 'deny') {
      const finalStatus = transaction_status === 'expire' ? 'expired' : 'failed';
      await Pembayaran.update({ status: finalStatus }, { where: { reference_id: order_id } });
      return success(res, null, `Status pembayaran berhasil di-sync (${finalStatus})`);
    }

    return success(res, null, 'Status pembayaran berhasil di-sync (Pending)');
  } catch (err) {
    console.error('Midtrans sync error:', err);
    return error(res, 'Gagal sync status Midtrans', 500);
  }
};

module.exports = { getAllPembayaran, createMidtransTransaction, midtransWebhook, createManualPayment, syncMidtransTransaction };
