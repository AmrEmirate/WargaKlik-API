const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');

const app = express();

// Security headers (Helmet)
// FIX: Removed 'unsafe-inline' from scriptSrc and styleSrc to prevent XSS
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],                        // FIX: removed 'unsafe-inline'
      styleSrc: ["'self'", "'unsafe-inline'"],      // Keep for now (Tailwind/inline styles), ideally remove later
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", env.frontendUrl, "https://api.midtrans.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],                   // Prevent clickjacking
      upgradeInsecureRequests: [],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,     // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// Global Rate Limiting
const isTest = process.env.NODE_ENV === 'test';
const globalLimiter = isTest ? (req, res, next) => next() : rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// Specific limiter for Auth (Brute-force protection)
const authLimiter = isTest ? (req, res, next) => next() : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Terlalu banyak percobaan akses, silakan coba lagi dalam 15 menit.' }
});

// CORS
app.use(cors({
  origin: env.frontendUrl,
  credentials: true
}));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing with reasonable limits
app.use(express.json({ limit: '1mb' }));    // FIX: reduced from 10mb to 1mb
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ============================================================
// FIX: Protected static file serving — requires authentication
// Files in /uploads now served via /api/uploads/:filename
// to prevent unauthenticated direct access
// ============================================================

// Routes
const authRoutes = require('./routes/auth.routes');
const wargaRoutes = require('./routes/warga.routes');
const iuranRoutes = require('./routes/iuran.routes');
const tagihanRoutes = require('./routes/tagihan.routes');
const pembayaranRoutes = require('./routes/pembayaran.routes');
const kasRoutes = require('./routes/kas.routes');
const pengumumanRoutes = require('./routes/pengumuman.routes');
const notifikasiRoutes = require('./routes/notifikasi.routes');
const laporanRoutes = require('./routes/laporan.routes');
const wargaIuranRoutes = require('./routes/wargaIuran.routes');
const { authenticate } = require('./middlewares/auth.middleware');

// Apply auth limiter to auth routes
app.use('/api/auth', authLimiter, authRoutes);

app.use('/api/warga', wargaRoutes);
app.use('/api/iuran', iuranRoutes);
app.use('/api/tagihan', tagihanRoutes);
app.use('/api/pembayaran', pembayaranRoutes);
app.use('/api/kas', kasRoutes);
app.use('/api/pengumuman', pengumumanRoutes);
app.use('/api/notifikasi', notifikasiRoutes);
app.use('/api/laporan', laporanRoutes);
app.use('/api/warga-iuran', wargaIuranRoutes);

// FIX: Protected file serving endpoint (auth required)
// Only authenticated users can access uploaded files
const uploadDir = path.join(__dirname, '../uploads');
app.get('/api/uploads/:filename', authenticate, (req, res) => {
  const filename = path.basename(req.params.filename); // sanitize: strip any path traversal
  const filePath = path.join(uploadDir, filename);

  // Ensure file exists and is within upload dir (path traversal prevention)
  if (!filePath.startsWith(uploadDir) || !fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File tidak ditemukan' });
  }

  res.sendFile(filePath);
});

// Health check (no auth, for monitoring)
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error ${err.status || 500}:`, err.stack);
  
  const isDev = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    success: false,
    message: isDev ? err.message : 'Terjadi kesalahan pada server. Silakan hubungi admin.',
    ...(isDev && { stack: err.stack })
  });
});

module.exports = app;
