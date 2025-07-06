import PDFDocument from 'pdfkit';
import fs from 'fs';

// Generate a certificate PDF
export const generatePDF = async (certificateData) => {
  return new Promise((resolve, reject) => {
    try {
      const { studentName, courseTitle, issueDate, instructorName } = certificateData;

      // Create a new PDF document
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 50,
      });

      // Buffer to store PDF data
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', (err) => reject(err));

      // Styling and layout
      doc.registerFont('Regular', 'Helvetica');
      doc.registerFont('Bold', 'Helvetica-Bold');

      // Certificate Border
      doc
        .lineWidth(5)
        .rect(30, 30, doc.page.width - 60, doc.page.height - 60)
        .strokeColor('#1a73e8')
        .stroke();

      // Header
      doc
        .font('Bold')
        .fontSize(36)
        .fillColor('#1a73e8')
        .text('Certificate of Completion', 0, 80, { align: 'center' });

      // Certificate Details
      doc
        .font('Regular')
        .fontSize(20)
        .fillColor('#333333')
        .text('This certifies that', 0, 150, { align: 'center' });

      doc
        .font('Bold')
        .fontSize(28)
        .text(studentName, 0, 180, { align: 'center' });

      doc
        .font('Regular')
        .fontSize(18)
        .text('has successfully completed the course', 0, 220, { align: 'center' });

      doc
        .font('Bold')
        .fontSize(24)
        .text(courseTitle, 0, 250, { align: 'center' });

      doc
        .font('Regular')
        .fontSize(16)
        .text(`Date of Issue: ${issueDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`, 0, 300, { align: 'center' });

      // Instructor Signature
      doc
        .font('Regular')
        .fontSize(16)
        .text('Instructor:', 0, 350, { align: 'center' });

      doc
        .font('Bold')
        .fontSize(18)
        .text(instructorName, 0, 380, { align: 'center' });

      // Logo (placeholder - replace with actual logo URL or path if available)
      // If you have a logo, uncomment and provide the path
      // doc.image('path/to/logo.png', doc.page.width - 150, 50, { width: 100 });

      // Footer
      doc
        .font('Regular')
        .fontSize(12)
        .fillColor('#666666')
        .text(
          'This certificate is issued by Your LMS Platform',
          0,
          doc.page.height - 100,
          { align: 'center' }
        );

      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};