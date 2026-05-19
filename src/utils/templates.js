const APP_NAME = 'Iuran RT';
const FRONTEND_URL = process.env.FRONTEND_URL;

module.exports = {
  // ==========================================
  // WHATSAPP TEMPLATES
  // ==========================================

  waOtpMessage: (otpCode, purpose) => {
    const action = purpose === 'aktivasi' ? 'Aktivasi Akun' : 'Reset Password';
    return `*[IURAN RT - KEAMANAN AKUN]*\n\nyth. Bapak/Ibu,\nBerikut adalah Kode OTP Anda untuk proses *${action}*:\n\n*${otpCode}*\n\n *PENTING:*\n- Kode ini hanya berlaku selama 10 menit.\n- Demi keamanan, *JANGAN* memberikan kode ini kepada siapapun, termasuk pihak pengurus RT.\n- Jika Anda tidak merasa melakukan permintaan ini, harap abaikan pesan ini.\n\nTerima kasih,\nSistem Iuran RT`;
  },

  waGenericMessage: (title, message) => {
    return `*${title}*\n\n${message}`;
  },

  // ==========================================
  // EMAIL TEMPLATES (HTML)
  // ==========================================

  emailOtpMessage: (otpCode, purpose) => {
    return `
    <div style="font-family: 'Inter', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #1e293b; color: #f1f5f9; border-radius: 16px;">
      <h2 style="color: #10b981; margin-bottom: 8px; text-align: center;">${APP_NAME}</h2>
      <div style="background: #0f172a; padding: 32px 24px; border-radius: 12px; margin-top: 24px; border: 1px solid #334155;">
        <p style="color: #e2e8f0; margin-bottom: 16px; font-size: 15px;">yth. Bapak/Ibu,</p>
        <p style="color: #94a3b8; margin-bottom: 24px; line-height: 1.6;">
          Berikut adalah Kode OTP Anda untuk proses <strong>${purpose === 'aktivasi' ? 'Aktivasi Akun' : 'Reset Password'}</strong>:
        </p>
        <div style="background: #1e293b; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px; border: 1px dashed #10b981;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #10b981;">${otpCode}</span>
        </div>
        <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 4px; margin-bottom: 16px;">
          <p style="color: #fca5a5; font-size: 13px; margin: 0; line-height: 1.5;">
            <strong>⚠️ PERHATIAN:</strong><br/>
            Kode ini bersifat rahasia dan hanya berlaku selama <strong>10 menit</strong>. Jangan pernah memberikan kode ini kepada siapa pun, termasuk pihak pengurus RT.
          </p>
        </div>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px; line-height: 1.5; text-align: center;">
          Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini dan pastikan akun Anda tetap aman.
        </p>
      </div>
    </div>
    `;
  },

  emailPaymentConfirmation: (paymentData) => {
    return `
    <div style="font-family: 'Inter', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #1e293b; color: #f1f5f9; border-radius: 16px;">
      <h2 style="color: #10b981; margin-bottom: 4px;">${APP_NAME}</h2>
      <p style="color: #94a3b8; margin-bottom: 24px;">Pembayaran Berhasil</p>
      
      <div style="background: #0f172a; padding: 32px 24px; border-radius: 16px; text-align: center; margin-bottom: 24px; border: 1px solid #10b981;">
        <div style="color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Total Dibayar</div>
        <div style="font-size: 36px; font-weight: 800; color: #10b981;">Rp ${Number(paymentData.jumlah || 0).toLocaleString('id-ID')}</div>
      </div>

      <div style="background: #0f172a; padding: 20px; border-radius: 12px; margin-bottom: 16px;">
        ${paymentData.customMessage ? `
          <p style="color: #f1f5f9; font-weight: 600; line-height: 1.5; margin: 0;">${paymentData.customMessage}</p>
        ` : `
          <p style="margin: 4px 0; color: #94a3b8;">Tagihan: <strong style="color: #f1f5f9;">${paymentData.bulan}/${paymentData.tahun}</strong></p>
          <p style="margin: 4px 0; color: #94a3b8;">Metode: <strong style="color: #f1f5f9;">${paymentData.metode}</strong></p>
          <p style="margin: 4px 0; color: #94a3b8;">Tanggal: <strong style="color: #f1f5f9;">${paymentData.tanggal}</strong></p>
        `}
      </div>
      <p style="color: #64748b; font-size: 12px; text-align: center;">Simpan email ini sebagai bukti pembayaran digital Anda.</p>
    </div>
    `;
  },

  emailReminder: (reminderData) => {
    return `
    <div style="font-family: 'Inter', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #1e293b; color: #f1f5f9; border-radius: 16px;">
      <h2 style="color: #f59e0b;">${APP_NAME} - Pengingat</h2>
      <p style="color: #94a3b8;">Tagihan iuran bulan <strong style="color: #f1f5f9;">${reminderData.bulan}/${reminderData.tahun}</strong> sebesar:</p>
      <div style="background: #0f172a; padding: 20px; border-radius: 12px; text-align: center; margin: 16px 0;">
        <span style="font-size: 24px; font-weight: 700; color: #f59e0b;">Rp ${Number(reminderData.total).toLocaleString('id-ID')}</span>
      </div>
      <p style="color: #94a3b8;">belum dibayar. Silakan segera lakukan pembayaran.</p>
      <a href="${FRONTEND_URL}/dashboard/tagihan" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Bayar Sekarang</a>
    </div>
    `;
  },

  emailGenericNotification: (title, message) => {
    return `
    <div style="font-family: 'Inter', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #1e293b; color: #f1f5f9; border-radius: 16px;">
      <h2 style="color: #3b82f6;">${APP_NAME}</h2>
      <h3 style="color: #f1f5f9;">${title}</h3>
      <p style="color: #94a3b8; line-height: 1.6;">${message}</p>
      <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Ini adalah pesan otomatis dari sistem ${APP_NAME}.</p>
    </div>
    `;
  }
};
