import Course from '../models/Course.js';
import Content from '../models/Content.js';
import Review from '../models/Review.js';
import Enrollment from '../models/Enrollment.js';
import Student from '../models/Student.js'; // Added import for Student model
import mongoose from 'mongoose';

// Get all courses
export const getAllCourses = async (req, res, next) => {
  try {
    // Filtering
    let query = { status: 'published' };

    // Sorting with validation
    let sort = '-createdAt';
    if (req.query.sort) {
      const sortFields = req.query.sort.split(',').map(field => field.trim());
      const validSortFields = ['createdAt', 'rating', 'totalStudents', 'price'];
      if (!sortFields.every(field => validSortFields.includes(field.replace(/^-/, '')))) {
        return res.status(400).json({ success: false, message: 'Invalid sort field' });
      }
      sort = sortFields.join(' ');
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    if (page < 1 || limit < 1) {
      return res.status(400).json({ success: false, message: 'Page and limit must be positive' });
    }
    const skip = (page - 1) * limit;

    const courses = await Course.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('instructor', 'firstName lastName avatar');

    const totalCourses = await Course.countDocuments(query);

    res.status(200).json({
      success: true,
      count: courses.length,
      total: totalCourses,
      page,
      pages: Math.ceil(totalCourses / limit),
      data: courses
    });
  } catch (error) {
    next(error);
  }
};

// Get single course
export const getCourse = async (req, res, next) => {
  try {
    // Validate ObjectID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }

    const course = await Course.findById(req.params.id)
      .populate('instructor', 'firstName lastName avatar bio')
      .populate('reviews.user', 'firstName lastName avatar');

    if (!course || course.status !== 'published') {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    res.status(200).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

// Get course content
export const getCourseContent = async (req, res, next) => {
  try {
    // Validate ObjectID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }

    // Check authentication
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required to access course content' });
    }

    // Check if user is enrolled
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: req.params.id,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(403).json({ 
        success: false, 
        message: 'You must enroll in this course to access its content' 
      });
    }

    const course = await Course.findById(req.params.id)
      .select('curriculum')
      .populate({
        path: 'curriculum.lectures.content',
        select: 'title description type url duration isDownloadable'
      });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    res.status(200).json({ success: true, data: course.curriculum });
  } catch (error) {
    next(error);
  }
};

// Search courses
export const searchCourses = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, message: 'Please provide a search query' });
    }

    const courses = await Course.find({
      $text: { $search: q },
      status: 'published'
    })
      .select('title subtitle thumbnail instructor price discountPrice rating totalStudents')
      .populate('instructor', 'firstName lastName avatar')
      .limit(10);

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    next(error);
  }
};

// Filter courses
export const filterCourses = async (req, res, next) => {
  try {
    const { category, level, minPrice, maxPrice, rating } = req.query;
    let query = { status: 'published' };

    // Case-insensitive filtering
    if (category) {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }
    if (level) {
      query.level = { $regex: new RegExp(`^${level}$`, 'i') };
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (rating) {
      query.rating = { $gte: parseFloat(rating) };
    }

    const courses = await Course.find(query)
      .select('title subtitle thumbnail instructor price discountPrice rating totalStudents')
      .populate('instructor', 'firstName lastName avatar role');

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
      message: courses.length === 0 ? 'No courses found matching the criteria' : undefined
    });
  } catch (error) {
    next(error);
  }
};

// Search courses by category, language, and level
export const searchCoursesByFilters = async (req, res, next) => {
  try {
    const { category, language, level, sort, page, limit } = req.query;
    let query = { status: 'published' };

    // Case-insensitive filtering
    if (category) {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }
      if (language && language !== 'all') {  // Add 'all' as default option
      query.language = { $regex: new RegExp(`^${language}$`, 'i') };
    }
    if (level) {
      const validLevels = ['Beginner', 'Intermediate', 'Advanced'];
      if (!validLevels.includes(level)) {
        return res.status(400).json({ success: false, message: 'Level must be Beginner, Intermediate, or Advanced' });
      }
      query.level = { $regex: new RegExp(`^${level}$`, 'i') };
    }

    // Sorting with validation
    let sortOption = '-createdAt';
    if (sort) {
      const sortFields = sort.split(',').map(field => field.trim());
      const validSortFields = ['createdAt', 'rating', 'totalStudents', 'price'];
      if (!sortFields.every(field => validSortFields.includes(field.replace(/^-/, '')))) {
        return res.status(400).json({ success: false, message: 'Invalid sort field' });
      }
      sortOption = sortFields.join(' ');
    }

    

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({ success: false, message: 'Page and limit must be positive' });
    }
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const courses = await Course.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .select('title subtitle thumbnail instructor price discountPrice rating totalStudents level language category')
      .populate('instructor', 'firstName lastName avatar');

    const totalCourses = await Course.countDocuments(query);

    res.status(200).json({
      success: true,
      count: courses.length,
      total: totalCourses,
      page: pageNum,
      pages: Math.ceil(totalCourses / limitNum),
      data: courses,
      message: courses.length === 0 ? 'No courses found matching the criteria' : undefined
    });
  } catch (error) {
    next(error);
  }
};

// controllers/courseController.js - add this new function
export const getAvailableLanguages = async (req, res, next) => {
  try {
    const languages = await Course.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$language' } },
      { $project: { _id: 0, language: '$_id' } },
      { $sort: { language: 1 } }
    ]);

    // Add 'all' as the default option
    const allLanguages = [{ language: 'all' }, ...languages];

    res.status(200).json({
      success: true,
      data: allLanguages
    });
  } catch (error) {
    // Remove any course ID specific error handling
    next(error);
  }
};
// Get course reviews
export const getCourseReviews = async (req, res, next) => {
  try {
    // Validate ObjectID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }

    const reviews = await Review.find({ course: req.params.id })
      .populate('user', 'firstName lastName avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    next(error);
  }
};

// Create course review
export const createCourseReview = async (req, res, next) => {
  try {
    // Validate ObjectID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }

    // Check authentication
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required to create a review' });
    }

    // Check if user is enrolled in the course
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: req.params.id
    });

    if (!enrollment) {
      return res.status(403).json({ 
        success: false, 
        message: 'You must enroll in this course to leave a review' 
      });
    }

    // Check if user already reviewed this course
    const existingReview = await Review.findOne({
      user: req.user.id,
      course: req.params.id
    });

    if (existingReview) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already reviewed this course' 
      });
    }

    const { rating, comment } = req.body;

    // Validate review input
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Comment is required' });
    }

    const review = await Review.create({
      user: req.user.id,
      course: req.params.id,
      rating,
      comment
    });

    // Update course rating
    await updateCourseRating(req.params.id);

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

// Helper function to update course rating
const updateCourseRating = async (courseId) => {
  const result = await Review.aggregate([
    { $match: { course: new mongoose.Types.ObjectId(courseId) } },
    { 
      $group: {
        _id: '$course',
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);

  if (result.length > 0) {
    await Course.findByIdAndUpdate(courseId, {
      rating: result[0].averageRating,
      totalRatings: result[0].totalRatings
    });
  }
};

// Get popular courses
export const getPopularCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({ status: 'published' })
      .sort({ totalStudents: -1, rating: -1 })
      .limit(8)
      .populate('instructor', 'firstName lastName avatar');

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    next(error);
  }
};

// Get new courses
export const getNewCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({ status: 'published' })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('instructor', 'firstName lastName avatar');

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    next(error);
  }
};

// Get recommended courses
export const getRecommendedCourses = async (req, res, next) => {
  try {
    // For logged-in users, recommend based on their interests
    if (req.user) {
      const student = await Student.findById(req.user.id).select('interests');
      if (student && student.interests.length > 0) {
        const recommended = await Course.find({
          category: { $in: student.interests },
          status: 'published'
        })
          .sort({ rating: -1, totalStudents: -1 })
          .limit(8)
          .populate('instructor', 'firstName lastName avatar');

        return res.status(200).json({
          success: true,
          count: recommended.length,
          data: recommended
        });
      }
    }

    // For non-logged-in users or users without interests, return popular courses
    const courses = await Course.find({ status: 'published' })
      .sort({ rating: -1, totalStudents: -1 })
      .limit(8)
      .populate('instructor', 'firstName lastName avatar');

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    next(error);
  }
};

// Delete course (Instructor only)
export const deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Verify instructor owns the course
    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this course'
      });
    }

    await course.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};