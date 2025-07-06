import User from '../models/User.js';
import Student from '../models/Student.js';
import Instructor from '../models/Instructor.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Payment from '../models/Payment.js';
import SupportTicket from '../models/SupportTicket.js';
import Assessment from '../models/Assessment.js';
import Progress from '../models/Progress.js';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';

// Enroll an Instructor (No OTP)
export const enrollInstructor = async (req, res, next) => {
  try {
    if (!req.body) {
      return res.status(400).json({ success: false, message: 'Request body is missing' });
    }
    const { firstName, lastName, email, password, phone, expertise, bio } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const instructor = await Instructor.create({
      firstName,
      lastName,
      email,
      password,
      phone,
      role: 'instructor',
      expertise,
      bio,
      approved: false,
      isVerified: true
    });

    res.status(201).json({
      success: true,
      message: 'Instructor enrolled successfully.',
      data: { id: instructor._id, email: instructor.email, role: instructor.role }
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Instructor Active Status (Admin)
export const InstructorActiveStatus = async (req, res, next) => {
    try {
      const { instructorId } = req.params;
      const { isActive } = req.body;
  
      // Validate instructor ID
      if (!mongoose.Types.ObjectId.isValid(instructorId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid instructor ID'
        });
      }
  
      // Validate isActive field
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'isActive must be a boolean value (true or false)'
        });
      }
  
      // Check if instructor exists
      const instructor = await Instructor.findById(instructorId);
      if (!instructor) {
        return res.status(404).json({
          success: false,
          message: 'Instructor not found'
        });
      }
  
      // Update instructor's isActive status
      instructor.isActive = isActive;
      await instructor.save();
  
      res.status(200).json({
        success: true,
        message: `Instructor ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: { id: instructor._id, email: instructor.email, isActive: instructor.isActive }
      });
    } catch (error) {
      console.error('Error toggling instructor active status:', error);
      next(error);
    }
};

// Enroll a Student (No OTP)
export const enrollStudent = async (req, res, next) => {
  try {
    if (!req.body) {
      return res.status(400).json({ success: false, message: 'Request body is missing' });
    }
    const { firstName, lastName, email, password, phone, education, occupation, skills, interests } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const student = await Student.create({
      firstName,
      lastName,
      email,
      password,
      phone,
      role: 'student',
      education,
      occupation,
      skills,
      interests,
      isActive: true,
      isVerified: true
    });

    res.status(201).json({
      success: true,
      message: 'Student enrolled successfully.',
      data: { id: student._id, email: student.email, role: student.role }
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Student Active Status (Admin)
export const StudentActiveStatus = async (req, res, next) => {
    try {
      const { studentId } = req.params;
      const { isActive } = req.body;
  
      // Validate student ID
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid student ID'
        });
      }
  
      // Validate isActive field
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'isActive must be a boolean value (true or false)'
        });
      }
  
      // Check if student exists
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }
  
      // Update student's isActive status
      student.isActive = isActive;
      await student.save();
  
      res.status(200).json({
        success: true,
        message: `Student ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: { id: student._id, email: student.email, isActive: student.isActive }
      });
    } catch (error) {
      console.error('Error toggling student active status:', error);
      next(error);
    }
};

// Get All Instructors
export const getAllInstructors = async (req, res, next) => {
  try {
    const instructors = await Instructor.find({})
      .select('-password -otp -otpExpires -resetPasswordToken -resetPasswordExpire');
    res.status(200).json({
      success: true,
      data: instructors
    });
  } catch (error) {
    next(error);
  }
};

// Get All Students
export const getAllStudents = async (req, res, next) => {
  try {
    const students = await Student.find({})
      .select('-password -otp -otpExpires -resetPasswordToken -resetPasswordExpire');
    res.status(200).json({
      success: true,
      data: students
    });
  } catch (error) {
    next(error);
  }
};

// Create a new course (Admin only)
export const createCourse = async (req, res, next) => {
    try {
      const {
        title,
        subtitle,
        description,
        instructorId, 
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
  
      // Validate required fields
      if (!title || !instructorId) {
        return res.status(400).json({
          success: false,
          message: 'Title and instructorId are required fields'
        });
      }
  
      // Check if instructor exists
      const instructor = await Instructor.findById(instructorId);
      if (!instructor) {
        return res.status(404).json({
          success: false,
          message: 'Instructor not found'
        });
      }
  
      // Create the course
      const course = await Course.create({
        title,
        subtitle,
        description,
        instructor: instructorId,  // Use the provided instructorId
        category,
        subCategory,
        language,
        level,
        duration,
        price,
        discountPrice,
        prerequisites,
        learningOutcomes,
        status: 'draft',
        createdBy: req.user.id  // Track which admin created the course
      });
  
      // Update instructor's total courses
      await Instructor.findByIdAndUpdate(instructorId, {
        $inc: { totalCourses: 1 }
      });
  
      res.status(201).json({ 
        success: true, 
        message: 'Course created successfully',
        data: course 
      });
    } catch (error) {
      next(error);
    }
};

// Update a Course
export const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Map the fields from req.body to the correct Course model fields
    const updateData = { ...req.body };

    // Handle thumbnail upload
    if (req.body.url) {
      updateData.thumbnail = req.body.url;
      updateData.thumbnailCloudinaryPublicId = req.body.cloudinaryPublicId || null;
      // Remove the temporary fields from updateData
      delete updateData.url;
      delete updateData.cloudinaryPublicId;
    }

    // Handle promo video upload
    if (req.body.promoVideoUrl) {
      updateData.promotionalVideo = req.body.promoVideoUrl;
      updateData.promoVideoCloudinaryPublicId = req.body.promoVideoPublicId || null;
      // Remove the temporary fields from updateData
      delete updateData.promoVideoUrl;
      delete updateData.promoVideoPublicId;
    }

    const course = await Course.findByIdAndUpdate(id, updateData, { new: true });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    res.status(200).json({ success: true, data: course });
  } catch (error) {
    console.error('Error in updateCourse:', error);
    next(error);
  }
};

// Delete a Course
export const deleteCourse = async (req, res, next) => {
    try {
      // First find the course to get the instructor reference
      const course = await Course.findById(req.params.id);
      
      if (!course) {
        return res.status(404).json({ 
          success: false, 
          message: 'Course not found' 
        });
      }
  
      // Store the instructor ID before deleting
      const instructorId = course.instructor;
  
      // Delete the course
      await Course.findByIdAndDelete(req.params.id);
  
      // Decrement the instructor's totalCourses count
      await Instructor.findByIdAndUpdate(instructorId, {
        $inc: { totalCourses: -1 }
      });
  
      res.status(200).json({ 
        success: true, 
        message: 'Course deleted successfully' 
      });
    } catch (error) {
      next(error);
    }
};

// Approve a Course
export const approveCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    course.status = 'published';
    course.approved = true;
    await course.save();
    res.status(200).json({ success: true, message: 'Course approved successfully', data: course });
  } catch (error) {
    next(error);
  }
};

// Get Course Students (Admin)
export const getCourseStudents = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    // Validate course ID
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    // Check if the course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Fetch enrollments and populate student data
    const enrollments = await Enrollment.find({ course: courseId })
      .populate({
        path: 'student',
        select: 'firstName lastName email avatar',
        model: 'User', // Fallback to User model
        match: { role: 'student' } // Ensure only students are populated
      })
      .sort({ enrollmentDate: -1 });

    // Calculate total number of students
    const totalStudents = enrollments.length;

    res.status(200).json({
      success: true,
      data: {
        course: { id: course._id, title: course.title },
        totalStudents,
        enrollments
      }
    });
  } catch (error) {
    console.error('Error fetching course students:', error);
    next(error);
  }
};

// Get Detailed Enrollment Analytics
export const getEnrollmentAnalytics = async (req, res, next) => {
    try {
      const enrollments = await Enrollment.aggregate([
        // Lookup to populate the student field (from User model)
        {
          $lookup: {
            from: 'users', // Assuming Student inherits from User
            localField: 'student',
            foreignField: '_id',
            as: 'studentDetails'
          }
        },
        // Unwind the studentDetails array, but preserve records with no match
        { $unwind: { path: '$studentDetails', preserveNullAndEmptyArrays: true } },
        // Lookup to populate the course field
        {
          $lookup: {
            from: 'courses',
            localField: 'course',
            foreignField: '_id',
            as: 'courseDetails'
          }
        },
        // Unwind the courseDetails array, but preserve records with no match
        { $unwind: { path: '$courseDetails', preserveNullAndEmptyArrays: true } },
        // Project the desired fields with fallbacks for missing data
        {
          $project: {
            studentName: {
              $cond: {
                if: { $eq: ['$studentDetails', null] },
                then: 'Unknown Student',
                else: { $concat: ['$studentDetails.firstName', ' ', '$studentDetails.lastName'] }
              }
            },
            studentId: { $ifNull: ['$studentDetails._id', 'N/A'] },
            studentEmail: { $ifNull: ['$studentDetails.email', 'N/A'] },
            courseTitle: { $ifNull: ['$courseDetails.title', 'Unknown Course'] },
            courseId: { $ifNull: ['$courseDetails._id', 'N/A'] }
          }
        }
      ]);
  
      res.status(200).json({
        success: true,
        data: enrollments
      });
    } catch (error) {
      console.error('Error in getEnrollmentAnalytics:', error);
      next(error);
    }
};

// Get Total Enrollment Count
export const getTotalEnrollments = async (req, res, next) => {
    try {
      const totalEnrollments = await Enrollment.countDocuments();
  
      res.status(200).json({
        success: true,
        data: {
          totalEnrollments: totalEnrollments
        }
      });
    } catch (error) {
      console.error('Error in getTotalEnrollments:', error);
      next(error);
    }
};

// Get Revenue Analytics
export const getRevenueAnalytics = async (req, res, next) => {
  try {
    const revenue = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$course', totalRevenue: { $sum: '$amount' } } },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course'
        }
      },
      { $unwind: '$course' },
      { $project: { courseTitle: '$course.title', totalRevenue: 1 } }
    ]);
    const totalRevenue = revenue.reduce((sum, item) => sum + item.totalRevenue, 0);
    res.status(200).json({ success: true, data: { totalRevenue, breakdown: revenue } });
  } catch (error) {
    next(error);
  }
};

// Get Skill Gap Analytics
export const getSkillGapAnalytics = async (req, res, next) => {
  try {
    const skillGaps = await Assessment.aggregate([
      { $unwind: '$questions' },
      { $match: { 'questions.correct': false } },
      { $group: { _id: '$questions.topic', incorrectCount: { $sum: 1 } } },
      { $sort: { incorrectCount: -1 } },
      { $limit: 5 }
    ]);
    res.status(200).json({ success: true, data: skillGaps });
  } catch (error) {
    next(error);
  }
};

// Get Drop-Out Analytics
export const getDropOutAnalytics = async (req, res, next) => {
  try {
    const dropOuts = await Progress.aggregate([
      { $match: { overallProgress: { $lt: 100 }, lastAccessed: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }, // Inactive for 30 days
      { $group: { _id: '$course', dropOutCount: { $sum: 1 } } },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course'
        }
      },
      { $unwind: '$course' },
      { $project: { courseTitle: '$course.title', dropOutCount: 1 } }
    ]);
    const totalEnrollments = await Enrollment.countDocuments();
    const totalDropOuts = dropOuts.reduce((sum, item) => sum + item.dropOutCount, 0);
    const dropOutRate = totalEnrollments ? (totalDropOuts / totalEnrollments) * 100 : 0;
    res.status(200).json({ success: true, data: { dropOutRate, breakdown: dropOuts } });
  } catch (error) {
    next(error);
  }
};

// Get Student Activity
export const getStudentActivity = async (req, res, next) => {
    try {
      const activities = await Progress.find({})
        .populate({
          path: 'student',
          select: 'firstName lastName email',
          model: 'User'  // Changed to parent model
        })
        .populate('course', 'title')
        .sort({ lastAccessed: -1 })
        .limit(50)
        .select('student course overallProgress lastAccessed');
      
      res.status(200).json({ success: true, data: activities });
    } catch (error) {
      next(error);
    }
};

// Get Instructor Activity
export const getInstructorActivity = async (req, res, next) => {
  try {
    const activities = await Course.find({ status: 'published' })
      .populate('instructor', 'firstName lastName email')
      .sort({ createdCabAt: -1 })
      .limit(50)
      .select('title instructor createdAt');
    res.status(200).json({ success: true, data: activities });
  } catch (error) {
    next(error);
  }
};

// Export Progress Report (Admin)
export const exportProgressReport = async (req, res, next) => {
    try {
      const progress = await Progress.find({})
        .populate({
          path: 'student',
          select: 'firstName lastName email',
          model: 'User'  // Changed to parent model
        })
        .populate('course', 'title')
        .select('student course overallProgress lastAccessed');
      
      res.status(200).json({ success: true, data: progress });
    } catch (error) {
      next(error);
    }
};
  
// Get Student Progress (Admin)
export const getStudentProgress = async (req, res, next) => {
    try {
      const { studentId, courseId } = req.params;
  
      if (!mongoose.Types.ObjectId.isValid(studentId) || 
          !mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid student or course ID' 
        });
      }
  
      const progress = await Progress.findOne({ 
        student: studentId, 
        course: courseId 
      })
      .populate({
        path: 'student',
        select: 'firstName lastName email',
        model: 'User'  // Changed to parent model
      })
      .populate('course', 'title curriculum') // Made consistent with instructor version
      .populate('curriculumProgress.section')
      .populate('curriculumProgress.lecture')
      .populate('assessmentProgress.assessment')
      .populate({
        path: 'assessmentProgress.gradedBy',
        select: 'firstName lastName',
        model: 'User'
      });
  
      if (!progress) {
        return res.status(404).json({ 
          success: false, 
          message: 'Progress not found for this student and course' 
        });
      }
  
      res.status(200).json({ success: true, data: progress });
    } catch (error) {
      console.error('Error fetching student progress:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID format'
        });
      }
      next(error);
    }
};

// Get Courses by Instructor
export const getCoursesByInstructor = async (req, res, next) => {
  try {
    const { instructorId } = req.params;

    const instructor = await Instructor.findById(instructorId);
    if (!instructor) {
      return res.status(404).json({ success: false, message: 'Instructor not found' });
    }

    const courses = await Course.find({ instructor: instructorId })
      .select('title subtitle description category subCategory level price discountPrice thumbnail promotionalVideo prerequisites curriculum totalStudents rating totalRatings status duration language status createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        instructor: { id: instructor._id, firstName: instructor.firstName, lastName: instructor.lastName },
        courses
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get All Support Tickets
export const getAllSupportTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find({})
      .populate('user', 'firstName lastName email')
      .populate('relatedCourse', 'title')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    next(error);
  }
};

// Resolve Support Ticket
export const resolveSupportTicket = async (req, res, next) => {
    try {
      // Validate request body exists
      if (!req.body) {
        return res.status(400).json({ 
          success: false, 
          message: 'Request body is missing' 
        });
      }
  
      const { resolution } = req.body;
      const { id } = req.params;
  
      // Validate resolution exists or provide default
      const resolutionText = resolution || 'Resolved by admin';
  
      const ticket = await SupportTicket.findById(id);
      if (!ticket) {
        return res.status(404).json({ 
          success: false, 
          message: 'Ticket not found' 
        });
      }
  
      // Update ticket
      ticket.status = 'resolved';
      ticket.resolvedBy = req.user.id;
      ticket.resolvedAt = Date.now();
      ticket.resolution = resolutionText;
      
      await ticket.save();
  
      res.status(200).json({ 
        success: true, 
        message: 'Ticket resolved successfully', 
        data: ticket 
      });
    } catch (error) {
      console.error('Error resolving ticket:', error);
      
      // Handle specific error cases
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid ticket ID format'
        });
      }
      
      next(error);
    }
};

// Download Support Ticket Data
export const downloadSupportTicket = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ticket ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket ID',
      });
    }

    // Fetch the ticket with populated fields
    const ticket = await SupportTicket.findById(id)
      .populate('user', 'firstName lastName email')
      .populate('relatedCourse', 'title');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // Create a new PDF document
    const doc = new PDFDocument();
    const filename = `support-ticket-${id}.pdf`;

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe the PDF document to the response
    doc.pipe(res);

    // Add content to the PDF
    doc.fontSize(20).text('Support Ticket Details', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text(`Ticket ID: ${ticket._id}`);
    doc.text(`Status: ${ticket.status}`);
    doc.text(`Priority: ${ticket.priority}`);
    doc.text(`Created At: ${ticket.createdAt.toISOString()}`);
    doc.moveDown();

    // Add user information
    doc.fontSize(16).text('User Information');
    doc.fontSize(12).text(`Name: ${ticket.user.firstName} ${ticket.user.lastName}`);
    doc.text(`Email: ${ticket.user.email}`);
    doc.moveDown();

    // Add course information (if available)
    if (ticket.relatedCourse) {
      doc.fontSize(16).text('Related Course');
      doc.fontSize(12).text(`Title: ${ticket.relatedCourse.title}`);
      doc.moveDown();
    }

    // Add ticket description
    doc.fontSize(16).text('Description');
    doc.fontSize(12).text(ticket.description || 'No description provided');

    // Finalize the PDF and end the stream
    doc.end();
  } catch (error) {
    console.error('Error downloading support ticket:', error);
    next(error);
  }
};

// Get Ticket Metrics
export const getTicketMetrics = async (req, res, next) => {
  try {
    const totalTickets = await SupportTicket.countDocuments();
    const resolvedTickets = await SupportTicket.countDocuments({ status: 'resolved' });
    res.status(200).json({ success: true, data: { totalTickets, resolvedTickets } });
  } catch (error) {
    next(error);
  }
};