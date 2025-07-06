const leaderboardSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }, // if leaderboard is course-specific
  scope: {
    type: String,
    enum: ['global', 'course', 'weekly', 'monthly'],
    required: true
  },
  rankings: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    score: {
      type: Number,
      required: true
    },
    position: {
      type: Number,
      required: true
    },
    progress: Number
  }],
  period: {
    start: Date,
    end: Date
  }, // for time-bound leaderboards
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Leaderboard', leaderboardSchema);