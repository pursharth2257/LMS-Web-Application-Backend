import mongoose from 'mongoose';

const badgeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  icon: {
    type: String,
    required: true
  },
  criteria: {
    type: String,
    enum: ['course_completion', 'streak', 'assessment_score', 'community', 'custom'],
    required: true
  },
  threshold: Number, // e.g., 5 courses completed, 7-day streak, etc.
  minScore: {
    type: Number,
    default: null
  }, // used for assessment_score badge if applicable
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }, // for course-specific badges
  isSecret: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Optional: performance index for filtering badges by type
badgeSchema.index({ criteria: 1 });

export default mongoose.model('Badge', badgeSchema);
