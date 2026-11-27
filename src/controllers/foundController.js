import mongoose from 'mongoose';
import {
  createFoundItem,
  getAllFoundItems,
  getFoundItemById,
  updateFoundItem,
  deleteFoundItem,
} from '../services/foundService.js';
import {
  deleteFile,
  parseValidEventDate,
  buildFilterFromQuery,
} from '../utils/reportHelpers.js';

const ALLOWED_FOUND_STATUSES = ['Belum diklaim', 'Sudah diklaim'];

export const createFound = async (req, res, next) => {
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
          errors: ['Tanggal penemuan harus menggunakan format YYYY-MM-DD yang valid'],
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
      createdItem = await createFoundItem(itemData);
    } catch (dbError) {
      // Jika penyimpanan ke database gagal, hapus file yang sudah terupload agar tidak menjadi orphan
      if (req.file) {
        await deleteFile(req.file.path);
      }
      throw dbError;
    }

    return res.status(201).json({
      success: true,
      message: 'Laporan penemuan berhasil ditambahkan',
      data: createdItem,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllFound = async (req, res, next) => {
  try {
    const { filter, error } = buildFilterFromQuery(
      req.query,
      ALLOWED_FOUND_STATUSES,
      'Status tidak valid. Pilih salah satu: Belum diklaim, Sudah diklaim'
    );

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors: [error],
      });
    }

    const items = await getAllFoundItems(filter);

    return res.status(200).json({
      success: true,
      message: 'Daftar laporan penemuan berhasil diambil',
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

export const getFoundById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID laporan tidak valid',
        errors: ['Format ID tidak valid'],
      });
    }

    const item = await getFoundItemById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Laporan penemuan tidak ditemukan',
        errors: ['Data laporan penemuan dengan ID tersebut tidak ditemukan'],
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Detail laporan penemuan berhasil diambil',
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

export const updateFound = async (req, res, next) => {
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
          errors: ['Tanggal penemuan harus menggunakan format YYYY-MM-DD yang valid'],
        });
      }
      updateData.eventDate = parsedDate;
    }

    // Penanganan foto pada PUT (ganti foto baru, hapus eksplisit via null, atau pertahankan foto lama)
    let oldImagePath = null;
    if (req.file) {
      const existingItem = await getFoundItemById(id);
      if (existingItem && existingItem.image) {
        oldImagePath = existingItem.image;
      }
      updateData.image = 'uploads/' + req.file.filename;
    } else if (req.body.image === null || req.body.image === 'null') {
      const existingItem = await getFoundItemById(id);
      if (existingItem && existingItem.image) {
        oldImagePath = existingItem.image;
      }
      updateData.image = null;
    }

    let updatedItem;
    try {
      updatedItem = await updateFoundItem(id, updateData);
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
        message: 'Laporan penemuan tidak ditemukan',
        errors: ['Data laporan penemuan dengan ID tersebut tidak ditemukan'],
      });
    }

    if (oldImagePath) {
      await deleteFile(oldImagePath);
    }

    return res.status(200).json({
      success: true,
      message: 'Laporan penemuan berhasil diperbarui',
      data: updatedItem,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFound = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID laporan tidak valid',
        errors: ['Format ID tidak valid'],
      });
    }

    const deletedItem = await deleteFoundItem(id);

    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        message: 'Laporan penemuan tidak ditemukan',
        errors: ['Data laporan penemuan dengan ID tersebut tidak ditemukan'],
      });
    }

    // Hapus file foto setelah data berhasil dihapus dari database
    if (deletedItem.image) {
      await deleteFile(deletedItem.image);
    }

    return res.status(200).json({
      success: true,
      message: 'Laporan penemuan berhasil dihapus',
      data: deletedItem,
    });
  } catch (error) {
    next(error);
  }
};
