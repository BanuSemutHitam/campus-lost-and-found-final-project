import crypto from 'crypto';
import fs from 'fs';
import multer from 'multer';
import path from 'path';

// Whitelist ekstensi yang diizinkan beserta MIME type yang sesuai
const ALLOWED_FILE_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

// Mapping ekstensi aman yang ditentukan server (mencegah penggunaan nama/ekstensi mentah dari client)
const SAFE_EXTENSIONS = {
  '.jpg': '.jpg',
  '.jpeg': '.jpeg',
  '.png': '.png',
};

// Simpan file ke folder uploads/ dengan nama acak menggunakan crypto.randomBytes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = SAFE_EXTENSIONS[ext];
    if (!safeExt) {
      return cb(new Error('Format file tidak didukung. Hanya JPG, JPEG, dan PNG yang diizinkan'));
    }
    const randomName = crypto.randomBytes(16).toString('hex');
    cb(null, `${randomName}${safeExt}`);
  },
});

// Validasi ekstensi dan kesesuaian MIME type terhadap whitelist
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const expectedMime = ALLOWED_FILE_TYPES[ext];

  if (!expectedMime || file.mimetype !== expectedMime) {
    return cb(
      new Error('Format file tidak didukung. Hanya JPG, JPEG, dan PNG yang diizinkan'),
      false
    );
  }

  cb(null, true);
};

// Periksa magic bytes (signature awal file) untuk memastikan isi file benar-benar JPEG atau PNG
const hasValidImageSignature = (filePath, mimetype) => {
  let fd;
  try {
    const buffer = Buffer.alloc(8);
    fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 8, 0);

    if (mimetype === 'image/jpeg') {
      // Magic bytes JPEG: FF D8 FF
      return bytesRead >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    if (mimetype === 'image/png') {
      // Magic bytes PNG: 89 50 4E 47 0D 0A 1A 0A
      return (
        bytesRead === 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    }

    return false;
  } catch {
    return false;
  } finally {
    if (fd !== undefined) {
      fs.closeSync(fd);
    }
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Maksimal 5 MB
  },
});

// Wrapper untuk menangkap error Multer, memvalidasi magic bytes, dan mengembalikan HTTP 400 standar.
export const handleUpload = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      let errorMessage = 'Upload gagal';
      if (err.code === 'LIMIT_FILE_SIZE') {
        errorMessage = 'Ukuran file terlalu besar. Maksimal 5 MB';
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        errorMessage = 'Field upload tidak valid. Gunakan field "image"';
      }
      return res.status(400).json({
        success: false,
        message: 'Upload gagal',
        errors: [errorMessage],
      });
    }

    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Upload gagal',
        errors: [err.message],
      });
    }

    // Jika ada file yang lolos filter ekstensi & MIME, pastikan isi file sesuai magic bytes
    if (req.file && !hasValidImageSignature(req.file.path, req.file.mimetype)) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr && unlinkErr.code !== 'ENOENT') {
          console.error('Gagal menghapus file tidak valid:', req.file.path, unlinkErr);
        }
      });
      return res.status(400).json({
        success: false,
        message: 'Upload gagal',
        errors: ['Isi file tidak valid. Hanya file gambar JPG, JPEG, dan PNG yang diizinkan'],
      });
    }

    next();
  });
};
