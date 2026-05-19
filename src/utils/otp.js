const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Generate 6-digit OTP code using cryptographically secure random
 */
const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Get OTP expiry time (10 minutes from now)
 */
const getOtpExpiry = () => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10);
  return expiry;
};

/**
 * Check if OTP is expired
 */
const isOtpExpired = (expiryDate) => {
  return new Date() > new Date(expiryDate);
};

/**
 * Hash OTP before storing in database
 * Uses bcrypt so the plaintext OTP cannot be recovered if DB is compromised
 */
const hashOtp = async (otpCode) => {
  return bcrypt.hash(otpCode, 10);
};

/**
 * Verify plaintext OTP against stored hash
 */
const verifyOtp = async (plainOtp, hashedOtp) => {
  // Support legacy plaintext OTP comparison during migration period
  if (hashedOtp && hashedOtp.length === 6 && /^\d{6}$/.test(hashedOtp)) {
    return plainOtp === hashedOtp;
  }
  return bcrypt.compare(plainOtp, hashedOtp);
};

module.exports = { generateOtp, getOtpExpiry, isOtpExpired, hashOtp, verifyOtp };
