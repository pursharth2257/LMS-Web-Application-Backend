import express from 'express';
import { 
  createNotification, 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  createCourseNotification,
  getCourseNotifications,
} from '../controllers/notificationController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Routes for notifications
router
  .route('/')
  .post(protect, authorize(['admin', 'instructor']), createNotification)
  .get(protect, getUserNotifications);

// Course-specific notification routes
router
  .route('/course/:courseId')
  .post(protect, authorize(['admin', 'instructor']), createCourseNotification)
  .get(protect, getCourseNotifications);

// Specific routes before dynamic :id route
router
  .route('/mark-all-read')
  .put(protect, markAllNotificationsAsRead);

router
  .route('/delete-all')
  .delete(protect, deleteAllNotifications);

// Dynamic route for individual notification
router
  .route('/:id')
  .put(protect, markNotificationAsRead)
  .delete(protect, deleteNotification);

export default router;