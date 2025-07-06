import express from 'express';
import {
  enrollInstructor,
  enrollStudent,
  getAllInstructors,
  getAllStudents,
  createCourse,
  updateCourse,
  deleteCourse,
  approveCourse,
  getEnrollmentAnalytics,
  getRevenueAnalytics,
  getSkillGapAnalytics,
  getDropOutAnalytics,
  getStudentActivity,
  getInstructorActivity,
  getAllSupportTickets,
  resolveSupportTicket,
  getTicketMetrics,
  exportProgressReport,
  getStudentProgress,
  getCoursesByInstructor,
  InstructorActiveStatus,
  StudentActiveStatus,
  downloadSupportTicket,
  getTotalEnrollments,
  getCourseStudents
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadThumbnail, uploadPromoVideo } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Protect all routes and restrict to admin role
router.use(protect, authorize('admin'));

// User Management Routes
router.post('/users/instructors', enrollInstructor);
router.patch('/users/instructors/:instructorId/toggle-active', InstructorActiveStatus);
router.post('/users/students', enrollStudent);
router.patch('/users/students/:studentId/toggle-active', StudentActiveStatus);
router.get('/users/instructors', getAllInstructors);
router.get('/users/students', getAllStudents);

// Course Management Routes
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);
router.patch('/courses/:id/approve', approveCourse);
router.post('/courses/:id/thumbnail', uploadThumbnail, (req, res, next) => {
  req.body.url = req.file ? req.file.path : null;
  req.body.cloudinaryPublicId = req.file ? req.file.filename : null;
  next();
}, updateCourse);
router.post('/courses/:id/promo-video', uploadPromoVideo, (req, res, next) => {
  req.body.promoVideoUrl = req.file ? req.file.path : null;
  req.body.promoVideoPublicId = req.file ? req.file.filename : null;
  next();
}, updateCourse);

// Course Students Route
router.get('/courses/:courseId/students', getCourseStudents);

// Analytics Routes
router.get('/analytics/enrollments', getEnrollmentAnalytics);
router.get('/analytics/total-enrollments', getTotalEnrollments);
router.get('/analytics/revenue', getRevenueAnalytics);
router.get('/analytics/skill-gap', getSkillGapAnalytics);
router.get('/analytics/drop-out', getDropOutAnalytics);
router.get('/analytics/student-activity', getStudentActivity);
router.get('/analytics/instructor-activity', getInstructorActivity);
router.get('/analytics/export-progress', exportProgressReport);

// Student Progress Route
router.get('/students/:studentId/courses/:courseId/progress', getStudentProgress);

// View Courses by Instructor
router.get('/instructors/:instructorId/courses', getCoursesByInstructor);

// Support Ticket Routes
router.get('/tickets', getAllSupportTickets);
router.patch('/tickets/:id/resolve', resolveSupportTicket);
router.get('/tickets/:id/download', downloadSupportTicket);
router.get('/tickets/metrics', getTicketMetrics);

export default router;