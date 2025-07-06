import express from 'express';
import {
  getAllCourses,
  getCourse,
  getCourseContent,
  searchCourses,
  filterCourses,
  getCourseReviews,
  createCourseReview,
  getPopularCourses,
  getNewCourses,
  deleteCourse,
  getRecommendedCourses,
  getAvailableLanguages,
  searchCoursesByFilters
} from '../controllers/courseController.js';
import { protect } from '../middleware/auth.js';
const router = express.Router();

// Public routes
router.get('/languages', getAvailableLanguages);
router.get('/', getAllCourses);
router.get('/search', searchCourses);
router.get('/filter', filterCourses);
// filter by catagory, language, type
router.get('/search/filters', searchCoursesByFilters);
router.get('/popular', getPopularCourses);
router.get('/new', getNewCourses);
router.get('/recommended', getRecommendedCourses);
router.get('/:id', getCourse);

// Protected routes (require authentication)
router.get('/:id/content', protect, getCourseContent); // Added protect middleware
router.post('/:id/reviews', protect, createCourseReview);

router.delete('/:id', protect, deleteCourse);

router.get('/:id/reviews', getCourseReviews);

export default router;