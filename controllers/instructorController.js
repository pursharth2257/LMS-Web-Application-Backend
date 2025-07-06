import Instructor from '../models/Instructor.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Progress from '../models/Progress.js';
import Assessment from '../models/Assessment.js';
import Content from '../models/Content.js';
import mongoose from 'mongoose';
import { cloudinary } from '../config/cloudinary.js';

// Get instructor profile
export const getInstructorProfile = async (req, res, next) => {
  try {
    const instructor = await Instructor.findById(req.user.id)
      .select('-password -otp -otpExpires -resetPasswordToken -resetPasswordExpire')
      

    if (!instructor) {
      return res.status(404).json({ success: false, message: 'Instructor not found' });
    }

    res.status(200).json({ success: true, data: instructor });
  } catch (error) {
    next(error);
  }
};

// Update instructor profile
export const updateInstructorProfile = async (req, res, next) => {
  try {
    const { bio, expertise, socialLinks } = req.body;

    const instructor = await Instructor.findByIdAndUpdate(
      req.user.id,
      { bio, expertise, socialLinks },
      { new: true, runValidators: true }
    ).select('-password -otp -otpExpires -resetPasswordToken -resetPasswordExpire');

    res.status(200).json({ success: true, data: instructor });
  } catch (error) {
    next(error);
  }
};

// Get instructor's courses
export const getMyCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({ instructor: req.user.id })
      .select('title subtitle thumbnail price discountPrice totalStudents rating status')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: courses });
  } catch (error) {
    next(error);
  }
};

// Get single course
export const getCourse = async (req, res, next) => {
  try {
    // Validate courseId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }

    // Find the course
    const course = await Course.findOne({
      _id: req.params.id,
      instructor: req.user.id
    }).select(
      'title subtitle description category subCategory language level duration price discountPrice prerequisites learningOutcomes curriculum thumbnail promotionalVideo totalStudents rating totalRatings status'
    ).populate({
        path: 'curriculum.lectures.content',
        select: 'title description type url duration isDownloadable'
      })

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found or not authorized' });
    }

    res.status(200).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

// Create a new course
export const createCourse = async (req, res, next) => {
  try {
    const {
      title,
      subtitle,
      description,
      category,
      subCategory,
      language,
      level,
      duration,
      price,
      discountPrice,
      prerequisites,
      learningOutcomes
    } = req.body;

    const course = await Course.create({
      title,
      subtitle,
      description,
      instructor: req.user.id,
      category,
      subCategory,
      language,
      level,
      duration,
      price,
      discountPrice,
      prerequisites,
      learningOutcomes,
      status: 'draft'
    });

    // Update instructor's total courses
    await Instructor.findByIdAndUpdate(req.user.id, {
      $inc: { totalCourses: 1 }
    });

    res.status(201).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

// Update course
export const updateCourse = async (req, res, next) => {
  try {
    const {
      title,
      subtitle,
      description,
      category,
      subCategory,
      language,
      level,
      duration,
      price,
      discountPrice,
      prerequisites,
      learningOutcomes,
      curriculum,
      status
    } = req.body;

    // Check if the course belongs to the instructor
    const course = await Course.findOne({
      _id: req.params.id,
      instructor: req.user.id
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found or not authorized' });
    }

    // Update course
    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      {
        title,
        subtitle,
        description,
        category,
        subCategory,
        language,
        level,
        duration,
        price,
        discountPrice,
        prerequisites,
        learningOutcomes,
        curriculum,
        status
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: updatedCourse });
  } catch (error) {
    next(error);
  }
};

// Upload course thumbnail
export const uploadCourseThumbnail = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, instructor: req.user.id },
      { thumbnail: req.file.path },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found or not authorized' });
    }

    res.status(200).json({ success: true, data: course.thumbnail });
  } catch (error) {
    next(error);
  }
};

// Upload course promo video
export const uploadCoursePromoVideo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, instructor: req.user.id },
      { promotionalVideo: req.file.path },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found or not authorized' });
    }

    res.status(200).json({ success: true, data: course.promotionalVideo });
  } catch (error) {
    next(error);
  }
};

// Upload course content
export const uploadCourseContent = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const {
      sectionId,
      lectureId,
      title,
      description,
      type,
      isDownloadable,
      note // ← NEW: Accept lecture note
    } = req.body;

    // Create content record
    const content = await Content.create({
      title: title || req.file.originalname,
      description,
      type,
      url: req.file.path,
      cloudinaryPublicId: req.file.filename,
      fileSize: req.file.size,
      fileFormat: req.file.mimetype,
      isDownloadable,
      createdBy: req.user.id,
      course: req.params.id
    });

    // Find the course and update the curriculum
    const course = await Course.findOne({
      _id: req.params.id,
      instructor: req.user.id
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found or not authorized' });
    }

    // Find the section and lecture
    const section = course.curriculum.id(sectionId);
    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    const lecture = section.lectures.id(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    // Update lecture content and note
    lecture.content = content._id;
    if (note) {
      lecture.note = note; // ← Add note to lecture
    }

    await course.save();

    res.status(201).json({ success: true, data: content });
  } catch (error) {
    next(error);
  }
};


// Update course content
export const updateCourseContent = async (req, res, next) => {
  try {
    const { contentId } = req.params;
    const { sectionId, lectureId, title, description, type, isDownloadable, note } = req.body;

    // Validate contentId
    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ success: false, message: 'Invalid content ID' });
    }

    // Find the course and verify instructor ownership
    const course = await Course.findOne({
      _id: req.params.id,
      instructor: req.user.id
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found or not authorized' });
    }

    // Find the section and lecture
    const section = course.curriculum.id(sectionId);
    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    const lecture = section.lectures.id(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    // Find the content
    const content = await Content.findOne({
      _id: contentId,
      course: req.params.id,
      createdBy: req.user.id
    });

    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found or not authorized' });
    }

    // Update content fields
    content.title = title || content.title;
    content.description = description || content.description;
    content.type = type || content.type;
    content.isDownloadable = isDownloadable !== undefined ? isDownloadable : content.isDownloadable;

    // Update file if a new one is uploaded
    if (req.file) {
      // Delete old file from Cloudinary if it exists
      if (content.cloudinaryPublicId) {
        await cloudinary.uploader.destroy(content.cloudinaryPublicId);
      }
      content.url = req.file.path;
      content.cloudinaryPublicId = req.file.filename;
      content.fileSize = req.file.size;
      content.fileFormat = req.file.mimetype;
    }

    await content.save();

    // Update lecture note if provided
    if (note !== undefined) {
      lecture.note = note;
      await course.save();
    }

    res.status(200).json({ success: true, data: content });
  } catch (error) {
    next(error);
  }
};

// Delete course content
export const deleteCourseContent = async (req, res, next) => {
  try {
    const { contentId } = req.params;

    // Validate contentId
    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ success: false, message: 'Invalid content ID' });
    }

    // Find the course and verify instructor ownership
    const course = await Course.findOne({
      _id: req.params.id,
      instructor: req.user.id
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found or not authorized' });
    }

    // Find the content
    const content = await Content.findOne({
      _id: contentId,
      course: req.params.id,
      createdBy: req.user.id
    });

    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found or not authorized' });
    }

    // Remove content reference from course curriculum
    course.curriculum.forEach(section => {
      section.lectures.forEach(lecture => {
        if (lecture.content && lecture.content.toString() === contentId) {
          lecture.content = null;
        }
      });
    });

    // Delete file from Cloudinary if it exists
    if (content.cloudinaryPublicId) {
      await cloudinary.uploader.destroy(content.cloudinaryPublicId);
    }

    // Delete the content from the database
    await Content.findByIdAndDelete(contentId);

    // Save the updated course
    await course.save();

    res.status(200).json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    next(error);
  }
};


// Get course students
export const getCourseStudents = async (req, res, next) => {
  try {
    // Check if the course belongs to the instructor
    const course = await Course.findOne({
      _id: req.params.courseId,
      instructor: req.user.id
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found or not authorized' });
    }

    // Fetch enrollments and populate student data
    const enrollments = await Enrollment.find({ course: req.params.courseId })
      .populate({
        path: 'student',
        select: 'firstName lastName email avatar',
        model: 'User', // Fallback to User model
        match: { role: 'student' } // Ensure only students are populated
      })
      .sort({ enrollmentDate: -1 });

    res.status(200).json({ success: true, data: enrollments });
  } catch (error) {
    next(error);
  }
};

// Get student progress
export const getStudentProgress = async (req, res, next) => {
  try {
    const progress = await Progress.findOne({
      student: req.params.studentId,
      course: req.params.courseId
    }).populate('course', 'title curriculum');

    if (!progress) {
      return res.status(404).json({ success: false, message: 'Progress not found' });
    }

    res.status(200).json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};

// Create assessment
export const createAssessment = async (req, res, next) => {
  try {
    const { title, description, type, questions, passingScore, dueDate, timeLimit } = req.body;

    // Check if course belongs to instructor
    const course = await Course.findOne({
      _id: req.params.courseId,
      instructor: req.user.id
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found or not authorized' });
    }

    const assessment = await Assessment.create({
      title,
      description,
      course: req.params.courseId,
      instructor: req.user.id,
      type,
      questions,
      passingScore,
      dueDate,
      timeLimit
    });

    res.status(201).json({ success: true, data: assessment });
  } catch (error) {
    next(error);
  }
};


// Get all assessments for a course
export const getCourseAssessments = async (req, res, next) => {
  try {
    const course = await Course.findOne({
      _id: req.params.courseId,
      instructor: req.user.id
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found or not authorized' });
    }

    const assessments = await Assessment.find({
      course: req.params.courseId,
      instructor: req.user.id
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: assessments.length,
      data: assessments
    });
  } catch (error) {
    next(error);
  }
};

// Get single assessment
export const getAssessment = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.assessmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid assessment ID' });
    }

    const assessment = await Assessment.findOne({
      _id: req.params.assessmentId,
      course: req.params.courseId,
      instructor: req.user.id
    });

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found or not authorized' });
    }

    res.status(200).json({ success: true, data: assessment });
  } catch (error) {
    next(error);
  }
};

// Update assessment
export const updateAssessment = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.assessmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid assessment ID' });
    }

    const { title, description, type, questions, passingScore, dueDate, timeLimit, isPublished } = req.body;

    const assessment = await Assessment.findOne({
      _id: req.params.assessmentId,
      course: req.params.courseId,
      instructor: req.user.id
    });

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found or not authorized' });
    }

    // Calculate totalPoints from questions
    let totalPoints = 0;
    if (questions && Array.isArray(questions)) {
      totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
    }

    const updatedAssessment = await Assessment.findByIdAndUpdate(
      req.params.assessmentId,
      {
        title,
        description,
        type,
        questions,
        totalPoints,
        passingScore,
        dueDate,
        timeLimit,
        isPublished
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: updatedAssessment });
  } catch (error) {
    next(error);
  }
};

// Delete assessment
export const deleteAssessment = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.assessmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid assessment ID' });
    }

    const assessment = await Assessment.findOne({
      _id: req.params.assessmentId,
      course: req.params.courseId,
      instructor: req.user.id
    });

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found or not authorized' });
    }

    // Remove assessment from Progress records
    await Progress.updateMany(
      { course: req.params.courseId },
      { $pull: { assessmentProgress: { assessment: req.params.assessmentId } } }
    );

    // Delete the assessment
    await Assessment.findByIdAndDelete(req.params.assessmentId);

    res.status(200).json({ success: true, message: 'Assessment deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get all submitted assessments for a course
export const getSubmittedAssessments = async (req, res, next) => {
  try {
    // Validate course
    const course = await Course.findOne({
      _id: req.params.courseId,
      instructor: req.user.id
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found or not authorized' });
    }

    // Find progress records with assessment submissions
    const progressRecords = await Progress.find({
      course: req.params.courseId,
      assessmentProgress: { $ne: [] }
    })
      .populate({
        path: 'student',
        select: 'firstName lastName email avatar',
        model: 'User',
        match: { role: 'student' }
      })
      .populate({
        path: 'assessmentProgress.assessment',
        select: 'title type questions totalPoints passingScore dueDate timeLimit',
        model: 'Assessment'
      });

    // Filter and format submissions
    const submissions = [];
    progressRecords.forEach(progress => {
      progress.assessmentProgress.forEach(ap => {
        if (['submitted', 'graded'].includes(ap.status) && ap.assessment) {
          submissions.push({
            assessmentId: ap.assessment._id,
            assessmentTitle: ap.assessment.title,
            assessmentType: ap.assessment.type,
            totalPoints: ap.assessment.totalPoints,
            dueDate: ap.assessment.dueDate,
            student: {
              id: progress.student._id,
              firstName: progress.student.firstName,
              lastName: progress.student.lastName,
              email: progress.student.email
            },
            submission: {
              status: ap.status,
              score: ap.score,
              answers: ap.answers,
              submissionDate: ap.submissionDate,
              gradingDate: ap.gradingDate,
              feedback: ap.feedback
            }
          });
        }
      });
    });

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (error) {
    next(error);
  }
};

// Grade assessment
export const gradeAssessment = async (req, res, next) => {
  try {
    const { studentId, score, feedback } = req.body;

    // Validate input
    if (!studentId || score === undefined) {
      return res.status(400).json({ success: false, message: 'studentId and score are required' });
    }
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid studentId' });
    }

    // Find the assessment
    const assessment = await Assessment.findOne({
      _id: req.params.assessmentId,
      instructor: req.user.id
    });

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found or not authorized' });
    }

    // Validate score
    if (score < 0 || score > assessment.totalPoints) {
      return res.status(400).json({ success: false, message: `Score must be between 0 and ${assessment.totalPoints}` });
    }

    // Find the student's progress
    const progress = await Progress.findOne({
      student: studentId,
      course: assessment.course
    });

    if (!progress) {
      return res.status(404).json({ success: false, message: 'Progress not found' });
    }

    // Find the assessmentProgress subdocument
    const assessmentProgress = progress.assessmentProgress.find(
      ap => ap.assessment.toString() === req.params.assessmentId
    );

    if (!assessmentProgress) {
      return res.status(404).json({ success: false, message: 'Assessment submission not found' });
    }

    // Check if already graded
    if (assessmentProgress.status === 'graded') {
      return res.status(400).json({ success: false, message: 'Assessment already graded' });
    }

    // Update assessment progress
    assessmentProgress.status = 'graded';
    assessmentProgress.score = score;
    assessmentProgress.gradingDate = Date.now();
    assessmentProgress.gradedBy = req.user.id;
    assessmentProgress.feedback = feedback;

    await progress.save();

    // Update overallProgress
    const course = await Course.findById(assessment.course);
    const totalLectures = course.curriculum.reduce((sum, section) => sum + section.lectures.length, 0);
    const completedLectures = progress.curriculumProgress.filter(item => item.completed).length;
    const lectureProgress = totalLectures ? (completedLectures / totalLectures) * 50 : 0; // 50% weight
    const assessmentScoreContribution = assessment.totalPoints ? (score / assessment.totalPoints) * 50 : 0; // 50% weight
    progress.overallProgress = Math.round(lectureProgress + assessmentScoreContribution);
    await progress.save();

    res.status(200).json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};

// Get instructor earnings
export const getEarnings = async (req, res, next) => {
  try {
    const instructor = await Instructor.findById(req.user.id).select('earnings');

    if (!instructor) {
      return res.status(404).json({ success: false, message: 'Instructor not found' });
    }

    // Get courses with earnings data
    const courses = await Course.find({ instructor: req.user.id })
      .select('title thumbnail totalStudents earnings');

    res.status(200).json({
      success: true,
      data: {
        totalEarnings: instructor.earnings,
        courses
      }
    });
  } catch (error) {
    next(error);
  }
};