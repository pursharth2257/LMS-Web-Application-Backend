import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: [true, 'Question text is required']
  },
  questionType: {
    type: String,
    enum: ['multiple_choice', 'true_false', 'short_answer', 'essay', 'code'],
    required: [true, 'Question type is required']
  },
  options: [{
    text: String,
    isCorrect: Boolean
  }],
  correctAnswer: {
    type: String,
    required: function() {
      return this.questionType === 'short_answer' || this.questionType === 'code';
    }
  },
  points: {
    type: Number,
    default: 1,
    min: [1, 'Points must be at least 1']
  },
  explanation: {
    type: String
  }
});

const assessmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Assessment title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instructor',
    required: true
  },
  type: {
    type: String,
    enum: ['quiz', 'assignment', 'exam', 'project'],
    required: [true, 'Assessment type is required']
  },
  questions: [questionSchema],
  totalPoints: {
    type: Number,
    default: 0
  },
  passingScore: {
    type: Number,
    required: [true, 'Passing score is required']
  },
  dueDate: {
    type: Date
  },
  timeLimit: {
    type: Number // in minutes
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate total points before saving
assessmentSchema.pre('save', function(next) {
  if (this.questions && this.questions.length > 0) {
    this.totalPoints = this.questions.reduce((total, question) => {
      return total + (question.points || 0);
    }, 0);
  }
  next();
});

export default mongoose.model('Assessment', assessmentSchema);