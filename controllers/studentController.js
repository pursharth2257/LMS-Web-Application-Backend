import Student from '../models/Student.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Progress from '../models/Progress.js';
import Assessment from '../models/Assessment.js';
import Certificate from '../models/Certificate.js';
import Notification from '../models/Notification.js';
import SupportTicket from '../models/SupportTicket.js';
import Payment from '../models/Payment.js'
import mongoose from 'mongoose';
import { checkAndAssignBadges } from '../services/badgeService.js';

// Get student profile
export const getStudentProfile = async (req, res, next) => {
  try {
    const student = await Student.findById(req.user.id)
      .select('-password -otp -otpExpires -resetPasswordToken -resetPasswordExpire');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

// Check Student Status
export const checkStudentStatus = async (req, res, next) => {
  try {

    // If studentId is provided (admin checking another student), use it; otherwise, use the authenticated user's ID
    const studentId = req.params.studentId || req.user.id;

    // Ensure the user is either an admin or the student themselves
    if (req.user.role !== 'admin' && req.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to check this student’s status'
      });
    }

    // Fetch the student
    const student = await Student.findById(studentId).select('firstName lastName email isActive');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if the student is active
    const isActive = student.isActive;

    res.status(200).json({
      success: true,
      data: {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        isActive: isActive,
        statusMessage: isActive ? 'Student is active' : 'Student is inactive. Please contact an admin.'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update student profile
export const updateStudentProfile = async (req, res, next) => {
  try {
    const { education, occupation, skills, interests } = req.body;

    const student = await Student.findByIdAndUpdate(
      req.user.id,
      { education, occupation, skills, interests },
      { new: true, runValidators: true }
    ).select('-password -otp -otpExpires -resetPasswordToken -resetPasswordExpire');

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

// Enroll in a course
export const enrollInCourse = async (req, res, next) => {
  try {
    const { courseId, paymentId } = req.body;

    // Validate input
    if (!courseId || !paymentId) {
      return res.status(400).json({ success: false, message: 'courseId and paymentId are required' });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid courseId' });
    }
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({ success: false, message: 'Invalid paymentId' });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Check if payment exists and is completed
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    if (payment.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Payment is not completed' });
    }
    if (payment.student.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Payment does not belong to this user' });
    }
    if (payment.course.toString() !== courseId) {
      return res.status(400).json({ success: false, message: 'Payment does not match the course' });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: req.user.id,
      course: courseId
    });
    if (existingEnrollment) {
      return res.status(400).json({ success: false, message: 'Already enrolled in this course' });
    }

    // Start a transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create enrollment
      const enrollment = await Enrollment.create([{
        student: req.user.id,
        course: courseId,
        status: 'active',
        payment: paymentId
      }], { session });

      // Create initial progress record
      await Progress.create([{
        student: req.user.id,
        course: courseId,
        enrollment: enrollment[0]._id,
        curriculumProgress: [],
        assessmentProgress: [],
        overallProgress: 0
      }], { session });

      // Update student's enrolled courses
      await Student.findByIdAndUpdate(req.user.id, {
        $push: {
          enrolledCourses: {
            course: courseId,
            enrollmentDate: Date.now()
          }
        }
      }, { session });

      // Update course's total students
      await Course.findByIdAndUpdate(courseId, {
        $inc: { totalStudents: 1 }
      }, { session });

      // Create notification
      await Notification.create([{
        user: req.user.id,
        title: 'Course Enrollment',
        message: `You have successfully enrolled in ${course.title}!`,
        type: 'course',
        relatedEntity: courseId,
        relatedEntityModel: 'Course'
      }], { session });

      await session.commitTransaction();
      session.endSession();

      res.status(201).json({ success: true, data: enrollment[0] });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Transaction error in enrollInCourse:', error);
      throw new Error(`Enrollment failed: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in enrollInCourse:', error);
    next(error);
  }
};

// Get enrolled courses
export const getEnrolledCourses = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({ student: req.user.id })
      .populate({
        path: 'course',
        select: 'title description thumbnail instructor duration price discountPrice rating totalRatings',
        populate: {
          path: 'instructor',
          select: 'firstName lastName avatar',
          model: 'User', // Fallback to User model
          match: { role: 'instructor' } // Ensure only instructors are populated
        }
      })
      .sort({ enrollmentDate: -1 });

    res.status(200).json({ success: true, data: enrollments });
  } catch (error) {
    next(error);
  }
};

// Get course progress
export const getCourseProgress = async (req, res, next) => {
  try {
    const progress = await Progress.findOne({
      student: req.user.id,
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

// Update progress
export const updateProgress = async (req, res, next) => {
  try {
    const { sectionId, lectureId, timeSpent } = req.body;

    // Validate input
    if (!sectionId || !lectureId || !timeSpent) {
      return res.status(400).json({ success: false, message: 'sectionId, lectureId, and timeSpent are required' });
    }

    // Find the course to validate section and lecture
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Check if section and lecture exist in the course curriculum
    const section = course.curriculum.id(sectionId);
    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }
    const lecture = section.lectures.id(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    // Update or initialize progress
    const progress = await Progress.findOneAndUpdate(
      {
        student: req.user.id,
        course: req.params.courseId
      },
      [
        // Stage 1: Check if curriculumProgress entry exists
        {
          $set: {
            curriculumProgress: {
              $cond: {
                if: {
                  $in: [
                    { section: new mongoose.Types.ObjectId(sectionId), lecture: new mongoose.Types.ObjectId(lectureId) },
                    '$curriculumProgress'
                  ]
                },
                then: '$curriculumProgress', // Keep existing entries
                else: {
                  $concatArrays: [
                    '$curriculumProgress',
                    [{
                      section: new mongoose.Types.ObjectId(sectionId),
                      lecture: new mongoose.Types.ObjectId(lectureId),
                      completed: false,
                      timeSpent: 0,
                      lastAccessed: new Date()
                    }]
                  ]
                }
              }
            },
            lastAccessed: new Date()
          }
        },
        // Stage 2: Update the matching curriculumProgress entry
        {
          $set: {
            curriculumProgress: {
              $map: {
                input: '$curriculumProgress',
                as: 'entry',
                in: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$$entry.section', new mongoose.Types.ObjectId(sectionId)] },
                        { $eq: ['$$entry.lecture', new mongoose.Types.ObjectId(lectureId)] }
                      ]
                    },
                    then: {
                      $mergeObjects: [
                        '$$entry',
                        {
                          timeSpent: { $add: ['$$entry.timeSpent', timeSpent] },
                          lastAccessed: new Date()
                        }
                      ]
                    },
                    else: '$$entry'
                  }
                }
              }
            }
          }
        }
      ],
      { new: true }
    );

    if (!progress) {
      return res.status(404).json({ success: false, message: 'Progress not found' });
    }

    res.status(200).json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};




// Complete a lecture
export const completeLecture = async (req, res, next) => {
  try {
    const { courseId, lectureId } = req.params;

    // Validate input
    if (!lectureId) {
      return res.status(400).json({ success: false, message: 'lectureId is required' });
    }

    // Validate ObjectID
    if (!mongoose.Types.ObjectId.isValid(lectureId)) {
      return res.status(400).json({ success: false, message: 'Invalid lectureId' });
    }

    // Find the course to validate lecture
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Find the section containing the lecture
    let sectionId = null;
    for (const section of course.curriculum) {
      const lecture = section.lectures.id(lectureId);
      if (lecture) {
        sectionId = section._id;
        break;
      }
    }

    if (!sectionId) {
      return res.status(404).json({ success: false, message: 'Lecture not found in course curriculum' });
    }

    // Find the progress document
    let progress = await Progress.findOne({
      student: req.user.id,
      course: courseId
    });

    if (!progress) {
      return res.status(404).json({ success: false, message: 'Progress not found' });
    }

    // Check if curriculumProgress contains the section and lecture
    const progressEntry = progress.curriculumProgress.find(
      entry => entry.section.toString() === sectionId.toString() && entry.lecture.toString() === lectureId
    );

    if (!progressEntry) {
      // Add a new entry to curriculumProgress
      progress.curriculumProgress.push({
        section: sectionId,
        lecture: lectureId,
        completed: false,
        timeSpent: 0,
        lastAccessed: Date.now()
      });
      await progress.save();
    }

    // Update the progress entry to mark lecture as completed
    progress = await Progress.findOneAndUpdate(
      {
        student: req.user.id,
        course: courseId
      },
      {
        $set: {
          'curriculumProgress.$[elem].completed': true,
          'curriculumProgress.$[elem].completionDate': Date.now(),
          lastAccessed: Date.now()
        }
      },
      {
        arrayFilters: [
          {
            'elem.section': new mongoose.Types.ObjectId(sectionId),
            'elem.lecture': new mongoose.Types.ObjectId(lectureId)
          }
        ],
        new: true
      }
    );

    // Calculate new overall progress
const totalLectures = course.curriculum.reduce(
  (total, section) => total + section.lectures.length,
  0
);
const completedLectures = progress.curriculumProgress.filter(
  item => item.completed
).length;
const newProgress = Math.round((completedLectures / totalLectures) * 100);

// Update overall progress
progress.overallProgress = newProgress;
await progress.save();

// Update enrollment progress
await Enrollment.findOneAndUpdate(
  { student: req.user.id, course: courseId },
  { progress: newProgress }
);

// ✅ Check for 100% completion and assign badges
if (newProgress === 100) {
  const user = await User.findById(req.user.id);
  if (!user.completedCourses) user.completedCourses = [];
  if (!user.completedCourses.includes(course._id)) {
    user.completedCourses.push(course._id);
    await user.save();
  }

  // ✅ Trigger badge assignment
  await checkAndAssignBadges(req.user.id);
}

res.status(200).json({ success: true, data: progress });

  } catch (error) {
    next(error);
  }
};

// Get all assessments for a course
export const getCourseAssessments = async (req, res, next) => {
  try {
    // Check if student is enrolled and active
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: req.params.courseId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'Not enrolled in course or enrollment not active' });
    }

    const assessments = await Assessment.find({
      course: req.params.courseId,
      isPublished: true
    }).sort({ dueDate: 1 });

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
    // Validate assessmentId
    if (!mongoose.Types.ObjectId.isValid(req.params.assessmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid assessment ID' });
    }

    // Check if student is enrolled and active
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: req.params.courseId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'Not enrolled in course or enrollment not active' });
    }

    const assessment = await Assessment.findOne({
      _id: req.params.assessmentId,
      course: req.params.courseId,
      isPublished: true
    });

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found or not published' });
    }

    res.status(200).json({ success: true, data: assessment });
  } catch (error) {
    next(error);
  }
};


export const submitAssessment = async (req, res, next) => {
  try {
    const { answers } = req.body;

    // 1. Get assessment
    const assessment = await Assessment.findById(req.params.assessmentId);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }

    // 2. Calculate score
    let score = 0;
    assessment.questions.forEach(question => {
      if (question.questionType === 'multiple_choice') {
        const selectedOption = answers[question._id];
        const correctOption = question.options.find(opt => opt.isCorrect);
        if (selectedOption === correctOption._id.toString()) {
          score += question.points;
        }
      } else if (question.questionType === 'true_false') {
        if (answers[question._id] === question.correctAnswer) {
          score += question.points;
        }
      }
    });

    const percentage = (score / assessment.totalPoints) * 100;
    const passed = percentage >= (assessment.passPercentage || 60); // default 60% if not set

    // 3. Update assessment progress in Progress model
    const progress = await Progress.findOneAndUpdate(
      {
        student: req.user.id,
        course: req.params.courseId
      },
      {
        $push: {
          assessmentProgress: {
            assessment: req.params.assessmentId,
            status: 'submitted',
            score,
            totalPoints: assessment.totalPoints,
            submissionDate: Date.now()
          }
        }
      },
      { new: true }
    );

    // 4. Push assessment result to User
    await User.findByIdAndUpdate(req.user.id, {
      $push: {
        assessmentResults: {
          course: req.params.courseId,
          score,
          totalPoints: assessment.totalPoints,
          passed,
          takenAt: new Date()
        }
      }
    });

    // 5. Check and assign badges
    await checkAndAssignBadges(req.user.id);

    res.status(200).json({ success: true, data: progress, message: `Assessment submitted successfully. ${passed ? 'Passed ✅' : 'Failed ❌'}` });
  } catch (error) {
    next(error);
  }
};



// Get result of a specific submitted assessment
export const getAssessmentResult = async (req, res, next) => {
  try {
    // Validate assessmentId
    if (!mongoose.Types.ObjectId.isValid(req.params.assessmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid assessment ID' });
    }

    // Check if student is enrolled and active
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: req.params.courseId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'Not enrolled in course or enrollment not active' });
    }

    // Find progress document
    const progress = await Progress.findOne({
      student: req.user.id,
      course: req.params.courseId
    })
      .populate({
        path: 'assessmentProgress.assessment',
        select: 'title type totalPoints passingScore dueDate'
      })
      .select('assessmentProgress');

    if (!progress) {
      return res.status(404).json({ success: false, message: 'Progress not found' });
    }

    // Find the specific assessment progress
    const assessmentProgress = progress.assessmentProgress.find(
      entry => entry.assessment._id.toString() === req.params.assessmentId
    );

    if (!assessmentProgress) {
      return res.status(404).json({ success: false, message: 'Assessment submission not found' });
    }

    // Check if the assessment is submitted or graded
    if (assessmentProgress.status !== 'submitted' && assessmentProgress.status !== 'graded') {
      return res.status(400).json({ success: false, message: 'Assessment has not been submitted' });
    }

    res.status(200).json({
      success: true,
      data: {
        assessment: assessmentProgress.assessment,
        status: assessmentProgress.status,
        score: assessmentProgress.score,
        totalPoints: assessmentProgress.totalPoints,
        submissionDate: assessmentProgress.submissionDate,
        gradingDate: assessmentProgress.gradingDate,
        feedback: assessmentProgress.feedback,
        gradedBy: assessmentProgress.gradedBy
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get certificates
export const getCertificates = async (req, res, next) => {
  try {
    const certificates = await Certificate.find({ student: req.user.id })
      .populate('course', 'title instructor')
      .populate('instructor', 'firstName lastName');

    res.status(200).json({ success: true, data: certificates });
  } catch (error) {
    next(error);
  }
};

// Get notifications
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true, readAt: Date.now() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

// Create support ticket
export const createSupportTicket = async (req, res, next) => {
  try {
    const { subject, message, category, relatedCourse } = req.body;

    const ticket = await SupportTicket.create({
      user: req.user.id,
      subject,
      message,
      category,
      relatedCourse,
      status: 'open'
    });

    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

// Get support tickets
export const getSupportTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('relatedCourse', 'title')
      .populate('assignedTo', 'firstName lastName');

    res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    next(error);
  }
};


import User from '../models/User.js';

export const bookmarkCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    // Find user
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Use Student model for bookmark update
    const student = await Student.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { bookmarkedCourses: courseId } },
      { new: true }
    ).populate('bookmarkedCourses');

    res.status(200).json({ success: true, data: student.bookmarkedCourses });
  } catch (error) {
    next(error);
  }
};




export const removeBookmark = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const student = await Student.findByIdAndUpdate(
      req.user.id,
      { $pull: { bookmarkedCourses: courseId } },
      { new: true }
    ).populate('bookmarkedCourses');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.status(200).json({ success: true, data: student.bookmarkedCourses });
  } catch (error) {
    next(error);
  }
};


export const getBookmarkedCourses = async (req, res, next) => {
  try {
    const student = await Student.findById(req.user.id)
      .populate({
        path: 'bookmarkedCourses',
        model: 'Course'
      });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.status(200).json({
      success: true,
      data: student.bookmarkedCourses
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentBadges = async (req, res, next) => {
  try {
    const studentId = req.params.id;

    const student = await User.findById(studentId)
      .select('badges firstName lastName email')
      .populate({
        path: 'badges',
        select: 'name description icon criteria threshold course isSecret createdAt',
        populate: {
          path: 'course',
          select: 'title' // Optional: include course name if course-specific badge
        }
      });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.status(200).json({
      success: true,
      data: student.badges
    });
  } catch (error) {
    next(error);
  }
};

// controllers/studentAnalyticsController.js


// GET /api/student-analytics/me
export const getMyStudentAnalytics = async (req, res) => {
  try {
    const student = await Student.findById(req.user._id)
      .populate('enrolledCourses.course', 'title')
      .lean();

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const totalCourses = student.enrolledCourses.length;
    const completedCourses = student.enrolledCourses.filter(c => c.completed).length;
    const attendance = student.liveClassSessions || [];
    const attendedSessions = attendance.filter(s => s.attended).length;

    res.json({
      points: student.points,
      badges: student.badges,
      totalCourses,
      completedCourses,
      attendanceRate: attendance.length
        ? Math.round((attendedSessions / attendance.length) * 100)
        : 0,
      leaderboardPosition: student.leaderboardPosition,
      streak: student.streak,
      enrolledCourses: student.enrolledCourses
        .filter(c => c.course) // filter out null or missing courses
        .map(c => ({
          title: c.course.title,
          progress: c.progress,
          completed: c.completed
        }))
    });
  } catch (err) {
    res.status(500).json({
      message: 'Server Error',
      error: err.message
    });
  }
};


// GET /api/student-analytics/all (Admin)
export const getAllStudentAnalytics = async (req, res) => {
  try {
    const students = await Student.find()
      .select('firstName lastName points badges enrolledCourses liveClassSessions leaderboardPosition streak')
      .populate('enrolledCourses.course', 'title')
      .lean();

    const analytics = students.map(student => {
      const totalCourses = student.enrolledCourses.length;
      const completedCourses = student.enrolledCourses.filter(c => c.completed).length;
      const attendedSessions = student.liveClassSessions?.filter(s => s.attended).length || 0;
      const totalSessions = student.liveClassSessions?.length || 0;
      return {
        name: `${student.firstName} ${student.lastName}`,
        points: student.points,
        badges: student.badges.length,
        totalCourses,
        completedCourses,
        attendanceRate: totalSessions ? Math.round((attendedSessions / totalSessions) * 100) : 0,
        leaderboardPosition: student.leaderboardPosition,
        streak: student.streak,
        enrolledCourses: student.enrolledCourses.map(c => ({
          title: c.course?.title || 'Unknown',
          progress: c.progress
        }))
      };
    });

    res.json(analytics);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// GET /api/student-analytics/top?limit=10
export const getTopStudentsAnalytics = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const students = await Student.find()
      .sort({ points: -1 })
      .limit(limit)
      .select('firstName lastName points leaderboardPosition')
      .lean();

    const leaderboard = students.map(s => ({
      name: `${s.firstName} ${s.lastName}`,
      points: s.points,
      leaderboardPosition: s.leaderboardPosition
    }));

    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};
