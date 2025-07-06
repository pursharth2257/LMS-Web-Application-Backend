import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema({
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
  curriculumProgress: [{
    section: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    lecture: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    completionDate: {
      type: Date
    },
    timeSpent: {
      type: Number, // in seconds
      default: 0
    },
    lastAccessed: {
      type: Date
    }
  }],
  assessmentProgress: [{
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: true
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'submitted', 'graded'],
      default: 'not_started'
    },
    score: {
      type: Number
    },
    totalPoints: {
      type: Number
    },
    submissionDate: {
      type: Date
    },
    gradingDate: {
      type: Date
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Instructor'
    },
    feedback: {
      type: String
    }
  }],
  overallProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  lastAccessed: {
    type: Date
  },
  videoProgress: [{
    content: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content'
    },
    position: Number, // in seconds
    completed: Boolean,
    lastWatched: Date,
    totalWatched: Number // in seconds
  }],
  notes: [{
    content: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content'
    },
    text: String,
    createdAt: Date
  }],
  bookmarks: [{
    content: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content'
    },
    position: Number,
    note: String,
    createdAt: Date
  }],
}, {
  timestamps: true
});

// Index for faster queries
progressSchema.index({ student: 1, course: 1 }, { unique: true });

export default mongoose.model('Progress', progressSchema);