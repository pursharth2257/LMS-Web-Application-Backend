import Certificate from '../models/Certificate.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import { generatePDF } from '../utils/pdfGenerator.js';
import { generateUniqueId, generateVerificationUrl } from '../utils/helpers.js';
import { uploadFile, deleteFile } from '../config/cloudinary.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Generate a certificate for a student
export const generateCertificate = async (req, res) => {
  try {
    const { studentId, courseId, enrollmentId } = req.body;
    const issuer = req.user; // Authenticated user (Admin or Instructor)

    // Check if user is authorized (Admin or Instructor)
    if (!['admin', 'instructor'].includes(issuer.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only Admins or Instructors can generate certificates',
      });
    }

    // If Instructor, verify they are the course instructor
    const course = await Course.findById(courseId).populate('instructor', 'firstName lastName');
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }
    if (issuer.role === 'instructor' && course.instructor._id.toString() !== issuer._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not the instructor of this course',
      });
    }

    // Verify enrollment and completion
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment || enrollment.student.toString() !== studentId || enrollment.course.toString() !== courseId) {
      return res.status(404).json({
        success: false,
        message: 'Valid enrollment not found',
      });
    }
    if (enrollment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Course must be completed to generate certificate',
      });
    }

    // Check if certificate already exists
    const existingCertificate = await Certificate.findOne({ student: studentId, course: courseId });
    if (existingCertificate) {
      return res.status(400).json({
        success: false,
        message: 'Certificate already exists for this student and course',
      });
    }

    // Fetch student details
    const student = await User.findById(studentId).select('firstName lastName');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Generate certificate PDF
    const certificateData = {
      studentName: `${student.firstName} ${student.lastName}`, // Fixed: Use student’s name
      courseTitle: course.title,
      issueDate: new Date(),
      instructorName: `${course.instructor.firstName} ${course.instructor.lastName}`,
    };
    const pdfBuffer = await generatePDF(certificateData);

    // Save Buffer to a temporary file
    const tempFilePath = path.join(os.tmpdir(), `certificate_${studentId}_${courseId}.pdf`);
    await fs.writeFile(tempFilePath, pdfBuffer);

    // Upload PDF to Cloudinary
    const uploadResult = await uploadFile(tempFilePath, {
      folder: 'lms/certificates',
      resource_type: 'raw',
      public_id: `certificate_${studentId}_${courseId}`,
    });

    // Clean up temporary file
    await fs.unlink(tempFilePath).catch(err => console.error('Failed to delete temp file:', err));

    // Create certificate
    const certificate = await Certificate.create({
      student: studentId,
      course: courseId,
      enrollment: enrollmentId,
      certificateId: generateUniqueId(),
      instructor: course.instructor._id,
      verificationUrl: generateVerificationUrl(studentId, courseId),
      template: 'default',
      pdfUrl: uploadResult.secure_url,
      designOptions: {
        template: 'default',
        colors: { primary: '#1a73e8', secondary: '#ffffff' },
        logo: 'https://res.cloudinary.com/dcgilmdbm/image/upload/v1750743192/pexels-eileenlamb-3225499_ehialm.jpg',
        signature: issuer.signature || 'https://res.cloudinary.com/dcgilmdbm/image/upload/v1750743318/pexels-cottonbro-6466301_ftlwy5.jpg',
      },
      metadata: {
        hash: uploadResult.public_id,
        verificationCode: generateUniqueId(8),
      },
    });

    res.status(201).json({
      success: true,
      data: certificate,
      message: 'Certificate generated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate certificate',
    });
  }
};

// Get certificate by ID
export const getCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate({
        path: 'student',
        model: 'User',
        select: 'firstName lastName',
        match: { role: 'student' },
      })
      .populate('course', 'title')
      .populate({
        path: 'instructor',
        model: 'User',
        select: 'firstName lastName',
        match: { role: 'instructor' },
      });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found',
      });
    }

    // Check if user is authorized to view
    const isAuthorized =
      req.user.role === 'admin' ||
      (req.user.role === 'instructor' && certificate.instructor && certificate.instructor._id.toString() === req.user._id.toString()) ||
      (certificate.student && certificate.student._id.toString() === req.user._id.toString());

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this certificate',
      });
    }

    res.status(200).json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve certificate',
    });
  }
};

// Verify certificate by verification code or ID
export const verifyCertificate = async (req, res) => {
  try {
    const { verificationCode, certificateId } = req.query;
    const query = verificationCode
      ? { 'metadata.verificationCode': verificationCode }
      : { certificateId };

    const certificate = await Certificate.findOne(query)
      .populate({
        path: 'student',
        model: 'User',
        select: 'firstName lastName',
        match: { role: 'student' },
      })
      .populate('course', 'title')
      .populate({
        path: 'instructor',
        model: 'User',
        select: 'firstName lastName',
        match: { role: 'instructor' },
      });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or invalid verification code',
      });
    }

    if (certificate.isRevoked) {
      return res.status(400).json({
        success: false,
        message: 'Certificate has been revoked',
        revokedReason: certificate.revokedReason,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        student: certificate.student,
        course: certificate.course,
        issueDate: certificate.issueDate,
        isValid: true,
        verificationUrl: certificate.verificationUrl,
      },
      message: 'Certificate verified successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify certificate',
    });
  }
};

// Revoke certificate
// Revoke certificate
export const revokeCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    const { reason } = req.body;
    const issuer = req.user;

    if (!['admin', 'instructor'].includes(issuer.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only Admins or Instructors can revoke certificates',
      });
    }

    const certificate = await Certificate.findById(certificateId);
    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found',
      });
    }

    if (issuer.role === 'instructor') {
      const course = await Course.findById(certificate.course);
      if (course.instructor.toString() !== issuer._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not the instructor of this course',
        });
      }
    }

    if (certificate.isRevoked) {
      return res.status(400).json({
        success: false,
        message: 'Certificate is already revoked',
      });
    }

    certificate.isRevoked = true;
    certificate.revokedDate = new Date();
    certificate.revokedReason = reason || 'No \nreason provided';
    await certificate.save();

    if (certificate.pdfUrl) {
      const publicId = certificate.metadata.hash;
      await deleteFile(publicId, { resource_type: 'raw' });
    }

    res.status(200).json({
      success: true,
      message: 'Certificate revoked successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to revoke certificate',
    });
  }
};

// Get all certificates for a student
export const getStudentCertificates = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.user._id;
    const isAuthorized =
      req.user.role === 'admin' ||
      (req.user.role === 'instructor' && req.user._id.toString() === studentId) ||
      req.user._id.toString() === studentId;

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these certificates',
      });
    }

    const certificates = await Certificate.find({
      student: studentId,
    })
      .populate('course', 'title')
      .populate({
        path: 'instructor',
        model: 'User',
        select: 'firstName lastName',
        match: { role: 'instructor' },
      });

    res.status(200).json({
      success: true,
      data: certificates,
      message: 'Certificates retrieved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve certificates',
    });
  }
};