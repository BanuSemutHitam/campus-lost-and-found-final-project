import mongoose from 'mongoose';
import {
  createLostItem,
  getAllLostItems,
  getLostItemById,
  updateLostItem,
  deleteLostItem,
} from '../services/lostService.js';

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

    const createdItem = await createLostItem(itemData);

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

export const getAllLost = async (req, res) => {
  try {
    const items = await getAllLostItems();

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
      'image',
      'status',
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (updateData.image !== undefined) {
      if (updateData.image === null) {
        updateData.image = null;
      } else if (typeof updateData.image === 'string') {
        const trimmedImage = updateData.image.trim();
        if (trimmedImage === '') {
          return res.status(400).json({
            success: false,
            message: 'Validasi gagal',
            errors: ['Path gambar tidak boleh kosong; gunakan null untuk menghapus gambar'],
          });
        }
        updateData.image = trimmedImage;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Validasi gagal',
          errors: ['Path gambar harus berupa string yang valid atau null'],
        });
      }
    }

    if (updateData.eventDate !== undefined) {
      const parsedDate = parseValidEventDate(updateData.eventDate);
      if (!parsedDate) {
        return res.status(400).json({
          success: false,
          message: 'Validasi gagal',
          errors: ['Tanggal kehilangan harus menggunakan format YYYY-MM-DD yang valid'],
        });
      }
      updateData.eventDate = parsedDate;
    }

    const updatedItem = await updateLostItem(id, updateData);

    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        message: 'Laporan kehilangan tidak ditemukan',
        errors: ['Data laporan kehilangan dengan ID tersebut tidak ditemukan'],
      });
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
