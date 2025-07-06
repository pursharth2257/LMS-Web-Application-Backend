import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  enrollment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: true
  },
  certificateId: {
    type: String,
    required: true,
    unique: true
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instructor',
    required: true
  },
  verificationUrl: {
    type: String,
    required: true
  },
  template: {
    type: String,
    required: true
  },
  pdfUrl: {
    type: String,
    required: true
  },
  isRevoked: {
    type: Boolean,
    default: false
  },
  revokedDate: {
    type: Date
  },
  revokedReason: {
    type: String
  },
  designOptions: {
    template: String,
    colors: {
      primary: String,
      secondary: String
    },
    logo: String,
    signature: String
  },
  metadata: {
    hash: String,
    verificationCode: String
  },
}, {
  timestamps: true
});

export default mongoose.model('Certificate', certificateSchema);