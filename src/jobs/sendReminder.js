const cron = require('node-cron');
const { Tagihan, Warga, User } = require('../models');
const notificationService = require('../services/notification.service');

/**
 * Send payment reminders for unpaid tagihan
 * Runs on the 10th and 20th of every month at 09:00
 */
const setupSendReminder = () => {
  cron.schedule('0 9 10,20 * *', async () => {
    console.log('⏰ [CRON] Sending payment reminders...');
    try {
      const now = new Date();
      const bulan = now.getMonth() + 1;
      const tahun = now.getFullYear();

      // Find unpaid tagihan for this month
      const unpaidTagihan = await Tagihan.findAll({
        where: { bulan, tahun, status: 'belum_bayar' },
        include: [{
          model: Warga,
          as: 'warga',
          where: { is_active: true },
          include: [{ model: User, as: 'user' }]
        }]
      });

      let sent = 0;
      for (const tagihan of unpaidTagihan) {
        if (!tagihan.warga?.user) continue;

        await notificationService.notify(tagihan.warga.user.id, {
          title: 'Pengingat Tagihan Iuran',
          message: `Tagihan iuran bulan ${bulan}/${tahun} sebesar Rp ${parseFloat(tagihan.total_nominal).toLocaleString('id-ID')} belum dibayar. Silakan segera lakukan pembayaran.`,
          type: 'tagihan',
          refId: tagihan.id,
          refType: 'tagihan',
          channels: ['inapp', 'email', 'whatsapp']
        });
        sent++;
      }

      console.log(`[CRON] Reminders sent: ${sent}`);
    } catch (err) {
      console.error('[CRON] Send reminder error:', err);
    }
  });

  console.log('Cron: Send reminder scheduled (10th & 20th of every month, 09:00)');
};

module.exports = setupSendReminder;
