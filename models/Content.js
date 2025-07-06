import mongoose from 'mongoose';

const contentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Content title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['video', 'audio', 'pdf', 'document', 'presentation', 'quiz', 'assignment', 'link', 'text'],
    required: [true, 'Content type is required']
  },
  url: {
    type: String,
    required: function() {
      return this.type !== 'text';
    }
  },
  cloudinaryPublicId: {
    type: String
  },
  duration: {
    type: Number, // in minutes
    // required: function() {
    //   return this.type === 'video' || this.type === 'audio';
    // }
  },
  fileSize: {
    type: Number // in bytes
  },
  fileFormat: {
    type: String
  },
  isDownloadable: {
    type: Boolean,
    default: false
  },
  downloadFormats: [{
    type: String,
    enum: ['pdf', 'txt', 'docx', 'pptx']
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instructor',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  playbackPositions: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    position: Number, // in seconds
    lastAccessed: Date,
    completed: Boolean
  }],
  subtitles: [{
    language: String,
    url: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export default mongoose.model('Content', contentSchema);