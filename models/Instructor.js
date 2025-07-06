import mongoose from 'mongoose';
import User from './User.js';

const instructorSchema = new mongoose.Schema({
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  expertise: {
    type: [String],
    required: [true, 'Please add at least one expertise area']
  },
  socialLinks: {
    website: String,
    twitter: String,
    linkedin: String,
    github: String
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot be more than 5']
  },
  totalStudents: {
    type: Number,
    default: 0
  },
  totalCourses: {
    type: Number,
    default: 0
  },
  earnings: {
    type: Number,
    default: 0
  },
  approved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvalDate: {
    type: Date
  },
  liveClassSettings: {
    zoomApiKey: String,
    zoomApiSecret: String,
    jitsiRoomPrefix: String,
    preferredPlatform: String
  },
});

export default User.discriminator('instructor', instructorSchema);