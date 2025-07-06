import express from 'express';
import { protect, authorize, checkVerified } from '../middleware/auth.js';
import { uploadThumbnail, uploadPromoVideo, uploadContent } from '../middleware/uploadMiddleware.js';
import {
  getInstructorProfile,
  updateInstructorProfile,
  getMyCourses,
  getCourse,
  createCourse,
  updateCourse,
  uploadCourseThumbnail,
  uploadCoursePromoVideo,
  uploadCourseContent,
  updateCourseContent,
  deleteCourseContent,
  getCourseStudents,
  getStudentProgress,
  createAssessment,
  getCourseAssessments,
  getAssessment,
  updateAssessment,
  deleteAssessment,
  getSubmittedAssessments,
  gradeAssessment,
  getEarnings
} from '../controllers/instructorController.js';

const router = express.Router();

// Protect all routes
router.use(protect);
router.use(authorize('instructor'));
router.use(checkVerified);
// router.use(checkApproved);

// Profile routes
router.route('/profile')
  .get(getInstructorProfile)
  .put(updateInstructorProfile);

// Course routes
router.route('/courses')
  .get(getMyCourses)
  .post(createCourse);

router.route('/courses/:id')
  .get(getCourse)
  .put(updateCourse);

router.post('/courses/:id/thumbnail', uploadThumbnail, uploadCourseThumbnail);
router.post('/courses/:id/promo-video', uploadPromoVideo, uploadCoursePromoVideo);
router.post('/courses/:id/content', uploadContent, uploadCourseContent);
router.put('/courses/:id/content/:contentId', uploadContent, updateCourseContent);
router.delete('/courses/:id/content/:contentId', deleteCourseContent);

// Student progress
router.get('/courses/:courseId/students', getCourseStudents);
router.get('/courses/:courseId/students/:studentId/progress', getStudentProgress);

// Assessments
router.route('/courses/:courseId/assessments')
  .get(getCourseAssessments)
  .post(createAssessment);

router.get('/courses/:courseId/assessments/submitted', getSubmittedAssessments);

router.route('/courses/:courseId/assessments/:assessmentId')
  .get(getAssessment)
  .put(updateAssessment)
  .delete(deleteAssessment);

router.put('/assessments/:assessmentId/grade', gradeAssessment);

// Earnings
router.get('/earnings', getEarnings);

export default router;