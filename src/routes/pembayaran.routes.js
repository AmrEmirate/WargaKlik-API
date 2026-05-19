const router = require('express').Router();
const pembayaranController = require('../controllers/pembayaran.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { pengurusOnly, bendaharaUp } = require('../middlewares/role.middleware');
const { upload, validateFileContent } = require('../middlewares/upload.middleware');

/**
 * Midtrans IP Whitelist Middleware
 * Only allow webhook requests from Midtrans servers
 * IP ranges from: https://docs.midtrans.com/reference/ip-addresses
 */
const midtransIPs = [
  '103.208.23.',   // Midtrans production
  '103.127.221.',  // Midtrans production
  '103.211.70.',   // Midtrans sandbox
  '127.0.0.1',     // localhost (for testing)
  '::1',           // localhost IPv6
  '::ffff:127.0.0.1' // localhost mapped IPv4
];

const midtransIPWhitelist = (req, res, next) => {
  // Skip IP check in test/development environment
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return next();
  }

  const clientIP = req.ip || req.connection.remoteAddress || '';
  const isAllowed = midtransIPs.some(allowed => clientIP.startsWith(allowed) || clientIP === allowed);

  if (!isAllowed) {
    console.warn(`[Midtrans Webhook] Blocked request from unauthorized IP: ${clientIP}`);
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

// Public webhook (no auth, but IP-whitelisted + signature-verified)
router.post('/midtrans/webhook', midtransIPWhitelist, pembayaranController.midtransWebhook);

router.use(authenticate);

router.get('/', pembayaranController.getAllPembayaran);
router.post('/midtrans/snap', pembayaranController.createMidtransTransaction);
router.post('/manual', bendaharaUp, upload.single('bukti'), validateFileContent, pembayaranController.createManualPayment);

module.exports = router;
