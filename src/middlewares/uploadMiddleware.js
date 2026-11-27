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

// Simpan file ke folder uploads/ dengan nama acak menggunakan crypto.randomBytes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!Object.hasOwn(ALLOWED_FILE_TYPES, ext)) {
      return cb(new Error('Format file tidak didukung. Hanya JPG, JPEG, dan PNG yang diizinkan'));
    }
    const randomName = crypto.randomBytes(16).toString('hex');
    cb(null, `${randomName}${ext}`);
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
      return bytesRead >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    if (mimetype === 'image/png') {
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

const createUploadError = (message) => {
  const err = new Error(message);
  err.statusCode = 400;
  err.errorTitle = 'Upload gagal';
  return err;
};

// Wrapper untuk menangkap error Multer, memvalidasi magic bytes, dan meneruskan error ke errorHandler.
export const handleUpload = (req, res, next) => {
  upload.single('image')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return next(err);
    }

    if (err) {
      return next(createUploadError(err.message));
    }

    if (req.file && !hasValidImageSignature(req.file.path, req.file.mimetype)) {
      try {
        await fs.promises.unlink(req.file.path);
      } catch (unlinkErr) {
        if (unlinkErr.code !== 'ENOENT') {
          console.error('Gagal menghapus file tidak valid:', req.file.path, unlinkErr);
        }
      }
      return next(
        createUploadError('Isi file tidak valid. Hanya file gambar JPG, JPEG, dan PNG yang diizinkan')
      );
    }

    next();
  });
};
