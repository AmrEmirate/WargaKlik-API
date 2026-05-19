const transporter = require('../config/mail');
const templates = require('../utils/templates');

const FROM_EMAIL = process.env.MAIL_USER;
const APP_NAME = 'Iuran RT';

/**
 * Send OTP via email
 */
const sendOtp = async (email, otpCode, purpose = 'aktivasi') => {
  const subject = purpose === 'aktivasi'
    ? `${APP_NAME} - Kode Aktivasi Akun`
    : `${APP_NAME} - Kode Reset Password`;

  await transporter.sendMail({
    from: `"${APP_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject,
    html: templates.emailOtpMessage(otpCode, purpose)
  });
};

/**
 * Send payment confirmation email
 */
const sendPaymentConfirmation = async (email, paymentData) => {
  await transporter.sendMail({
    from: `"${APP_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: `${APP_NAME} - Pembayaran Berhasil`,
    html: templates.emailPaymentConfirmation(paymentData)
  });
};

/**
 * Send reminder email
 */
const sendReminder = async (email, reminderData) => {
  await transporter.sendMail({
    from: `"${APP_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: `${APP_NAME} - Pengingat Tagihan Iuran`,
    html: templates.emailReminder(reminderData)
  });
};

/**
 * Send generic system notification email
 */
const sendGenericNotification = async (email, title, message) => {
  await transporter.sendMail({
    from: `"${APP_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: `${APP_NAME} - ${title}`,
    html: templates.emailGenericNotification(title, message)
  });
};

module.exports = { sendOtp, sendPaymentConfirmation, sendReminder, sendGenericNotification };
