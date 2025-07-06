import express from 'express';
import {
  getStudentProgress,
  getCourseStudentsProgress,
  getStudentAllProgress
} from '../controllers/progressController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Routes for progress management
// Define more specific routes first
router.get('/course/:courseId',
  protect,
  authorize(['instructor', 'admin']),
  getCourseStudentsProgress
);

router.get('/student/:studentId',
  protect,
  authorize(['admin']),
  getStudentAllProgress
);

router.get('/:courseId/:studentId', 
  protect,
  authorize(['instructor', 'admin']),
  getStudentProgress
);

export default router;