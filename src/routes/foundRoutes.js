import express from 'express';
import {
  createFound,
  getAllFound,
  getFoundById,
  updateFound,
  deleteFound,
} from '../controllers/foundController.js';

const router = express.Router();

router.post('/', createFound);
router.get('/', getAllFound);
router.get('/:id', getFoundById);
router.put('/:id', updateFound);
router.delete('/:id', deleteFound);

export default router;
