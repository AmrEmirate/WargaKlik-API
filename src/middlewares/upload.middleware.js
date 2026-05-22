const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Use cryptographically secure random names to prevent enumeration and path traversal
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Strict extension allowlist
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    if (!allowedExts.includes(ext)) {
      return cb(new Error('Ekstensi file tidak valid'));
    }
    
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipe file tidak diizinkan. Gunakan JPG, PNG, WebP, atau PDF.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1 // Only 1 file at a time
  }
});

/**
 * Middleware to validate file content (magic bytes) after upload
 * This prevents users from uploading malicious scripts disguised as images
 */
const validateFileContent = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const { fileTypeFromFile } = await import('file-type');
    const filePath = req.file.path;
    const type = await fileTypeFromFile(filePath);

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    
    // If file-type can't determine the type, or it doesn't match our allowed list
    if (!type || !allowedMimeTypes.includes(type.mime)) {
      // Delete the malicious file
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'Konten file tidak valid atau berbahaya. File telah dihapus.'
      });
    }

    // Double check: does the determined mime type match the extension?
    const ext = path.extname(req.file.filename).toLowerCase();
    const mimeToExt = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf']
    };

    if (!mimeToExt[type.mime].includes(ext)) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'Ekstensi file tidak sesuai dengan konten aslinya.'
      });
    }

    next();
  } catch (error) {
    console.error('File validation error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({
      success: false,
      message: 'Gagal memvalidasi keamanan file.'
    });
  }
};

module.exports = { upload, validateFileContent };
