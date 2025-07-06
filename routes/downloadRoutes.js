// routes/downloadRoutes.js
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { downloadContentAsPDF, getDownloadableContent } from '../controllers/downloadController.js';

const router = express.Router();

router.use(protect);
router.use(authorize('student'));

router.get('/courses/:courseId/downloadable-content', getDownloadableContent);
router.get('/courses/:courseId/content/:contentId/download', downloadContentAsPDF);

export default router;