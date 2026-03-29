const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { facultyOnly, adminOnly } = require('../middleware/roleCheck');
const Announcement = require('../models/Announcement');
const Course = require('../models/Course');
const { notifyStudentsForSubject } = require('../utils/notificationHelper');
const Student = require('../models/Student');
const Notification = require('../models/Notification');

// ─────────────────────────────────────────────
// Helper: get announcements for a student
// ─────────────────────────────────────────────
const getStudentAnnouncements = async (courseCode, semester) => {
  const now = new Date();
  return await Announcement.find({
    isActive: true,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: now } }
    ],
    $or: [
      { scope: 'college-wide' },
      { scope: 'course-specific', targetCourses: courseCode },
      {
        scope: 'semester-specific',
        targetCourses: courseCode,
        targetSemesters: semester
      }
    ]
  })
    .sort({ isPinned: -1, createdAt: -1 })
    .limit(20)
    .lean();
};

// ─────────────────────────────────────────────
// GET /announcements — Student view
// ─────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { getCurrentSemester } = require('../utils/semesterHelper');

    let announcements = [];
    if (req.user.role === 'student') {
      const currentSemester = getCurrentSemester(req.user.enrollmentYear);
      announcements = await getStudentAnnouncements(req.user.courseCode, currentSemester);
      // Increment view count
      const ids = announcements.map(a => a._id);
      if (ids.length > 0) {
        await Announcement.updateMany({ _id: { $in: ids } }, { $inc: { views: 1 } });
      }
    } else {
      // Faculty/admin sees all
      announcements = await Announcement.find({ isActive: true })
        .sort({ isPinned: -1, createdAt: -1 })
        .limit(50)
        .lean();
    }

    res.render('announcements/index', {
      announcements,
      user: req.user
    });
  } catch (err) {
    console.error('Announcements error:', err);
    res.render('error', { message: 'Failed to load announcements.', user: req.user });
  }
});

// ─────────────────────────────────────────────
// GET /announcements/new — Faculty: post form
// ─────────────────────────────────────────────
router.get('/new', protect, facultyOnly, async (req, res) => {
  try {
    const courses = await Course.find({}).sort({ shortName: 1 }).lean();
    res.render('announcements/new', {
      courses,
      user: req.user,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (err) {
    res.render('error', { message: 'Failed to load form.', user: req.user });
  }
});

// ─────────────────────────────────────────────
// POST /announcements — Create announcement
// ─────────────────────────────────────────────
router.post('/', protect, facultyOnly, async (req, res) => {
  const {
    title, content, category,
    scope, targetCourses, targetSemesters,
    isPinned, expiresAt
  } = req.body;

  if (!title || !content) {
    return res.redirect('/announcements/new?error=Title and content are required.');
  }

  try {
    const announcement = await Announcement.create({
      title: title.trim(),
      content: content.trim(),
      category: category || 'General',
      postedBy: req.user.id,
      postedByName: req.user.name,
      scope: scope || 'college-wide',
      targetCourses: Array.isArray(targetCourses)
        ? targetCourses
        : targetCourses ? [targetCourses] : [],
      targetSemesters: Array.isArray(targetSemesters)
        ? targetSemesters.map(Number)
        : targetSemesters ? [Number(targetSemesters)] : [],
      isPinned: isPinned === 'on',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdAt: new Date()
    });

    // Notify relevant students
    await notifyAnnouncementStudents(announcement);

    return res.redirect('/announcements?success=Announcement posted successfully!');
  } catch (err) {
    console.error('Create announcement error:', err);
    return res.redirect('/announcements/new?error=Failed to post announcement. Try again.');
  }
});

// ─────────────────────────────────────────────
// POST /announcements/:id/pin — Toggle pin
// ─────────────────────────────────────────────
router.post('/:id/pin', protect, facultyOnly, async (req, res) => {
  try {
    const ann = await Announcement.findById(req.params.id);
    if (!ann) return res.json({ success: false });
    ann.isPinned = !ann.isPinned;
    await ann.save();
    res.json({ success: true, isPinned: ann.isPinned });
  } catch {
    res.json({ success: false });
  }
});

// ─────────────────────────────────────────────
// POST /announcements/:id/delete — Delete
// ─────────────────────────────────────────────
router.post('/:id/delete', protect, facultyOnly, async (req, res) => {
  try {
    const ann = await Announcement.findById(req.params.id);
    if (!ann) return res.redirect('/announcements?error=Announcement not found.');

    // Only poster or admin can delete
    if (req.user.role !== 'admin' && ann.postedBy.toString() !== req.user.id) {
      return res.redirect('/announcements?error=Not authorized to delete this announcement.');
    }

    await Announcement.findByIdAndDelete(req.params.id);
    return res.redirect('/faculty/dashboard?success=Announcement deleted.');
  } catch (err) {
    return res.redirect('/announcements?error=Failed to delete.');
  }
});

// ─────────────────────────────────────────────
// Helper: notify students about announcement
// ─────────────────────────────────────────────
async function notifyAnnouncementStudents(ann) {
  try {
    let students = [];

    if (ann.scope === 'college-wide') {
      students = await Student.find({ isActive: true }).lean();
    } else if (ann.scope === 'course-specific' && ann.targetCourses.length > 0) {
      students = await Student.find({
        courseCode: { $in: ann.targetCourses },
        isActive: true
      }).lean();
    } else if (ann.scope === 'semester-specific' && ann.targetCourses.length > 0) {
      const { getCurrentSemester } = require('../utils/semesterHelper');
      const allStudents = await Student.find({
        courseCode: { $in: ann.targetCourses },
        isActive: true
      }).lean();
      students = allStudents.filter(s => {
        const sem = getCurrentSemester(s.enrollmentYear);
        return ann.targetSemesters.includes(sem);
      });
    }

    if (!students.length) return;

    const notifications = students.map(s => ({
      recipientId: s._id,
      recipientRole: 'student',
      type: 'new_announcement',
      title: `📢 ${ann.title}`,
      message: ann.content.length > 120
        ? ann.content.substring(0, 120) + '...'
        : ann.content,
      subjectCode: null,
      subjectName: null,
      courseCode: null,
      semester: null,
      refId: ann._id,
      isRead: false,
      createdAt: new Date()
    }));

    await Notification.insertMany(notifications);
    console.log(`✅ ${notifications.length} announcement notifications sent`);
  } catch (err) {
    console.error('Announcement notify error:', err.message);
  }
}

module.exports = router;