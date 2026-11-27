import multer from 'multer';

const MULTER_ERROR_MESSAGES = {
  LIMIT_FILE_SIZE: 'Ukuran file terlalu besar. Maksimal 5 MB',
  LIMIT_UNEXPECTED_FILE: 'Field upload tidak valid. Gunakan field "image"',
};

// Middleware penanganan error terpusat (4 parameter wajib bagi Express error handler)
const errorHandler = (err, req, res, next) => {
  // Error validasi Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((item) => item.message);
    return res.status(400).json({
      success: false,
      message: 'Validasi gagal',
      errors,
    });
  }

  // Error CastError Mongoose
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ID laporan tidak valid',
      errors: ['Format ID tidak valid'],
    });
  }

  // Error duplicate key MongoDB (kode 11000)
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Data duplikat',
      errors: ['Data dengan nilai unik tersebut sudah terdaftar'],
    });
  }

  // Error upload dari Multer
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: 'Upload gagal',
      errors: [MULTER_ERROR_MESSAGES[err.code] || 'Upload gagal'],
    });
  }

  // Error JSON body tidak valid dari express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Validasi gagal',
      errors: ['Format JSON pada request body tidak valid'],
    });
  }

  // Error terdefinisi dengan statusCode khusus (misalnya error validasi upload)
  if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.errorTitle || 'Permintaan tidak valid',
      errors: [err.message],
    });
  }

  // Catat error internal tak terduga di server log tanpa mengirim detail ke client
  console.error('Error internal server:', err);
  return res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan pada server',
    errors: ['Terjadi kesalahan internal pada server'],
  });
};

export default errorHandler;
