const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudyMaterial',
    required: true
  },
  subjectCode: { type: String, required: true },
  stars: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 300,
    default: ''
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: false });

// One rating per student per material
ratingSchema.index(
  { studentId: 1, materialId: 1 },
  { unique: true }
);

module.exports = mongoose.model('Rating', ratingSchema);