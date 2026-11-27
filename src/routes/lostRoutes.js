import express from 'express';
import {
  createLost,
  getAllLost,
  getLostById,
  updateLost,
  deleteLost,
} from '../controllers/lostController.js';

const router = express.Router();

router.post('/', createLost);
router.get('/', getAllLost);
router.get('/:id', getLostById);
router.put('/:id', updateLost);
router.delete('/:id', deleteLost);

export default router;
