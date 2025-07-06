import express from 'express';
import {
  createContact,
  getAllContacts,
  getContactById,
  deleteContact,
} from '../controllers/contactController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public route
router.post('/', createContact);

// Admin-only routes
router.get('/', protect, authorize('admin'), getAllContacts);  // Protect + Admin role check
router.get('/:id', protect, authorize('admin'), getContactById);  // Protect + Admin role check
router.delete('/:id', protect, authorize('admin'), deleteContact);  // Protect + Admin role check

export default router;