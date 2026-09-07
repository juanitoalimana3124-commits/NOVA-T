/**
 * Middleware de subida de archivos con Multer
 * Soporta almacenamiento local y Cloudinary
 */
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Almacenamiento local (fallback cuando no hay Cloudinary)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/vouchers'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${crypto.randomBytes(16).toString('hex')}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Filtro: valida MIME type del servidor Y extensión del archivo
const ALLOWED_MIME  = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']);
const ALLOWED_EXT   = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic']);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIME.has(file.mimetype) && ALLOWED_EXT.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (JPG, PNG, WEBP).'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
    files: 1
  }
});

// Magic bytes de formatos de imagen permitidos
const MAGIC_BYTES = [
  { bytes: [0xFF, 0xD8, 0xFF], type: 'jpeg' },           // JPEG
  { bytes: [0x89, 0x50, 0x4E, 0x47], type: 'png' },       // PNG
  { bytes: [0x52, 0x49, 0x46, 0x46], type: 'webp' },      // WEBP (RIFF header)
  { bytes: [0x00, 0x00, 0x00], type: 'heic', offset: 4 }, // HEIC (ftyp box)
];

function isAllowedImageBuffer(buffer) {
  for (const sig of MAGIC_BYTES) {
    const offset = sig.offset || 0;
    const slice = buffer.slice(offset, offset + sig.bytes.length);
    if (sig.bytes.every((b, i) => slice[i] === b)) return true;
  }
  // WEBP adicional: verifica "WEBP" en bytes 8-11
  if (buffer.length >= 12) {
    const riff = buffer.slice(0, 4).toString('ascii');
    const webp = buffer.slice(8, 12).toString('ascii');
    if (riff === 'RIFF' && webp === 'WEBP') return true;
  }
  return false;
}

// Middleware post-multer para validar magic bytes del archivo guardado
function validateMagicBytes(req, res, next) {
  if (!req.file) return next();

  try {
    const fd = fs.openSync(req.file.path, 'r');
    const header = Buffer.alloc(12);
    fs.readSync(fd, header, 0, 12, 0);
    fs.closeSync(fd);

    if (!isAllowedImageBuffer(header)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        success: false,
        message: 'El archivo no es una imagen válida.'
      });
    }
    next();
  } catch (err) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    next(err);
  }
}

module.exports = upload;
module.exports.validateMagicBytes = validateMagicBytes;
