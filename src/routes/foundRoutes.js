import express from 'express';
import {
  createFound,
  getAllFound,
  getFoundById,
  updateFound,
  deleteFound,
} from '../controllers/foundController.js';
import { handleUpload } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.post('/', handleUpload, createFound);
router.get('/', getAllFound);
router.get('/:id', getFoundById);
router.put('/:id', handleUpload, updateFound);
router.delete('/:id', deleteFound);

export default router;
