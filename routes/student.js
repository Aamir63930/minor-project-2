const Syllabus = require('../models/Syllabus');
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { studentOnly } = require('../middleware/roleCheck');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const SubjectFacultyMap = require('../models/SubjectFacultyMap');
const Faculty = require('../models/Faculty');
const StudyMaterial = require('../models/StudyMaterial');
const PYQ = require('../models/PYQ');
const {
  getCurrentSemester,
  getSemesterLabel,
  getSemesterType,
  getAcademicYear
} = require('../utils/semesterHelper');

// ─────────────────────────────────────────────────────
// GET /student/dashboard
// ─────────────────────────────────────────────────────
router.get('/dashboard', protect, studentOnly, async (req, res) => {
  try {
    // 1. Full student profile from DB
    const student = await Student.findById(req.user.id).lean();
    if (!student) {
      res.clearCookie('token');
      return res.redirect('/auth/landing');
    }

    // 2. Calculate current semester
    const currentSemester = getCurrentSemester(student.enrollmentYear);
    const semesterLabel = getSemesterLabel(currentSemester);
    const semesterType = getSemesterType(currentSemester);
    const academicYear = getAcademicYear(student.enrollmentYear, currentSemester);

    // 3. Fetch subjects for this course + semester
    //    Also include COMMON subjects (sem 1 & 2)
    const subjectDocs = await Subject.find({
      $or: [
        { courseCode: student.courseCode, semester: currentSemester },
        { courseCode: 'COMMON', semester: currentSemester }
      ],
      isActive: true
    }).lean();

    // 4. For each subject, get faculty + material counts
    const subjectsWithDetails = await Promise.all(
      subjectDocs.map(async (subject) => {

        // Faculty mapped to this subject for this course
        const maps = await SubjectFacultyMap.find({
          subjectCode: subject.subjectCode,
          courseCode: { $in: [student.courseCode, 'COMMON'] },
          isActive: true
        }).populate('facultyId', 'name designation').lean();

        const theoryFaculty = maps.find(m => m.type === 'Theory');
        const labFaculty = maps.find(m => m.type === 'Lab');

        // Study material count
        const materialCount = await StudyMaterial.countDocuments({
          subjectCode: subject.subjectCode
        });

        // PYQ count
        const pyqCount = await PYQ.countDocuments({
          subjectCode: subject.subjectCode
        });

        // Materials by unit (for quick preview)
        const unitCounts = await StudyMaterial.aggregate([
          { $match: { subjectCode: subject.subjectCode } },
          { $group: { _id: '$unit', count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]);

        return {
          ...subject,
          theoryFaculty: theoryFaculty?.facultyId || null,
          labFaculty: labFaculty?.facultyId || null,
          materialCount,
          pyqCount,
          hasPYQ: pyqCount > 0,
          unitCounts,
          totalUnits: 6
        };
      })
    );

    // Sort: Theory first, then Labs
    subjectsWithDetails.sort((a, b) => {
      if (a.type === 'Lab' && b.type !== 'Lab') return 1;
      if (a.type !== 'Lab' && b.type === 'Lab') return -1;
      return 0;
    });

    // 5. Batch info
    const batchYear = student.enrollmentYear;
    const graduationYear = batchYear + 4;

    res.render('student/dashboard', {
      student,
      currentSemester,
      semesterLabel,
      semesterType,
      academicYear,
      subjects: subjectsWithDetails,
      batchYear,
      graduationYear,
      user: req.user
    });

  } catch (err) {
    console.error('Student dashboard error:', err);
    res.render('error', { message: 'Failed to load dashboard. Please try again.', user: req.user });
  }
});

// ─────────────────────────────────────────────────────
// GET /student/subjects/:subjectCode/materials
// ─────────────────────────────────────────────────────
router.get('/subjects/:subjectCode/materials', protect, studentOnly, async (req, res) => {
  try {
    const { subjectCode } = req.params;
    const student = await Student.findById(req.user.id).lean();
    const currentSemester = getCurrentSemester(student.enrollmentYear);

    // Verify subject belongs to student's course+semester
    const subject = await Subject.findOne({
      subjectCode,
      $or: [
        { courseCode: student.courseCode, semester: currentSemester },
        { courseCode: 'COMMON', semester: currentSemester }
      ]
    }).lean();

    if (!subject) {
      return res.render('error', {
        message: 'Subject not found or not accessible for your course.',
        user: req.user
      });
    }

    // Get faculty info
    const maps = await SubjectFacultyMap.find({
      subjectCode,
      isActive: true
    }).populate('facultyId', 'name designation employeeId').lean();

    const theoryFaculty = maps.find(m => m.type === 'Theory');
    const labFaculty = maps.find(m => m.type === 'Lab');

    // Materials sorted by unit
    const materials = await StudyMaterial.find({ subjectCode })
      .populate('facultyId', 'name')
      .sort({ unit: 1, uploadedAt: -1 })
      .lean();

    // Group by unit
    const materialsByUnit = {};
    for (let u = 1; u <= 6; u++) {
      materialsByUnit[u] = materials.filter(m => m.unit === u);
    }

    res.render('student/materials', {
      subject,
      student,
      theoryFaculty: theoryFaculty?.facultyId || null,
      labFaculty: labFaculty?.facultyId || null,
      materialsByUnit,
      totalMaterials: materials.length,
      currentSemester,
      semesterLabel: getSemesterLabel(currentSemester),
      user: req.user
    });

  } catch (err) {
    console.error('Materials error:', err);
    res.render('error', { message: 'Failed to load study materials.', user: req.user });
  }
});

// ─────────────────────────────────────────────────────
// GET /student/subjects/:subjectCode/pyqs
// ─────────────────────────────────────────────────────
router.get('/subjects/:subjectCode/pyqs', protect, studentOnly, async (req, res) => {
  try {
    const { subjectCode } = req.params;
    const { year, semesterType, examType } = req.query;
    const student = await Student.findById(req.user.id).lean();
    const currentSemester = getCurrentSemester(student.enrollmentYear);

    const subject = await Subject.findOne({
      subjectCode,
      $or: [
        { courseCode: student.courseCode, semester: currentSemester },
        { courseCode: 'COMMON', semester: currentSemester }
      ]
    }).lean();

    if (!subject) {
      return res.render('error', {
        message: 'Subject not found or not accessible.',
        user: req.user
      });
    }

    // Build filter
    const filter = { subjectCode };
    if (year) filter.year = parseInt(year);
    if (semesterType) filter.semesterType = semesterType;
    if (examType) filter.examType = examType;

    const pyqs = await PYQ.find(filter)
      .populate('facultyId', 'name')
      .sort({ year: -1, examType: 1 })
      .lean();

    // Available filter options
    const allPYQs = await PYQ.find({ subjectCode }).lean();
    const availableYears = [...new Set(allPYQs.map(p => p.year))].sort((a, b) => b - a);

    res.render('student/pyqs', {
      subject,
      student,
      pyqs,
      availableYears,
      filters: { year, semesterType, examType },
      currentSemester,
      semesterLabel: getSemesterLabel(currentSemester),
      user: req.user
    });

  } catch (err) {
    console.error('PYQ error:', err);
    res.render('error', { message: 'Failed to load previous year papers.', user: req.user });
  }
});

// ─────────────────────────────────────────────────────
// GET /student/subjects/:subjectCode/syllabus
// ─────────────────────────────────────────────────────
router.get('/subjects/:subjectCode/syllabus', protect, studentOnly, async (req, res) => {
  try {
    const { subjectCode } = req.params;
    const student = await Student.findById(req.user.id).lean();
    const currentSemester = getCurrentSemester(student.enrollmentYear);

    const subject = await Subject.findOne({
      subjectCode,
      $or: [
        { courseCode: student.courseCode, semester: currentSemester },
        { courseCode: 'COMMON', semester: currentSemester }
      ]
    }).lean();

    if (!subject) {
      return res.render('error', {
        message: 'Subject not found or not accessible.',
        user: req.user
      });
    }

    const syllabus = await Syllabus.findOne({ subjectCode })
      .populate('facultyId', 'name designation')
      .lean();

    res.render('student/syllabus', {
      subject,
      syllabus,
      student,
      currentSemester,
      semesterLabel: getSemesterLabel(currentSemester),
      user: req.user
    });
  } catch (err) {
    console.error('Syllabus view error:', err);
    res.render('error', { message: 'Failed to load syllabus.', user: req.user });
  }
});

module.exports = router;