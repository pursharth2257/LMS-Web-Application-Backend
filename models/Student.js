// models/Student.js
import mongoose from 'mongoose';
import User from './User.js';

const studentSchema = new mongoose.Schema({
  education: {
    type: String,
    trim: true
  },
  occupation: {
    type: String,
    trim: true
  },
  skills: {
    type: [String]
  },
  interests: {
    type: [String]
  },
  points: {
    type: Number,
    default: 0
  },
  // ✅ Remove this version of badges — it's already defined in User.js as ObjectIds.
  // Keeping this here causes the crash.
  // badges: [{ name: ..., dateEarned: ..., icon: ... }],

  enrolledCourses: [{
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    enrollmentDate: {
      type: Date,
      default: Date.now
    },
    completed: {
      type: Boolean,
      default: false
    },
    completionDate: Date,
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  }],

  bookmarkedCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],

  liveClassSessions: [{
    meetingId: String,
    provider: String, // 'zoom', 'jitsi', etc.
    joinUrl: String,
    startTime: Date,
    endTime: Date,
    attended: Boolean
  }],

  leaderboardPosition: Number,

  streak: {
    current: Number,
    longest: Number,
    lastActiveDate: Date
  }
});

export default User.discriminator('student', studentSchema);

