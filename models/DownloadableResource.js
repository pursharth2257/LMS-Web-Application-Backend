const downloadableResourceSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  file: {
    url: String,
    size: Number,
    type: String,
    originalName: String
  },
  accessLevel: {
    type: String,
    enum: ['free', 'premium', 'enrolled'],
    default: 'enrolled'
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('DownloadableResource', downloadableResourceSchema);