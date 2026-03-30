const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Ensure upload directories exist
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Storage for study materials
const materialStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/materials';
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `MAT_${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

// Storage for PYQs
const pyqStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/pyqs';
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `PYQ_${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

// File filter — PDF only
const pdfFilter = (req, file, cb) => {
  const allowed = ['application/pdf'];
  const allowedExt = ['.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowed.includes(file.mimetype) && allowedExt.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed.'), false);
  }
};

// Multer instances
const uploadMaterial = multer({
  storage: materialStorage,
  fileFilter: pdfFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

const uploadPYQ = multer({
  storage: pyqStorage,
  fileFilter: pdfFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// Storage for syllabus
const syllabusStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/syllabus';
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Use subject code in filename for easy identification
    const subjectCode = req.body.subjectCode || 'SYLLABUS';
    const uniqueName = `SYL_${subjectCode}_${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const uploadSyllabus = multer({
  storage: syllabusStorage,
  fileFilter: pdfFilter,
  limits: { fileSize: 20 * 1024 * 1024 }
});

module.exports = { uploadMaterial, uploadPYQ, uploadSyllabus };