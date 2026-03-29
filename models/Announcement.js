const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
  category: {
    type: String,
    enum: ['General', 'Exam', 'Holiday', 'Urgent', 'Assignment', 'Result'],
    default: 'General'
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true
  },
  postedByName: { type: String, required: true },
  scope: {
    type: String,
    enum: ['college-wide', 'course-specific', 'semester-specific'],
    default: 'college-wide'
  },
  targetCourses: [{ type: String }],
  targetSemesters: [{ type: Number }],
  isPinned: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false });

announcementSchema.index({ isActive: 1, isPinned: -1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);