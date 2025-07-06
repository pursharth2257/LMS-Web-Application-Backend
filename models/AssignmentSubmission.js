const assignmentSubmissionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  files: [{
    url: String,
    name: String,
    type: String,
    size: Number
  }],
  textSubmission: String,
  submissionDate: {
    type: Date,
    default: Date.now
  },
  grade: Number,
  feedback: String,
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instructor'
  },
  gradingDate: Date,
  status: {
    type: String,
    enum: ['submitted', 'graded', 'late', 'resubmitted'],
    default: 'submitted'
  }
}, {
  timestamps: true
});

export default mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);