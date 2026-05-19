const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const { body } = require('express-validator');
const { validate } = require('../middlewares/validate.middleware');

const loginValidation = [
  body('identifier').optional().notEmpty().withMessage('Email/Nomor Telepon wajib diisi'),
  body('email').optional().isEmail().withMessage('Format email tidak valid'),
  body('password').notEmpty().withMessage('Password wajib diisi'),
  validate
];

const otpValidation = [
  body('identifier').optional().notEmpty().withMessage('Email/Nomor Telepon wajib diisi'),
  body('email').optional().isEmail().withMessage('Format email tidak valid'),
  body('otp_code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Kode OTP harus 6 digit angka'),
  validate
];

// Password complexity: min 8 chars, uppercase, number, special char
const passwordRule = body('password')
  .isLength({ min: 8 }).withMessage('Password minimal 8 karakter')
  .matches(/[A-Z]/).withMessage('Password harus mengandung minimal satu huruf kapital')
  .matches(/[0-9]/).withMessage('Password harus mengandung minimal satu angka')
  .matches(/[^A-Za-z0-9]/).withMessage('Password harus mengandung minimal satu karakter spesial');

const resetPasswordValidation = [
  body('identifier').optional().notEmpty(),
  body('email').optional().isEmail(),
  body('otp_code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Kode OTP harus 6 digit angka'),
  passwordRule,
  validate
];

router.post('/login', loginValidation, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/activate', authController.activate);
router.post('/verify-otp', resetPasswordValidation, authController.verifyOtp);
router.post('/validate-otp', otpValidation, authController.validateOtp);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', resetPasswordValidation, authController.resetPassword);
router.get('/me', authenticate, authController.getMe);
router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Password lama wajib diisi'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password baru minimal 8 karakter')
    .matches(/[A-Z]/).withMessage('Password harus mengandung minimal satu huruf kapital')
    .matches(/[0-9]/).withMessage('Password harus mengandung minimal satu angka')
    .matches(/[^A-Za-z0-9]/).withMessage('Password harus mengandung minimal satu karakter spesial'),
  validate
], authController.changePassword);
router.put('/profile', authenticate, [
  body('name').optional().notEmpty().withMessage('Nama tidak boleh kosong'),
  body('email').optional().isEmail().withMessage('Format email tidak valid'),
  validate
], authController.updateProfile);

module.exports = router;
