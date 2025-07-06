import Progress from '../models/Progress.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';

// @desc    Get progress for a specific student in a course
// @route   GET /api/v1/progress/:courseId/:studentId
// @access  Private/Instructor/Admin
export const getStudentProgress = asyncHandler(async (req, res) => {
  const { courseId, studentId } = req.params;
  const user = req.user;

  

  // Validate ObjectIds
  if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid course or student ID'
    });
  }

  // Check if the course exists
  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check if the user is authorized (instructor of the course or admin)
  if (user.role === 'instructor' && course.instructor.toString() !== user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this progress'
    });
  }

  // Verify the student exists and has role 'student'
  const student = await User.findOne({ _id: studentId, role: 'student' });
  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  const progress = await Progress.findOne({ course: courseId, student: studentId })
    .populate({
      path: 'student',
      model: 'User',
      select: 'firstName lastName email role',
      match: { role: 'student' }
    })
    .populate({
      path: 'course',
      select: 'title'
    })
    .populate({
      path: 'curriculumProgress.section',
      select: 'sectionTitle'
    })
    .populate({
      path: 'curriculumProgress.lecture',
      select: 'title'
    })
    .populate({
      path: 'assessmentProgress.assessment',
      select: 'title type'
    });

  if (!progress) {
    return res.status(404).json({
      success: false,
      message: 'Progress not found for this student in this course'
    });
  }

  res.status(200).json({
    success: true,
    data: progress
  });
});

// @desc    Get all students' progress for a course
// @route   GET /api/v1/progress/course/:courseId
// @access  Private/Instructor/Admin
export const getCourseStudentsProgress = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const user = req.user;

  

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    
    return res.status(400).json({
      success: false,
      message: 'Invalid course ID'
    });
  }

  // Check if the course exists
  const course = await Course.findById(courseId);
  
  if (!course) {
    
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check if the user is authorized (instructor of the course or admin)
  if (user && user.role === 'instructor' && course.instructor.toString() !== user._id.toString()) {
    
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this course progress'
    });
  }

  // Find all progress records for the course
  const progress = await Progress.find({ course: courseId })
    .populate({
      path: 'student',
      model: 'User',
      select: 'firstName lastName email role',
      match: { role: 'student' }
    })
    .populate({
      path: 'course',
      select: 'title'
    })
    .select('overallProgress curriculumProgress assessmentProgress lastAccessed');

  

  res.status(200).json({
    success: true,
    count: progress.length,
    data: progress
  });
});

// @desc    Get all progress for a specific student across all their courses
// @route   GET /api/v1/progress/student/:studentId
// @access  Private/Admin
export const getStudentAllProgress = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const user = req.user;

  

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    
    return res.status(400).json({
      success: false,
      message: 'Invalid student ID'
    });
  }

  // Verify the student exists and has role 'student'
  const student = await User.findOne({ _id: studentId, role: 'student' });
  
  if (!student) {
    
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  // Check if the user is authorized (admin only)
  if (user && user.role !== 'admin') {
    
    return res.status(403).json({
      success: false,
      message: `User role ${user.role} is not authorized to access this route`
    });
  }

  // Find all progress records for the student
  const progress = await Progress.find({ student: studentId })
    .populate({
      path: 'student',
      model: 'User',
      select: 'firstName lastName email role',
      match: { role: 'student' }
    })
    .populate({
      path: 'course',
      select: 'title'
    })
    .select('overallProgress curriculumProgress assessmentProgress lastAccessed');

  

  res.status(200).json({
    success: true,
    count: progress.length,
    data: progress
  });
});

export default {
  getStudentProgress,
  getCourseStudentsProgress,
  getStudentAllProgress
};