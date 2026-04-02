const Syllabus = require('../models/Syllabus');
const { uploadMaterial, uploadPYQ, uploadSyllabus } = require('../utils/uploadHelper');

const { notifyStudentsForSubject } = require('../utils/notificationHelper');

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { protect } = require('../middleware/auth');
const { facultyOnly, adminOnly } = require('../middleware/roleCheck');
const Faculty = require('../models/Faculty');
const Subject = require('../models/Subject');
const SubjectFacultyMap = require('../models/SubjectFacultyMap');
const StudyMaterial = require('../models/StudyMaterial');
const PYQ = require('../models/PYQ');
const Student = require('../models/Student');
const Course = require('../models/Course');
const fs = require('fs');

// ─────────────────────────────────────────────────────
// GET /faculty/dashboard
// ─────────────────────────────────────────────────────
router.get('/dashboard', protect, facultyOnly, async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.user.id).lean();

    let assignedSubjects = [];
    let allSubjects = [];

    if (req.user.role === 'admin') {
      // Admin sees ALL subjects with stats
      const maps = await SubjectFacultyMap.find({ isActive: true })
        .populate('facultyId', 'name designation')
        .lean();

      const subjectCodes = [...new Set(maps.map(m => m.subjectCode))];
      allSubjects = await Subject.find({
        subjectCode: { $in: subjectCodes }
      }).lean();

      assignedSubjects = await Promise.all(
        allSubjects.map(async (subject) => {
          const subjectMaps = maps.filter(m => m.subjectCode === subject.subjectCode);
          const materialCount = await StudyMaterial.countDocuments({ subjectCode: subject.subjectCode });
          const pyqCount = await PYQ.countDocuments({ subjectCode: subject.subjectCode });
          return {
            ...subject,
            mappings: subjectMaps,
            materialCount,
            pyqCount
          };
        })
      );

    } else {
      // Faculty sees only their assigned subjects
      const maps = await SubjectFacultyMap.find({
        facultyId: req.user.id,
        isActive: true
      }).lean();

      const subjectCodes = [...new Set(maps.map(m => m.subjectCode))];
      const subjects = await Subject.find({
        subjectCode: { $in: subjectCodes }
      }).lean();

      assignedSubjects = await Promise.all(
        subjects.map(async (subject) => {
          const materialCount = await StudyMaterial.countDocuments({
            subjectCode: subject.subjectCode,
            facultyId: req.user.id
          });
          const pyqCount = await PYQ.countDocuments({
            subjectCode: subject.subjectCode,
            facultyId: req.user.id
          });
          const subjectMaps = maps.filter(m => m.subjectCode === subject.subjectCode);
          return {
            ...subject,
            mappings: subjectMaps,
            materialCount,
            pyqCount
          };
        })
      );
    }

    // Recent uploads (last 5)
    const recentMaterials = await StudyMaterial.find(
      req.user.role === 'admin' ? {} : { facultyId: req.user.id }
    )
      .populate('facultyId', 'name')
      .sort({ uploadedAt: -1 })
      .limit(5)
      .lean();

    const recentPYQs = await PYQ.find(
      req.user.role === 'admin' ? {} : { facultyId: req.user.id }
    )
      .populate('facultyId', 'name')
      .sort({ uploadedAt: -1 })
      .limit(5)
      .lean();

    // Summary stats
    const totalMaterials = await StudyMaterial.countDocuments(
      req.user.role === 'admin' ? {} : { facultyId: req.user.id }
    );
    const totalPYQs = await PYQ.countDocuments(
      req.user.role === 'admin' ? {} : { facultyId: req.user.id }
    );
    const totalStudents = req.user.role === 'admin'
      ? await Student.countDocuments({ isActive: true })
      : null;

    res.render('faculty/dashboard', {
      faculty,
      assignedSubjects,
      recentMaterials,
      recentPYQs,
      totalMaterials,
      totalPYQs,
      totalStudents,
      user: req.user,
      success: req.query.success || null,
      error: req.query.error || null
    });

  } catch (err) {
    console.error('Faculty dashboard error:', err);
    res.render('error', { message: 'Failed to load dashboard.', user: req.user });
  }
});

// ─────────────────────────────────────────────────────
// GET /faculty/upload/material  — Show upload form
// ─────────────────────────────────────────────────────
router.get('/upload/material', protect, facultyOnly, async (req, res) => {
  try {
    let subjectOptions = [];

    if (req.user.role === 'admin') {
      // Admin can upload for any subject
      const allMaps = await SubjectFacultyMap.find({ isActive: true })
        .populate('facultyId', 'name')
        .lean();
      const subjectCodes = [...new Set(allMaps.map(m => m.subjectCode))];
      subjectOptions = await Subject.find({ subjectCode: { $in: subjectCodes } })
        .sort({ semester: 1, subjectCode: 1 })
        .lean();
    } else {
      // Faculty: only their mapped subjects
      const maps = await SubjectFacultyMap.find({
        facultyId: req.user.id,
        isActive: true
      }).lean();
      const subjectCodes = [...new Set(maps.map(m => m.subjectCode))];
      subjectOptions = await Subject.find({ subjectCode: { $in: subjectCodes } })
        .sort({ semester: 1, subjectCode: 1 })
        .lean();
    }

    res.render('faculty/upload-material', {
      subjectOptions,
      user: req.user,
      success: req.query.success || null,
      error: req.query.error || null,
      formData: {}
    });

  } catch (err) {
    console.error('Upload material form error:', err);
    res.render('error', { message: 'Failed to load upload form.', user: req.user });
  }
});

// ─────────────────────────────────────────────────────
// POST /faculty/material/upload
// ─────────────────────────────────────────────────────
router.post('/material/upload', protect, facultyOnly,
  (req, res, next) => {
    uploadMaterial.single('file')(req, res, (err) => {
      if (err) {
        return res.redirect(`/faculty/upload/material?error=${encodeURIComponent(err.message)}`);
      }
      next();
    });
  },
  async (req, res) => {
    const { subjectCode, unit, title, description } = req.body;

    // Validation
    if (!subjectCode || !unit || !title) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.redirect('/faculty/upload/material?error=Subject, unit and title are required.');
    }

    if (!req.file) {
      return res.redirect('/faculty/upload/material?error=Please select a PDF file to upload.');
    }

    const unitNum = parseInt(unit);
    if (unitNum < 1 || unitNum > 6) {
      fs.unlinkSync(req.file.path);
      return res.redirect('/faculty/upload/material?error=Unit must be between 1 and 6.');
    }

    try {
      // Authorization check — faculty can only upload for mapped subjects
      if (req.user.role !== 'admin') {
        const isAllowed = await SubjectFacultyMap.findOne({
          subjectCode,
          facultyId: req.user.id,
          isActive: true
        });
        if (!isAllowed) {
          fs.unlinkSync(req.file.path);
          return res.redirect('/faculty/upload/material?error=You are not authorized to upload for this subject.');
        }
      }

      const subject = await Subject.findOne({ subjectCode }).lean();
      if (!subject) {
        fs.unlinkSync(req.file.path);
        return res.redirect('/faculty/upload/material?error=Subject not found.');
      }

      await StudyMaterial.create({
        subjectCode,
        facultyId: req.user.id,
        courseCode: subject.courseCode,
        semester: subject.semester,
        unit: unitNum,
        title: title.trim(),
        description: description ? description.trim() : '',
        fileUrl: req.file.path.replace(/\\/g, '/'),
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        uploadedAt: new Date()
      });

      // Trigger notifications
      notifyStudentsForSubject({
        subjectCode,
        subjectName: subject.name,
        courseCode: subject.courseCode,
        semester: subject.semester,
        type: 'new_material',
        title: `New Material: ${title.trim()}`,
        message: `${req.user.name} uploaded new study material for ${subject.name} — Unit ${unitNum}: "${title.trim()}"`,
        refId: null
      });

      return res.redirect('/faculty/upload/material?success=Study material uploaded successfully!');

    } catch (err) {
      console.error('Material upload error:', err);
      if (req.file) fs.unlinkSync(req.file.path);
      return res.redirect('/faculty/upload/material?error=Upload failed. Please try again.');
    }
  }
);

// ─────────────────────────────────────────────────────
// GET /faculty/upload/pyq  — Show PYQ upload form
// ─────────────────────────────────────────────────────
router.get('/upload/pyq', protect, facultyOnly, async (req, res) => {
  try {
    let subjectOptions = [];

    if (req.user.role === 'admin') {
      const allMaps = await SubjectFacultyMap.find({ isActive: true }).lean();
      const subjectCodes = [...new Set(allMaps.map(m => m.subjectCode))];
      subjectOptions = await Subject.find({ subjectCode: { $in: subjectCodes } })
        .sort({ semester: 1, subjectCode: 1 })
        .lean();
    } else {
      const maps = await SubjectFacultyMap.find({
        facultyId: req.user.id,
        isActive: true
      }).lean();
      const subjectCodes = [...new Set(maps.map(m => m.subjectCode))];
      subjectOptions = await Subject.find({ subjectCode: { $in: subjectCodes } })
        .sort({ semester: 1, subjectCode: 1 })
        .lean();
    }

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

    res.render('faculty/upload-pyq', {
      subjectOptions,
      years,
      user: req.user,
      success: req.query.success || null,
      error: req.query.error || null,
      formData: {}
    });

  } catch (err) {
    console.error('PYQ form error:', err);
    res.render('error', { message: 'Failed to load PYQ upload form.', user: req.user });
  }
});

// ─────────────────────────────────────────────────────
// POST /faculty/pyq/upload
// ─────────────────────────────────────────────────────
router.post('/pyq/upload', protect, facultyOnly,
  (req, res, next) => {
    uploadPYQ.single('file')(req, res, (err) => {
      if (err) {
        return res.redirect(`/faculty/upload/pyq?error=${encodeURIComponent(err.message)}`);
      }
      next();
    });
  },
  async (req, res) => {
    const { subjectCode, year, semesterType, examType } = req.body;

    if (!subjectCode || !year || !semesterType || !examType) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.redirect('/faculty/upload/pyq?error=All fields are required.');
    }

    if (!req.file) {
      return res.redirect('/faculty/upload/pyq?error=Please select a PDF file.');
    }

    try {
      if (req.user.role !== 'admin') {
        const isAllowed = await SubjectFacultyMap.findOne({
          subjectCode,
          facultyId: req.user.id,
          isActive: true
        });
        if (!isAllowed) {
          fs.unlinkSync(req.file.path);
          return res.redirect('/faculty/upload/pyq?error=You are not authorized to upload for this subject.');
        }
      }

      const subject = await Subject.findOne({ subjectCode }).lean();
      if (!subject) {
        fs.unlinkSync(req.file.path);
        return res.redirect('/faculty/upload/pyq?error=Subject not found.');
      }

      // Prevent duplicate PYQ
      const existing = await PYQ.findOne({
        subjectCode,
        year: parseInt(year),
        semesterType,
        examType
      });
      if (existing) {
        fs.unlinkSync(req.file.path);
        return res.redirect(`/faculty/upload/pyq?error=A PYQ for ${subjectCode} - ${examType} ${year} (${semesterType}) already exists.`);
      }

      await PYQ.create({
        subjectCode,
        facultyId: req.user.id,
        courseCode: subject.courseCode,
        semester: subject.semester,
        year: parseInt(year),
        semesterType,
        examType,
        fileUrl: req.file.path.replace(/\\/g, '/'),
        fileName: req.file.originalname,
        uploadedAt: new Date()
      });

      // Trigger notifications
      notifyStudentsForSubject({
        subjectCode,
        subjectName: subject.name,
        courseCode: subject.courseCode,
        semester: subject.semester,
        type: 'new_pyq',
        title: `New PYQ: ${subject.name} — ${examType} ${year}`,
        message: `${req.user.name} uploaded a ${examType} question paper for ${subject.name} (${year}, ${semesterType} semester)`,
        refId: null
      });

      return res.redirect('/faculty/upload/pyq?success=PYQ uploaded successfully!');

    } catch (err) {
      console.error('PYQ upload error:', err);
      if (req.file) fs.unlinkSync(req.file.path);
      return res.redirect('/faculty/upload/pyq?error=Upload failed. Please try again.');
    }
  }
);

// ─────────────────────────────────────────────────────
// GET /faculty/subjects  — View all subjects (faculty's)
// ─────────────────────────────────────────────────────
router.get('/subjects', protect, facultyOnly, async (req, res) => {
  try {
    const maps = req.user.role === 'admin'
      ? await SubjectFacultyMap.find({ isActive: true }).populate('facultyId', 'name designation').lean()
      : await SubjectFacultyMap.find({ facultyId: req.user.id, isActive: true }).lean();

    const subjectCodes = [...new Set(maps.map(m => m.subjectCode))];
    const subjects = await Subject.find({ subjectCode: { $in: subjectCodes } })
      .sort({ semester: 1 })
      .lean();

    const subjectsWithStats = await Promise.all(
      subjects.map(async (s) => {
        const materialCount = await StudyMaterial.countDocuments({ subjectCode: s.subjectCode });
        const pyqCount = await PYQ.countDocuments({ subjectCode: s.subjectCode });
        return { ...s, materialCount, pyqCount };
      })
    );

    res.render('faculty/subjects', {
      subjects: subjectsWithStats,
      user: req.user,
      faculty: await Faculty.findById(req.user.id).lean()
    });

  } catch (err) {
    res.render('error', { message: 'Failed to load subjects.', user: req.user });
  }
});

// ─────────────────────────────────────────────────────
// GET /faculty/admin/all-uploads  — Admin: see everything
// ─────────────────────────────────────────────────────
router.get('/admin/all-uploads', protect, adminOnly, async (req, res) => {
  try {
    const { type, subjectCode } = req.query;

    const materials = await StudyMaterial.find(subjectCode ? { subjectCode } : {})
      .populate('facultyId', 'name designation')
      .sort({ uploadedAt: -1 })
      .lean();

    const pyqs = await PYQ.find(subjectCode ? { subjectCode } : {})
      .populate('facultyId', 'name designation')
      .sort({ uploadedAt: -1 })
      .lean();

    const allSubjectCodes = [...new Set([
      ...materials.map(m => m.subjectCode),
      ...pyqs.map(p => p.subjectCode)
    ])];

    res.render('faculty/admin-uploads', {
      materials,
      pyqs,
      allSubjectCodes,
      filters: { type, subjectCode },
      user: req.user,
      faculty: await Faculty.findById(req.user.id).lean()
    });

  } catch (err) {
    res.render('error', { message: 'Failed to load admin panel.', user: req.user });
  }
});

// ─────────────────────────────────────────────────────
// POST /faculty/material/delete/:id  — Delete material
// ─────────────────────────────────────────────────────
router.post('/material/delete/:id', protect, facultyOnly, async (req, res) => {
  try {
    const material = await StudyMaterial.findById(req.params.id);
    if (!material) return res.redirect('/faculty/dashboard?error=Material not found.');

    // Only uploader or admin can delete
    if (req.user.role !== 'admin' && material.facultyId.toString() !== req.user.id) {
      return res.redirect('/faculty/dashboard?error=Not authorized to delete this material.');
    }

    // Delete file from disk
    if (fs.existsSync(material.fileUrl)) {
      fs.unlinkSync(material.fileUrl);
    }

    await StudyMaterial.findByIdAndDelete(req.params.id);
    return res.redirect('/faculty/dashboard?success=Material deleted successfully.');

  } catch (err) {
    console.error('Delete material error:', err);
    return res.redirect('/faculty/dashboard?error=Failed to delete material.');
  }
});

// ─────────────────────────────────────────────────────
// POST /faculty/pyq/delete/:id  — Delete PYQ
// ─────────────────────────────────────────────────────
router.post('/pyq/delete/:id', protect, facultyOnly, async (req, res) => {
  try {
    const pyq = await PYQ.findById(req.params.id);
    if (!pyq) return res.redirect('/faculty/dashboard?error=PYQ not found.');

    if (req.user.role !== 'admin' && pyq.facultyId.toString() !== req.user.id) {
      return res.redirect('/faculty/dashboard?error=Not authorized to delete this PYQ.');
    }

    if (fs.existsSync(pyq.fileUrl)) {
      fs.unlinkSync(pyq.fileUrl);
    }

    await PYQ.findByIdAndDelete(req.params.id);
    return res.redirect('/faculty/dashboard?success=PYQ deleted successfully.');

  } catch (err) {
    console.error('Delete PYQ error:', err);
    return res.redirect('/faculty/dashboard?error=Failed to delete PYQ.');
  }
});

// ─────────────────────────────────────────────────────
// GET /faculty/change-password
// ─────────────────────────────────────────────────────
router.get('/change-password', protect, facultyOnly, (req, res) => {
  res.render('faculty/change-password', {
    user: req.user,
    success: req.query.success || null,
    error: req.query.error || null
  });
});

// ─────────────────────────────────────────────────────
// POST /faculty/change-password
// ─────────────────────────────────────────────────────
router.post('/change-password', protect, facultyOnly, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.redirect('/faculty/change-password?error=All fields are required.');
  }

  if (newPassword.length < 8) {
    return res.redirect('/faculty/change-password?error=New password must be at least 8 characters.');
  }

  if (newPassword !== confirmPassword) {
    return res.redirect('/faculty/change-password?error=New passwords do not match.');
  }

  // Password strength check
  const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!strongPassword.test(newPassword)) {
    return res.redirect('/faculty/change-password?error=Password must have uppercase, lowercase, number and special character.');
  }

  try {
    const faculty = await Faculty.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, faculty.password);
    if (!isMatch) {
      return res.redirect('/faculty/change-password?error=Current password is incorrect.');
    }

    faculty.password = await bcrypt.hash(newPassword, 12);
    await faculty.save();

    // Force re-login after password change
    res.clearCookie('token');
    return res.redirect('/auth/landing?message=Password changed successfully. Please login again.');

  } catch (err) {
    console.error('Password change error:', err);
    return res.redirect('/faculty/change-password?error=Failed to change password. Try again.');
  }
});

// ─────────────────────────────────────────────────────
// GET /faculty/upload/syllabus — Show form
// ─────────────────────────────────────────────────────
router.get('/upload/syllabus', protect, facultyOnly, async (req, res) => {
  try {
    let subjectOptions = [];
    if (req.user.role === 'admin') {
      const allMaps = await SubjectFacultyMap.find({ isActive: true }).lean();
      const subjectCodes = [...new Set(allMaps.map(m => m.subjectCode))];
      subjectOptions = await Subject.find({ subjectCode: { $in: subjectCodes } })
        .sort({ semester: 1, subjectCode: 1 }).lean();
    } else {
      const maps = await SubjectFacultyMap.find({
        facultyId: req.user.id, isActive: true
      }).lean();
      const subjectCodes = [...new Set(maps.map(m => m.subjectCode))];
      subjectOptions = await Subject.find({ subjectCode: { $in: subjectCodes } })
        .sort({ semester: 1, subjectCode: 1 }).lean();
    }

    // Get already uploaded syllabi
    const uploadedSyllabi = await Syllabus.find({
      subjectCode: { $in: subjectOptions.map(s => s.subjectCode) }
    }).lean();
    const uploadedMap = {};
    uploadedSyllabi.forEach(s => { uploadedMap[s.subjectCode] = s; });

    res.render('faculty/upload-syllabus', {
      subjectOptions,
      uploadedMap,
      user: req.user,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (err) {
    console.error('Syllabus form error:', err);
    res.render('error', { message: 'Failed to load syllabus upload form.', user: req.user });
  }
});

// ─────────────────────────────────────────────────────
// POST /faculty/syllabus/upload
// ─────────────────────────────────────────────────────
router.post('/syllabus/upload', protect, facultyOnly,
  (req, res, next) => {
    uploadSyllabus.single('file')(req, res, (err) => {
      if (err) return res.redirect(
        `/faculty/upload/syllabus?error=${encodeURIComponent(err.message)}`
      );
      next();
    });
  },
  async (req, res) => {
    const { subjectCode, academicYear } = req.body;

    if (!subjectCode) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.redirect('/faculty/upload/syllabus?error=Please select a subject.');
    }
    if (!req.file) {
      return res.redirect('/faculty/upload/syllabus?error=Please select a PDF file.');
    }

    try {
      // Auth check
      if (req.user.role !== 'admin') {
        const isAllowed = await SubjectFacultyMap.findOne({
          subjectCode, facultyId: req.user.id, isActive: true
        });
        if (!isAllowed) {
          fs.unlinkSync(req.file.path);
          return res.redirect(
            '/faculty/upload/syllabus?error=Not authorized for this subject.'
          );
        }
      }

      const subject = await Subject.findOne({ subjectCode }).lean();
      if (!subject) {
        fs.unlinkSync(req.file.path);
        return res.redirect('/faculty/upload/syllabus?error=Subject not found.');
      }

      // Delete old file if exists
      const existing = await Syllabus.findOne({ subjectCode });
      if (existing) {
        if (fs.existsSync(existing.fileUrl)) fs.unlinkSync(existing.fileUrl);
        await Syllabus.findByIdAndDelete(existing._id);
      }

      await Syllabus.create({
        subjectCode,
        subjectName: subject.name,
        courseCode: subject.courseCode,
        semester: subject.semester,
        facultyId: req.user.id,
        fileUrl: req.file.path.replace(/\\/g, '/'),
        fileName: req.file.originalname,
        fileSize: req.file.size,
        academicYear: academicYear || '2025-26',
        uploadedAt: new Date(),
        updatedAt: new Date()
      });

      return res.redirect(
        '/faculty/upload/syllabus?success=Syllabus uploaded successfully!'
      );
    } catch (err) {
      console.error('Syllabus upload error:', err);
      if (req.file) fs.unlinkSync(req.file.path);
      return res.redirect('/faculty/upload/syllabus?error=Upload failed. Try again.');
    }
  }
);

// ─────────────────────────────────────────────────────
// POST /faculty/syllabus/delete/:id
// ─────────────────────────────────────────────────────
router.post('/syllabus/delete/:id', protect, facultyOnly, async (req, res) => {
  try {
    const syllabus = await Syllabus.findById(req.params.id);
    if (!syllabus) {
      return res.redirect('/faculty/upload/syllabus?error=Syllabus not found.');
    }
    if (req.user.role !== 'admin' &&
        syllabus.facultyId.toString() !== req.user.id) {
      return res.redirect(
        '/faculty/upload/syllabus?error=Not authorized to delete this syllabus.'
      );
    }
    if (fs.existsSync(syllabus.fileUrl)) fs.unlinkSync(syllabus.fileUrl);
    await Syllabus.findByIdAndDelete(req.params.id);
    return res.redirect('/faculty/upload/syllabus?success=Syllabus deleted.');
  } catch (err) {
    return res.redirect('/faculty/upload/syllabus?error=Failed to delete.');
  }
});

module.exports = router;