const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  recipientRole: {
    type: String,
    enum: ['student', 'faculty', 'admin'],
    required: true
  },
  type: {
    type: String,
    enum: [
      'new_material',
      'new_pyq',
      'new_announcement',
      'system'
    ],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  subjectCode: { type: String, default: null },
  subjectName: { type: String, default: null },
  courseCode: { type: String, default: null },
  semester: { type: Number, default: null },
  refId: { type: mongoose.Schema.Types.ObjectId, default: null },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false });

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);