import express from 'express';
import { createLiveClass, getLiveClasses, joinLiveClass } from '../controllers/liveClassController.js';
import { protect, checkVerified, authorize } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .post(protect, checkVerified, authorize(['admin', 'instructor']), createLiveClass);

router.route('/course/:courseId')
  .get(protect, checkVerified, getLiveClasses);

router.route('/:liveClassId/join')
  .get(protect, checkVerified, joinLiveClass);

export default router;