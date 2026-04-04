const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { facultyOnly } = require('../middleware/roleCheck');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const StudyMaterial = require('../models/StudyMaterial');
const PYQ = require('../models/PYQ');
const Subject = require('../models/Subject');
const SubjectFacultyMap = require('../models/SubjectFacultyMap');
const { notifyStudentsForSubject } = require('../utils/notificationHelper');

// ── Multer for bulk upload ──
const bulkStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = req.body.uploadType === 'pyq'
      ? 'uploads/pyqs'
      : 'uploads/materials';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const prefix = req.body.uploadType === 'pyq' ? 'PYQ' : 'MAT';
    cb(null, `${prefix}_${uuidv4()}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const bulkUpload = multer({
  storage: bulkStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' &&
        path.extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error(`${file.originalname} is not a PDF`), false);
    }
  },
  limits: { fileSize: 20 * 1024 * 1024, files: 20 }
});

// ─────────────────────────────────────────────
// GET /bulk/upload — Show bulk upload page
// ─────────────────────────────────────────────
router.get('/upload', protect, facultyOnly, async (req, res) => {
  try {
    let subjectOptions = [];
    if (req.user.role === 'admin') {
      const maps = await SubjectFacultyMap.find({ isActive: true }).lean();
      const codes = [...new Set(maps.map(m => m.subjectCode))];
      subjectOptions = await Subject.find({ subjectCode: { $in: codes } })
        .sort({ semester: 1, subjectCode: 1 }).lean();
    } else {
      const maps = await SubjectFacultyMap.find({
        facultyId: req.user.id, isActive: true
      }).lean();
      const codes = [...new Set(maps.map(m => m.subjectCode))];
      subjectOptions = await Subject.find({ subjectCode: { $in: codes } })
        .sort({ semester: 1, subjectCode: 1 }).lean();
    }

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

    res.render('faculty/bulk-upload', {
      subjectOptions,
      years,
      user: req.user,
      faculty: await require('../models/Faculty').findById(req.user.id).lean()
    });
  } catch (err) {
    res.render('error', { message: 'Failed to load bulk upload.', user: req.user });
  }
});

// ─────────────────────────────────────────────
// POST /bulk/upload/single — Upload ONE file
// Called per file via fetch (not full form submit)
// ─────────────────────────────────────────────
router.post('/upload/single', protect, facultyOnly,
  (req, res, next) => {
    bulkUpload.single('file')(req, res, (err) => {
      if (err) {
        return res.json({ success: false, error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    const {
      uploadType, subjectCode,
      unit, title,
      year, semesterType, examType
    } = req.body;

    if (!req.file) {
      return res.json({ success: false, error: 'No file received.' });
    }

    const filePath = req.file.path.replace(/\\/g, '/');

    try {
      // Auth check
      if (req.user.role !== 'admin') {
        const allowed = await SubjectFacultyMap.findOne({
          subjectCode, facultyId: req.user.id, isActive: true
        });
        if (!allowed) {
          fs.unlinkSync(filePath);
          return res.json({
            success: false,
            error: 'Not authorized for this subject.'
          });
        }
      }

      const subject = await Subject.findOne({ subjectCode }).lean();
      if (!subject) {
        fs.unlinkSync(filePath);
        return res.json({ success: false, error: 'Subject not found.' });
      }

      if (uploadType === 'material') {
        if (!unit || !title) {
          fs.unlinkSync(filePath);
          return res.json({
            success: false,
            error: 'Unit and title required for materials.'
          });
        }

        await StudyMaterial.create({
          subjectCode,
          facultyId: req.user.id,
          courseCode: subject.courseCode,
          semester: subject.semester,
          unit: parseInt(unit),
          title: title.trim(),
          description: '',
          fileUrl: filePath,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          fileType: 'application/pdf',
          uploadedAt: new Date()
        });

        notifyStudentsForSubject({
          subjectCode,
          subjectName: subject.name,
          courseCode: subject.courseCode,
          semester: subject.semester,
          type: 'new_material',
          title: `New Material: ${title.trim()}`,
          message: `${req.user.name} uploaded "${title.trim()}" for ${subject.name} — Unit ${unit}`
        });

      } else if (uploadType === 'pyq') {
        if (!year || !semesterType || !examType) {
          fs.unlinkSync(filePath);
          return res.json({
            success: false,
            error: 'Year, semester type and exam type required for PYQs.'
          });
        }

        const existing = await PYQ.findOne({
          subjectCode,
          year: parseInt(year),
          semesterType,
          examType
        });
        if (existing) {
          fs.unlinkSync(filePath);
          return res.json({
            success: false,
            error: `PYQ already exists: ${subjectCode} ${examType} ${year} (${semesterType})`
          });
        }

        await PYQ.create({
          subjectCode,
          facultyId: req.user.id,
          courseCode: subject.courseCode,
          semester: subject.semester,
          year: parseInt(year),
          semesterType,
          examType,
          fileUrl: filePath,
          fileName: req.file.originalname,
          uploadedAt: new Date()
        });

        notifyStudentsForSubject({
          subjectCode,
          subjectName: subject.name,
          courseCode: subject.courseCode,
          semester: subject.semester,
          type: 'new_pyq',
          title: `New PYQ: ${subject.name} — ${examType} ${year}`,
          message: `${req.user.name} uploaded a ${examType} paper for ${subject.name} (${year})`
        });
      }

      return res.json({ success: true });

    } catch (err) {
      console.error('Bulk single upload error:', err);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.json({ success: false, error: 'Server error. Try again.' });
    }
  }
);

module.exports = router;