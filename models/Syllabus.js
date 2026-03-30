const mongoose = require('mongoose');

const syllabusSchema = new mongoose.Schema({
  subjectCode: { type: String, required: true, unique: true },
  subjectName: { type: String, required: true },
  courseCode: { type: String, required: true },
  semester: { type: Number, required: true },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true
  },
  fileUrl: { type: String, required: true },
  fileName: { type: String },
  fileSize: { type: Number },
  academicYear: { type: String, default: '2025-26' },
  uploadedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: false });

module.exports = mongoose.model('Syllabus', syllabusSchema);