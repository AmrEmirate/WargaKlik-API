const { Notifikasi, User } = require('../models');
const mailService = require('./mail.service');
const waService = require('./whatsapp.service');

/**
 * Send notification to a single user
 * @param {number} userId
 * @param {object} opts - { title, message, type, refId, refType, channels }
 *   channels: ['inapp', 'email', 'whatsapp'] (default: ['inapp'])
 */
const notify = async (userId, opts) => {
  const { title, message, type = 'sistem', refId = null, refType = null, amount = 0, channels = ['inapp'] } = opts;

  // 1. Always create in-app notification
  await Notifikasi.create({
    user_id: userId,
    title,
    message,
    type,
    ref_id: refId,
    ref_type: refType
  });

  // Get user details for email/WA
  if (channels.includes('email') || channels.includes('whatsapp')) {
    const user = await User.findByPk(userId);
    if (!user) return;

    // 2. Send email
    if (channels.includes('email') && user.email) {
      try {
        if (type === 'pembayaran') {
          // If it's a payment, use the confirmation template
          await mailService.sendPaymentConfirmation(user.email, {
            bulan: 'Periode',
            tahun: 'Terlampir',
            jumlah: amount,
            metode: 'Manual/Online',
            tanggal: new Date().toLocaleDateString('id-ID'),
            customMessage: message
          });
        } else if (type === 'tagihan') {
          // For reminders - load month and year from database using refId if available
          let bulanVal = '';
          let tahunVal = '';
          let totalVal = amount || 0;

          if (refType === 'tagihan' && refId) {
            try {
              const { Tagihan } = require('../models');
              const tagihan = await Tagihan.findByPk(refId);
              if (tagihan) {
                const bulans = [
                  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                ];
                bulanVal = bulans[parseInt(tagihan.bulan) - 1] || '';
                tahunVal = tagihan.tahun;
                totalVal = tagihan.total_nominal;
              }
            } catch (dbErr) {
              console.error('Failed to fetch tagihan details for email:', dbErr.message);
            }
          }

          await mailService.sendReminder(user.email, {
            bulan: bulanVal,
            tahun: tahunVal,
            total: totalVal
          });
        } else {
          // Generic system notification
          await mailService.sendGenericNotification(user.email, title, message);
        }
      } catch (err) {
        console.error('Email notification error:', err.message);
      }
    }

    // 3. Send WhatsApp
    if (channels.includes('whatsapp') && user.no_telepon) {
      try {
        const templates = require('../utils/templates');
        await waService.sendMessage(user.no_telepon, templates.waGenericMessage(title, message));
      } catch (err) {
        console.error('WA notification error:', err.message);
      }
    }
  }
};

/**
 * Send notification to all users matching target role
 * @param {string} targetRole - 'semua', 'warga', 'pengurus'
 * @param {object} opts - same as notify()
 */
const notifyAll = async (targetRole, opts) => {
  let whereClause = {};

  if (targetRole === 'warga') {
    whereClause.role = 'warga';
  } else if (targetRole === 'pengurus') {
    whereClause.role = ['sekretaris', 'bendahara', 'rt', 'wakil_rt'];
  }
  // 'semua' = no filter

  const users = await User.findAll({ where: whereClause, attributes: ['id'] });

  for (const user of users) {
    await notify(user.id, opts);
  }
};

module.exports = { notify, notifyAll };
