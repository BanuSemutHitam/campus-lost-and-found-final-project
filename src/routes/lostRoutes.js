import express from 'express';
import {
  createLost,
  getAllLost,
  getLostById,
  updateLost,
  deleteLost,
} from '../controllers/lostController.js';
import { handleUpload } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.post('/', handleUpload, createLost);
router.get('/', getAllLost);
router.get('/:id', getLostById);
router.put('/:id', handleUpload, updateLost);
router.delete('/:id', deleteLost);

export default router;
