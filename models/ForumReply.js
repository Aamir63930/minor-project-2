const mongoose = require('mongoose');

const forumReplySchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumPost',
    required: true
  },
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
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  isOfficialAnswer: { type: Boolean, default: false },
  upvotes: [{ type: mongoose.Schema.Types.ObjectId }],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false });

forumReplySchema.index({ postId: 1, createdAt: 1 });

module.exports = mongoose.model('ForumReply', forumReplySchema);