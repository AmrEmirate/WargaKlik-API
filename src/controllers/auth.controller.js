const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Warga, RefreshToken } = require('../models');
const { Op } = require('sequelize');
const { success, error } = require('../utils/response');
const { generateOtp, getOtpExpiry, isOtpExpired, hashOtp, verifyOtp: compareOtp } = require('../utils/otp');
const mailService = require('../services/mail.service');
const waService = require('../services/whatsapp.service');

/**
 * Hash a refresh token for secure storage in DB
 */
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Generate JWT tokens and persist refresh token in DB
 */
const generateTokens = async (user) => {
  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );

  // Store hashed refresh token in DB (allows revocation on logout)
  const refreshExpireDays = parseInt(process.env.JWT_REFRESH_EXPIRE_DAYS || '7');
  const expiresAt = new Date(Date.now() + refreshExpireDays * 24 * 60 * 60 * 1000);
  await RefreshToken.create({
    user_id: user.id,
    token_hash: hashToken(refreshToken),
    expires_at: expiresAt
  });

  return { accessToken, refreshToken };
};

/**
 * Validate password complexity
 * Min 8 chars, at least one uppercase, one number, one special char
 * @returns {string|null} Error message or null if valid
 */
const validatePasswordComplexity = (password) => {
  if (password.length < 8) {
    return 'Password minimal 8 karakter';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password harus mengandung minimal satu huruf kapital';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password harus mengandung minimal satu angka';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password harus mengandung minimal satu karakter spesial (contoh: @, #, !, dll.)';
  }
  return null;
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { identifier, email, password } = req.body;
    const loginId = (identifier || email)?.trim();

    if (!loginId || !password) {
      return error(res, 'Email/Nomor Telepon dan password wajib diisi', 400);
    }

    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { email: loginId },
          { no_telepon: loginId }
        ] 
      } 
    });

    if (!user) {
      return error(res, 'Email/Nomor Telepon atau password salah', 401);
    }

    // Check if account is locked
    if (user.lock_until && user.lock_until > new Date()) {
      const remainingMinutes = Math.ceil((user.lock_until - new Date()) / 60000);
      return error(res, `Akun Anda terkunci. Silakan coba lagi dalam ${remainingMinutes} menit.`, 403);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.login_attempts += 1;
      if (user.login_attempts >= 5) {
        user.lock_until = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();
      return error(res, 'Email/Nomor Telepon atau password salah', 401);
    }

    // Success - reset attempts
    user.login_attempts = 0;
    user.lock_until = null;
    await user.save();

    const tokens = await generateTokens(user);

    return success(res, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        no_telepon: user.no_telepon
      },
      ...tokens
    }, 'Login berhasil');
  } catch (err) {
    console.error('Login error:', err);
    return error(res, 'Gagal login', 500);
  }
};

/**
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return error(res, 'Refresh token wajib diisi', 400);
    }

    // Verify JWT signature first
    let decoded;
    try {
      decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    } catch (jwtErr) {
      return error(res, 'Refresh token tidak valid atau sudah kadaluarsa', 401);
    }

    // Check if token exists in DB (not revoked)
    const tokenHash = hashToken(refresh_token);
    const storedToken = await RefreshToken.findOne({
      where: {
        token_hash: tokenHash,
        user_id: decoded.id,
        expires_at: { [Op.gt]: new Date() }
      }
    });

    if (!storedToken) {
      return error(res, 'Refresh token sudah tidak valid atau telah dicabut', 401);
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return error(res, 'User tidak ditemukan', 401);
    }

    // Rotate: delete old token, issue new pair
    await storedToken.destroy();
    const tokens = await generateTokens(user);

    return success(res, tokens, 'Token diperbarui');
  } catch (err) {
    console.error('Refresh token error:', err);
    return error(res, 'Gagal memperbarui token', 500);
  }
};

/**
 * POST /api/auth/logout
 * Revoke the refresh token from DB
 */
const logout = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (refresh_token) {
      const tokenHash = hashToken(refresh_token);
      await RefreshToken.destroy({ where: { token_hash: tokenHash } });
    }
    return success(res, null, 'Logout berhasil');
  } catch (err) {
    console.error('Logout error:', err);
    return error(res, 'Gagal logout', 500);
  }
};

/**
 * POST /api/auth/activate
 * Send OTP for account activation
 */
const activate = async (req, res) => {
  try {
    const { identifier, email } = req.body;
    const loginId = (identifier || email)?.trim();
    if (!loginId) return error(res, 'Email/Nomor Telepon wajib diisi', 400);

    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { email: loginId },
          { no_telepon: loginId }
        ] 
      } 
    });
    if (!user) return error(res, 'User tidak ditemukan', 404);

    const otpCode = generateOtp();
    user.otp_code = await hashOtp(otpCode); // Store hashed OTP
    user.otp_expiry = getOtpExpiry();
    user.otp_attempts = 0;
    await user.save();

    // Send plaintext OTP to user
    try { if (user.email) await mailService.sendOtp(user.email, otpCode, 'aktivasi'); } catch (e) { console.error('Mail OTP error:', e.message); }
    if (user.no_telepon) {
      try { await waService.sendOtpWA(user.no_telepon, otpCode, 'aktivasi'); } catch (e) { console.error('WA OTP error:', e.message); }
    }

    return success(res, null, 'Kode OTP telah dikirim ke email dan WhatsApp Anda');
  } catch (err) {
    console.error('Activate error:', err);
    return error(res, 'Gagal mengirim OTP', 500);
  }
};

/**
 * POST /api/auth/verify-otp
 * Verify OTP and set new password (activation)
 */
const verifyOtp = async (req, res) => {
  try {
    const { identifier, email, otp_code, password } = req.body;
    const loginId = (identifier || email)?.trim();
    if (!loginId || !otp_code || !password) {
      return error(res, 'Email/Nomor Telepon, kode OTP, dan password baru wajib diisi', 400);
    }

    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { email: loginId },
          { no_telepon: loginId }
        ] 
      } 
    });
    if (!user) return error(res, 'User tidak ditemukan', 404);
    if (!user.otp_code) return error(res, 'Tidak ada permintaan OTP aktif', 400);

    if (user.otp_attempts >= 5) {
      user.otp_code = null;
      user.otp_expiry = null;
      user.otp_attempts = 0;
      await user.save();
      return error(res, 'Terlalu banyak percobaan yang salah. Silakan minta kode OTP baru.', 400);
    }

    const isOtpValid = await compareOtp(otp_code, user.otp_code);
    if (!isOtpValid) {
      user.otp_attempts += 1;
      await user.save();
      const remaining = 5 - user.otp_attempts;
      return error(res, `Kode OTP salah. Sisa percobaan: ${remaining}`, 400);
    }

    if (isOtpExpired(user.otp_expiry)) {
      return error(res, 'Kode OTP sudah kadaluarsa', 400);
    }

    const pwError = validatePasswordComplexity(password);
    if (pwError) return error(res, pwError, 400);

    user.password = await bcrypt.hash(password, 12);
    user.otp_code = null;
    user.otp_expiry = null;
    user.otp_attempts = 0;
    await user.save();

    // Set Warga status to active when successfully registered/verified
    const warga = await Warga.findOne({ where: { user_id: user.id } });
    if (warga && !warga.is_active) {
      warga.is_active = true;
      await warga.save();
    }

    const tokens = await generateTokens(user);

    return success(res, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      ...tokens
    }, 'Akun berhasil diaktifkan');
  } catch (err) {
    console.error('Verify OTP error:', err);
    return error(res, 'Gagal verifikasi OTP', 500);
  }
};

/**
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  try {
    const { identifier, email } = req.body;
    const loginId = (identifier || email)?.trim();
    if (!loginId) return error(res, 'Email/Nomor Telepon wajib diisi', 400);

    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { email: loginId },
          { no_telepon: loginId }
        ] 
      } 
    });
    // Return same message whether user exists or not (prevent user enumeration)
    if (!user) return success(res, null, 'Jika akun ditemukan, kode OTP telah dikirim');

    const otpCode = generateOtp();
    user.otp_code = await hashOtp(otpCode);
    user.otp_expiry = getOtpExpiry();
    user.otp_attempts = 0;
    await user.save();

    try { if (user.email) await mailService.sendOtp(user.email, otpCode, 'reset'); } catch (e) { console.error('Mail error:', e.message); }
    if (user.no_telepon) {
      try { await waService.sendOtpWA(user.no_telepon, otpCode, 'reset'); } catch (e) { console.error('WA error:', e.message); }
    }

    return success(res, null, 'Jika akun ditemukan, kode OTP telah dikirim');
  } catch (err) {
    console.error('Forgot password error:', err);
    return error(res, 'Gagal mengirim OTP', 500);
  }
};

/**
 * POST /api/auth/reset-password
 * FIX: Added OTP attempt limiting (was missing before - critical vulnerability)
 */
const resetPassword = async (req, res) => {
  try {
    const { identifier, email, otp_code, password } = req.body;
    const loginId = (identifier || email)?.trim();
    if (!loginId || !otp_code || !password) {
      return error(res, 'Email/Nomor Telepon, kode OTP, dan password baru wajib diisi', 400);
    }

    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { email: loginId },
          { no_telepon: loginId }
        ] 
      } 
    });
    if (!user) return error(res, 'User tidak ditemukan', 404);
    if (!user.otp_code) return error(res, 'Tidak ada permintaan OTP aktif', 400);

    // FIX: Check attempt limit (critical - was missing in original!)
    if (user.otp_attempts >= 5) {
      user.otp_code = null;
      user.otp_expiry = null;
      user.otp_attempts = 0;
      await user.save();
      return error(res, 'Terlalu banyak percobaan yang salah. Silakan minta kode OTP baru.', 400);
    }

    const isOtpValid = await compareOtp(otp_code, user.otp_code);
    if (!isOtpValid) {
      user.otp_attempts += 1;
      await user.save();
      const remaining = 5 - user.otp_attempts;
      return error(res, `Kode OTP salah. Sisa percobaan: ${remaining}`, 400);
    }

    if (isOtpExpired(user.otp_expiry)) {
      return error(res, 'Kode OTP sudah kadaluarsa', 400);
    }

    const pwError = validatePasswordComplexity(password);
    if (pwError) return error(res, pwError, 400);

    user.password = await bcrypt.hash(password, 12);
    user.otp_code = null;
    user.otp_expiry = null;
    user.otp_attempts = 0;
    await user.save();

    // Revoke all refresh tokens on password reset
    await RefreshToken.destroy({ where: { user_id: user.id } });

    return success(res, null, 'Password berhasil direset. Silakan login kembali.');
  } catch (err) {
    console.error('Reset password error:', err);
    return error(res, 'Gagal reset password', 500);
  }
};

/**
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return error(res, 'Password lama dan baru wajib diisi', 400);
    }

    const pwError = validatePasswordComplexity(newPassword);
    if (pwError) return error(res, pwError, 400);

    const user = await User.findByPk(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return error(res, 'Password lama salah', 400);
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    // Revoke all refresh tokens so other sessions must re-login
    await RefreshToken.destroy({ where: { user_id: user.id } });

    return success(res, null, 'Password berhasil diubah. Semua sesi lain telah dinonaktifkan.');
  } catch (err) {
    console.error('Change password error:', err);
    return error(res, 'Gagal mengubah password', 500);
  }
};

/**
 * PUT /api/auth/profile
 */
const updateProfile = async (req, res) => {
  try {
    const { name, no_telepon, email } = req.body;
    const user = await User.findByPk(req.user.id);

    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) return error(res, 'Email sudah digunakan oleh akun lain', 400);
      user.email = email;
    }
    if (name) user.name = name;
    if (no_telepon !== undefined) user.no_telepon = no_telepon;
    await user.save();

    if (name) {
      const warga = await Warga.findOne({ where: { user_id: user.id } });
      if (warga) {
        warga.kepala_keluarga = name;
        await warga.save();
      }
    }

    return success(res, {
      id: user.id,
      name: user.name,
      email: user.email,
      no_telepon: user.no_telepon,
      role: user.role
    }, 'Profil berhasil diperbarui');
  } catch (err) {
    console.error('Update profile error:', err);
    return error(res, 'Gagal memperbarui profil', 500);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'otp_code', 'otp_expiry'] },
      include: [{ model: Warga, as: 'warga' }]
    });
    return success(res, user);
  } catch (err) {
    return error(res, 'Gagal mengambil data user', 500);
  }
};

/**
 * POST /api/auth/validate-otp
 * Check if OTP is valid without consuming it yet
 */
const validateOtp = async (req, res) => {
  try {
    const { identifier, email, otp_code } = req.body;
    const loginId = (identifier || email)?.trim();
    if (!loginId || !otp_code) {
      return error(res, 'Email/Nomor Telepon dan kode OTP wajib diisi', 400);
    }

    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { email: loginId },
          { no_telepon: loginId }
        ] 
      } 
    });
    if (!user) return error(res, 'User tidak ditemukan', 404);
    if (!user.otp_code) return error(res, 'Tidak ada permintaan OTP aktif', 400);

    if (user.otp_attempts >= 5) {
      user.otp_code = null;
      user.otp_expiry = null;
      user.otp_attempts = 0;
      await user.save();
      return error(res, 'Terlalu banyak percobaan yang salah. Silakan minta kode OTP baru.', 400);
    }

    const isOtpValid = await compareOtp(otp_code, user.otp_code);
    if (!isOtpValid) {
      user.otp_attempts += 1;
      await user.save();
      const remaining = 5 - user.otp_attempts;
      return error(res, `Kode OTP salah. Sisa percobaan: ${remaining}`, 400);
    }

    if (isOtpExpired(user.otp_expiry)) {
      return error(res, 'Kode OTP sudah kadaluarsa', 400);
    }

    return success(res, null, 'Kode OTP valid');
  } catch (err) {
    console.error('Validate OTP error:', err);
    return error(res, 'Gagal validasi OTP', 500);
  }
};

module.exports = { login, refreshToken, logout, activate, verifyOtp, forgotPassword, resetPassword, changePassword, updateProfile, getMe, validateOtp };
