import mongoose from 'mongoose';

// Kategori yang diizinkan (penulisan kanonis)
const CATEGORIES = ['Elektronik', 'Dokumen', 'Aksesoris', 'Pakaian', 'Lainnya'];

// Status yang diizinkan untuk laporan kehilangan
const LOST_STATUSES = ['Belum ditemukan', 'Ditemukan'];

// Normalisasi kategori: cocokkan secara case-insensitive, kembalikan penulisan kanonis
const normalizeCategory = (val) => {
  if (!val) return val;
  const match = CATEGORIES.find((c) => c.toLowerCase() === val.toLowerCase());
  return match || val; // jika tidak cocok, kembalikan nilai asli agar enum validator menolaknya
};

// Validator untuk nomor telepon Indonesia atau email
const isValidContact = (val) => {
  const phoneRegex = /^(\+62|0)[0-9]{9,13}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return phoneRegex.test(val) || emailRegex.test(val);
};

const lostItemSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: [true, 'Nama barang wajib diisi'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Kategori wajib diisi'],
      set: normalizeCategory,
      enum: {
        values: CATEGORIES,
        message:
          'Kategori tidak valid. Pilih salah satu: Elektronik, Dokumen, Aksesoris, Pakaian, Lainnya',
      },
    },
    description: {
      type: String,
      required: [true, 'Deskripsi wajib diisi'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Lokasi terakhir barang terlihat wajib diisi'],
      trim: true,
    },
    eventDate: {
      type: Date,
      required: [true, 'Tanggal kehilangan wajib diisi'],
    },
    reporterName: {
      type: String,
      required: [true, 'Nama pelapor wajib diisi'],
      trim: true,
    },
    reporterContact: {
      type: String,
      required: [true, 'Kontak pelapor wajib diisi'],
      trim: true,
      validate: {
        validator: isValidContact,
        message:
          'Kontak pelapor harus berupa nomor telepon Indonesia yang valid (awalan 0 atau +62, 10–15 digit) atau alamat email yang valid',
      },
    },
    image: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      required: [true, 'Status wajib diisi'],
      enum: {
        values: LOST_STATUSES,
        message: 'Status tidak valid untuk laporan kehilangan. Pilih: Belum ditemukan atau Ditemukan',
      },
      default: 'Belum ditemukan',
    },
  },
  {
    timestamps: true,
  }
);

const LostItem = mongoose.model('LostItem', lostItemSchema);

export default LostItem;
