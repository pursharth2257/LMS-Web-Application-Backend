// controllers/downloadController.js
import Content from '../models/Content.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

// Download content as PDF
export const downloadContentAsPDF = async (req, res) => {
  try {
    const { courseId, contentId } = req.params;

    // Check if student is enrolled
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: courseId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to download content'
      });
    }

    // Get the content
    const content = await Content.findOne({
      _id: contentId,
      course: courseId,
      isDownloadable: true
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found or not downloadable'
      });
    }

    // Create PDF document
    const doc = new PDFDocument();
    const filename = `${content.title.replace(/\s+/g, '_')}.pdf`;
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Add content to PDF
    doc.fontSize(20).text(content.title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(content.description || '');
    
    if (content.type === 'text') {
      // For text content, we might fetch the actual text from Cloudinary or another source
      // Here we're just using the description as placeholder
      doc.moveDown();
      doc.fontSize(12).text('Content text would appear here...');
    }

    // Pipe the PDF to response
    doc.pipe(res);
    doc.end();

  } catch (error) {
    console.error('Error downloading content:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading content'
    });
  }
};

// Get downloadable content for a course
export const getDownloadableContent = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: courseId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to access content'
      });
    }

    // Get all downloadable content for this course
    const content = await Content.find({
      course: courseId,
      isDownloadable: true
    }).select('title description type duration fileSize downloadFormats');

    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Error fetching downloadable content:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching downloadable content'
    });
  }
};