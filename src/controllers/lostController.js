import mongoose from 'mongoose';
import fs from 'fs';
import {
  createLostItem,
  getAllLostItems,
  getLostItemById,
  updateLostItem,
  deleteLostItem,
} from '../services/lostService.js';

// Hapus file fisik secara aman; abaikan jika file tidak ditemukan
const deleteFile = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error('Gagal menghapus file fisik:', filePath, err);
    }
  });
};

// Validasi format ketat YYYY-MM-DD dan pastikan tanggal benar-benar ada di kalender
const parseValidEventDate = (dateString) => {
  if (typeof dateString !== 'string') {
    return null;
  }

  const trimmed = dateString.trim();
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(trimmed)) {
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

export const createLost = async (req, res) => {
  try {
    const {
      itemName,
      category,
      description,
      location,
      eventDate,
      reporterName,
      reporterContact,
    } = req.body;

    // Jika eventDate dikirim (termasuk string kosong/whitespace/null), validasi format YYYY-MM-DD
    let parsedDate;
    if (eventDate !== undefined) {
      parsedDate = parseValidEventDate(eventDate);
      if (!parsedDate) {
        if (req.file) {
          deleteFile(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'Validasi gagal',
          errors: ['Tanggal kehilangan harus menggunakan format YYYY-MM-DD yang valid'],
        });
      }
    }

    // Whitelist field untuk POST (status tidak diterima dari client, menggunakan default model)
    const itemData = {
      itemName,
      category,
      description,
      location,
      eventDate: parsedDate,
      reporterName,
      reporterContact,
    };

    // Jika ada file yang diupload, simpan path relatifnya
    if (req.file) {
      itemData.image = 'uploads/' + req.file.filename;
    }

    let createdItem;
    try {
      createdItem = await createLostItem(itemData);
    } catch (dbError) {
      // Jika penyimpanan ke database gagal, hapus file yang sudah terupload agar tidak menjadi orphan
      if (req.file) {
        deleteFile(req.file.path);
      }
      throw dbError;
    }

    return res.status(201).json({
      success: true,
      message: 'Laporan kehilangan berhasil ditambahkan',
      data: createdItem,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors,
      });
    }

    console.error('Error pada createLost:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      errors: ['Terjadi kesalahan internal pada server'],
    });
  }
};

const ALLOWED_CATEGORIES = ['Elektronik', 'Dokumen', 'Aksesoris', 'Pakaian', 'Lainnya'];
const ALLOWED_LOST_STATUSES = ['Belum ditemukan', 'Ditemukan'];

// Amankan karakter spesial regex untuk mencegah regex injection pada query pencarian
const escapeRegex = (text) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const getAllLost = async (req, res) => {
  try {
    // 1. Ambil seluruh query parameter & tolak format bracket operator (misal location[$ne]) pada Express 5
    const allowedQueryKeys = ['category', 'location', 'status', 'search'];
    for (const key of Object.keys(req.query)) {
      const hasBracketOnAllowedKey = allowedQueryKeys.some((param) =>
        key.startsWith(`${param}[`)
      );
      if (hasBracketOnAllowedKey) {
        return res.status(400).json({
          success: false,
          message: 'Validasi gagal',
          errors: [`Format parameter ${key} tidak valid`],
        });
      }
    }

    const { category, location, status, search } = req.query;

    // 2 & 3. Validasi tipe setiap parameter yang dikirim; segera return 400 jika bukan string
    const queryParams = { category, location, status, search };
    for (const [paramName, paramValue] of Object.entries(queryParams)) {
      if (paramValue !== undefined && typeof paramValue !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Validasi gagal',
          errors: [`Parameter ${paramName} harus berupa teks`],
        });
      }
    }

    // 4. Trim nilai string dan abaikan nilai kosong/whitespace
    const trimmedCategory = category ? category.trim() : '';
    const trimmedLocation = location ? location.trim() : '';
    const trimmedStatus = status ? status.trim() : '';
    const trimmedSearch = search ? search.trim() : '';

    // 5 & 6. Validasi kategori dan status; return 400 jika tidak valid
    let matchedCategory = '';
    if (trimmedCategory !== '') {
      matchedCategory = ALLOWED_CATEGORIES.find(
        (c) => c.toLowerCase() === trimmedCategory.toLowerCase()
      );
      if (!matchedCategory) {
        return res.status(400).json({
          success: false,
          message: 'Validasi gagal',
          errors: [
            'Kategori tidak valid. Pilih salah satu: Elektronik, Dokumen, Aksesoris, Pakaian, Lainnya',
          ],
        });
      }
    }

    if (trimmedStatus !== '' && !ALLOWED_LOST_STATUSES.includes(trimmedStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors: [
          'Status tidak valid untuk laporan kehilangan. Pilih: Belum ditemukan atau Ditemukan',
        ],
      });
    }

    // 7. Setelah semua validasi lolos, baru bangun objek filter
    const filter = {};
    if (matchedCategory !== '') {
      filter.category = matchedCategory;
    }
    if (trimmedLocation !== '') {
      filter.location = { $regex: escapeRegex(trimmedLocation), $options: 'i' };
    }
    if (trimmedStatus !== '') {
      filter.status = trimmedStatus;
    }
    if (trimmedSearch !== '') {
      const safeSearch = escapeRegex(trimmedSearch);
      filter.$or = [
        { itemName: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    // 8. Panggil service dengan filter yang sudah aman
    const items = await getAllLostItems(filter);

    return res.status(200).json({
      success: true,
      message: 'Daftar laporan kehilangan berhasil diambil',
      data: items,
    });
  } catch (error) {
    console.error('Error pada getAllLost:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      errors: ['Terjadi kesalahan internal pada server'],
    });
  }
};

export const getLostById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID laporan tidak valid',
        errors: ['Format ID tidak valid'],
      });
    }

    const item = await getLostItemById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Laporan kehilangan tidak ditemukan',
        errors: ['Data laporan kehilangan dengan ID tersebut tidak ditemukan'],
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Detail laporan kehilangan berhasil diambil',
      data: item,
    });
  } catch (error) {
    console.error('Error pada getLostById:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      errors: ['Terjadi kesalahan internal pada server'],
    });
  }
};

export const updateLost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      if (req.file) {
        deleteFile(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'ID laporan tidak valid',
        errors: ['Format ID tidak valid'],
      });
    }

    const allowedFields = [
      'itemName',
      'category',
      'description',
      'location',
      'eventDate',
      'reporterName',
      'reporterContact',
      'status',
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (updateData.eventDate !== undefined) {
      const parsedDate = parseValidEventDate(updateData.eventDate);
      if (!parsedDate) {
        if (req.file) {
          deleteFile(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'Validasi gagal',
          errors: ['Tanggal kehilangan harus menggunakan format YYYY-MM-DD yang valid'],
        });
      }
      updateData.eventDate = parsedDate;
    }

    // Penanganan foto pada PUT:
    // - Ada file baru (req.file)   → simpan path baru; hapus foto lama setelah DB berhasil diperbarui
    // - body.image === null         → hapus foto (set null di DB); hapus file lama
    // - Tidak ada keduanya         → biarkan foto lama tidak berubah (tidak masuk updateData)
    let oldImagePath = null;

    if (req.file) {
      // Foto baru diupload — ambil foto lama terlebih dahulu untuk dihapus nanti
      const existingItem = await getLostItemById(id);
      if (existingItem && existingItem.image) {
        oldImagePath = existingItem.image;
      }
      updateData.image = 'uploads/' + req.file.filename;
    } else if (req.body.image === null || req.body.image === 'null') {
      // Client secara eksplisit ingin menghapus foto
      const existingItem = await getLostItemById(id);
      if (existingItem && existingItem.image) {
        oldImagePath = existingItem.image;
      }
      updateData.image = null;
    }

    let updatedItem;
    try {
      updatedItem = await updateLostItem(id, updateData);
    } catch (dbError) {
      // DB gagal setelah foto baru terupload → hapus foto baru agar tidak menjadi orphan
      if (req.file) {
        deleteFile(req.file.path);
      }
      throw dbError;
    }

    if (!updatedItem) {
      // Item tidak ditemukan → hapus foto baru yang sudah terupload
      if (req.file) {
        deleteFile(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Laporan kehilangan tidak ditemukan',
        errors: ['Data laporan kehilangan dengan ID tersebut tidak ditemukan'],
      });
    }

    // DB berhasil diperbarui → hapus foto lama (jika ada)
    if (oldImagePath) {
      deleteFile(oldImagePath);
    }

    return res.status(200).json({
      success: true,
      message: 'Laporan kehilangan berhasil diperbarui',
      data: updatedItem,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors,
      });
    }

    console.error('Error pada updateLost:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      errors: ['Terjadi kesalahan internal pada server'],
    });
  }
};

export const deleteLost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID laporan tidak valid',
        errors: ['Format ID tidak valid'],
      });
    }

    const deletedItem = await deleteLostItem(id);

    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        message: 'Laporan kehilangan tidak ditemukan',
        errors: ['Data laporan kehilangan dengan ID tersebut tidak ditemukan'],
      });
    }

    // Hapus file foto setelah data berhasil dihapus dari database.
    // Jika file gagal dihapus (misalnya sudah tidak ada), catat error dan lanjutkan.
    if (deletedItem.image) {
      deleteFile(deletedItem.image);
    }

    return res.status(200).json({
      success: true,
      message: 'Laporan kehilangan berhasil dihapus',
      data: deletedItem,
    });
  } catch (error) {
    console.error('Error pada deleteLost:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      errors: ['Terjadi kesalahan internal pada server'],
    });
  }
};
