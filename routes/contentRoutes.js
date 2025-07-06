import express from 'express';
import { protect } from '../middleware/auth.js';
import { updatePlaybackPosition, getPlaybackPosition } from '../controllers/contentController.js';

const router = express.Router();

// Routes for content playback
router
  .route('/:contentId/playback')
  .post(protect, updatePlaybackPosition)
  .get(protect, getPlaybackPosition);

export default router;