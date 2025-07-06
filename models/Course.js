import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: [200, 'Subtitle cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Course description is required']
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: [true, 'Please select a category']
  },
  subCategory: {
    type: String
  },
  language: {
    type: String,
    default: 'English'
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  duration: {
    type: Number, // in hours
    required: [true, 'Please specify course duration']
  },
  price: {
    type: Number,
    required: [true, 'Please set a price for the course'],
    min: [0, 'Price cannot be negative']
  },
  discountPrice: {
    type: Number,
    validate: {
      validator: function (value) {
        return value < this.price;
      },
      message: 'Discount price must be less than regular price'
    }
  },
  thumbnail: {
    type: String,
    // required: [true, 'Please upload a course thumbnail']
  },
  promotionalVideo: {
    type: String
  },
  prerequisites: [{
    type: String
  }],
  learningOutcomes: [{
    type: String
  }],
  curriculum: [{
    sectionTitle: {
      type: String,
      required: true
    },
    lectures: [{
      title: {
        type: String,
        required: true
      },
      description: {
        type: String
      },
      duration: {
        type: Number // in minutes
      },
      content: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Content'
      },
      isPreview: {
        type: Boolean,
        default: false
      },
      note: {
        type: String,
        trim: true // ✅ New field added for instructor notes
      }
    }]
  }],
  totalStudents: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot be more than 5']
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
  languages: [{
    type: String,
    enum: ['en', 'es', 'fr'] // Supported languages for this course
  }],
  subtitles: [{
    language: String,
    url: String
  }],
  liveSessions: [{
    title: String,
    description: String,
    schedule: Date,
    duration: Number,
    meetingId: String,
    meetingPassword: String,
    recordingUrl: String
  }]
}, {
  timestamps: true
});

// Update the updatedAt field before saving
courseSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Course', courseSchema);
