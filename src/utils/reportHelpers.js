import fs from 'fs/promises';

export const ALLOWED_CATEGORIES = ['Elektronik', 'Dokumen', 'Aksesoris', 'Pakaian', 'Lainnya'];

// Hapus file fisik secara aman menggunakan fs.promises; abaikan jika file tidak ditemukan
export const deleteFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Gagal menghapus file fisik:', filePath, err);
    }
  }
};

// Validasi format ketat YYYY-MM-DD dan pastikan tanggal benar-benar ada di kalender
export const parseValidEventDate = (dateString) => {
  if (typeof dateString !== 'string') {
    return null;
  }

  const trimmed = dateString.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const [year, month, day] = trimmed.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

// Amankan karakter spesial regex untuk mencegah regex injection pada query pencarian
const escapeRegex = (text) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Validasi query parameters dan bangun objek filter MongoDB dengan logika AND.
// Mengembalikan { filter } jika valid, atau { error } jika ada validasi yang gagal.
export const buildFilterFromQuery = (query, allowedStatuses, invalidStatusMessage) => {
  const allowedQueryKeys = ['category', 'location', 'status', 'search'];

  // 1. Tolak format bracket operator (misal location[$ne]) pada Express 5
  for (const key of Object.keys(query)) {
    if (allowedQueryKeys.some((param) => key.startsWith(`${param}[`))) {
      return { error: `Format parameter ${key} tidak valid` };
    }
  }

  const { category, location, status, search } = query;

  // 2. Pastikan setiap parameter yang dikirim bertipe string
  for (const [paramName, paramValue] of Object.entries({ category, location, status, search })) {
    if (paramValue !== undefined && typeof paramValue !== 'string') {
      return { error: `Parameter ${paramName} harus berupa teks` };
    }
  }

  // 3. Trim nilai string; nilai kosong/whitespace diabaikan
  const trimmedCategory = category ? category.trim() : '';
  const trimmedLocation = location ? location.trim() : '';
  const trimmedStatus = status ? status.trim() : '';
  const trimmedSearch = search ? search.trim() : '';

  const filter = {};

  // 4. Validasi kategori (exact match, case-insensitive)
  if (trimmedCategory !== '') {
    const matchedCategory = ALLOWED_CATEGORIES.find(
      (c) => c.toLowerCase() === trimmedCategory.toLowerCase()
    );
    if (!matchedCategory) {
      return {
        error: 'Kategori tidak valid. Pilih salah satu: Elektronik, Dokumen, Aksesoris, Pakaian, Lainnya',
      };
    }
    filter.category = matchedCategory;
  }

  // 5. Validasi status sesuai jenis laporan (exact match)
  if (trimmedStatus !== '') {
    if (!allowedStatuses.includes(trimmedStatus)) {
      return { error: invalidStatusMessage };
    }
    filter.status = trimmedStatus;
  }

  // 6. Location (partial match, case-insensitive)
  if (trimmedLocation !== '') {
    filter.location = { $regex: escapeRegex(trimmedLocation), $options: 'i' };
  }

  // 7. Search pada itemName dan description (partial match, case-insensitive)
  if (trimmedSearch !== '') {
    const searchRegex = { $regex: escapeRegex(trimmedSearch), $options: 'i' };
    filter.$or = [{ itemName: searchRegex }, { description: searchRegex }];
  }

  return { filter };
};
