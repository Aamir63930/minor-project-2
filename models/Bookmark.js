const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  itemType: {
    type: String,
    enum: ['material', 'pyq'],
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  subjectCode: { type: String, required: true },
  subjectName: { type: String, required: true },
  title: { type: String, required: true },
  fileUrl: { type: String, required: true },
  unit: { type: Number, default: null },
  year: { type: Number, default: null },
  examType: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false });

// One bookmark per student per item
bookmarkSchema.index(
  { studentId: 1, itemId: 1 },
  { unique: true }
);

module.exports = mongoose.model('Bookmark', bookmarkSchema);