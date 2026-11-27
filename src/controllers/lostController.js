import mongoose from 'mongoose';
import {
  createLostItem,
  getAllLostItems,
  getLostItemById,
  updateLostItem,
  deleteLostItem,
} from '../services/lostService.js';
import {
  deleteFile,
  parseValidEventDate,
  buildFilterFromQuery,
} from '../utils/reportHelpers.js';

const ALLOWED_LOST_STATUSES = ['Belum ditemukan', 'Ditemukan'];

export const createLost = async (req, res, next) => {
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
          await deleteFile(req.file.path);
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

    if (req.file) {
      itemData.image = 'uploads/' + req.file.filename;
    }

    let createdItem;
    try {
      createdItem = await createLostItem(itemData);
    } catch (dbError) {
      // Jika penyimpanan ke database gagal, hapus file yang sudah terupload agar tidak menjadi orphan
      if (req.file) {
        await deleteFile(req.file.path);
      }
      throw dbError;
    }

    return res.status(201).json({
      success: true,
      message: 'Laporan kehilangan berhasil ditambahkan',
      data: createdItem,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllLost = async (req, res, next) => {
  try {
    const { filter, error } = buildFilterFromQuery(
      req.query,
      ALLOWED_LOST_STATUSES,
      'Status tidak valid. Pilih salah satu: Belum ditemukan, Ditemukan'
    );

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors: [error],
      });
    }

    const items = await getAllLostItems(filter);

    return res.status(200).json({
      success: true,
      message: 'Daftar laporan kehilangan berhasil diambil',
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

export const getLostById = async (req, res, next) => {
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
    next(error);
  }
};

export const updateLost = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      if (req.file) {
        await deleteFile(req.file.path);
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
          await deleteFile(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'Validasi gagal',
          errors: ['Tanggal kehilangan harus menggunakan format YYYY-MM-DD yang valid'],
        });
      }
      updateData.eventDate = parsedDate;
    }

    // Penanganan foto pada PUT (ganti foto baru, hapus eksplisit via null, atau pertahankan foto lama)
    let oldImagePath = null;
    if (req.file) {
      const existingItem = await getLostItemById(id);
      if (existingItem && existingItem.image) {
        oldImagePath = existingItem.image;
      }
      updateData.image = 'uploads/' + req.file.filename;
    } else if (req.body.image === null || req.body.image === 'null') {
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
      if (req.file) {
        await deleteFile(req.file.path);
      }
      throw dbError;
    }

    if (!updatedItem) {
      if (req.file) {
        await deleteFile(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Laporan kehilangan tidak ditemukan',
        errors: ['Data laporan kehilangan dengan ID tersebut tidak ditemukan'],
      });
    }

    if (oldImagePath) {
      await deleteFile(oldImagePath);
    }

    return res.status(200).json({
      success: true,
      message: 'Laporan kehilangan berhasil diperbarui',
      data: updatedItem,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLost = async (req, res, next) => {
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

    // Hapus file foto setelah data berhasil dihapus dari database
    if (deletedItem.image) {
      await deleteFile(deletedItem.image);
    }

    return res.status(200).json({
      success: true,
      message: 'Laporan kehilangan berhasil dihapus',
      data: deletedItem,
    });
  } catch (error) {
    next(error);
  }
};
