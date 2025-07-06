const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    attachments: [{
      url: String,
      name: String,
      type: String
    }],
    readBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastMessage: {
    type: Date
  }
}, {
  timestamps: true
});

export default mongoose.model('Chat', chatSchema);