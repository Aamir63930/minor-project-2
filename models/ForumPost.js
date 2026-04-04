const mongoose = require('mongoose');

const forumPostSchema = new mongoose.Schema({
  subjectCode: { type: String, required: true },
  subjectName: { type: String, required: true },
  courseCode: { type: String, required: true },
  semester: { type: Number, required: true },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  authorName: { type: String, required: true },
  authorRole: {
    type: String,
    enum: ['student', 'faculty', 'admin'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  isResolved: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  upvotes: [{ type: mongoose.Schema.Types.ObjectId }],
  replyCount: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false });

forumPostSchema.index({ subjectCode: 1, createdAt: -1 });

module.exports = mongoose.model('ForumPost', forumPostSchema);