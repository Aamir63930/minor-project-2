const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { studentOnly } = require('../middleware/roleCheck');
const Bookmark = require('../models/Bookmark');
const StudyMaterial = require('../models/StudyMaterial');
const PYQ = require('../models/PYQ');
const Subject = require('../models/Subject');

// ─────────────────────────────────────────────
// GET /bookmarks — Saved resources page
// ─────────────────────────────────────────────
router.get('/', protect, studentOnly, async (req, res) => {
  try {
    const { filter } = req.query;
    const query = { studentId: req.user.id };
    if (filter === 'material') query.itemType = 'material';
    if (filter === 'pyq') query.itemType = 'pyq';

    const bookmarks = await Bookmark.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Group by subject
    const grouped = {};
    bookmarks.forEach(b => {
      if (!grouped[b.subjectCode]) {
        grouped[b.subjectCode] = {
          subjectCode: b.subjectCode,
          subjectName: b.subjectName,
          items: []
        };
      }
      grouped[b.subjectCode].items.push(b);
    });

    const totalCount = bookmarks.length;
    const materialCount = bookmarks.filter(b => b.itemType === 'material').length;
    const pyqCount = bookmarks.filter(b => b.itemType === 'pyq').length;

    res.render('student/bookmarks', {
      grouped: Object.values(grouped),
      totalCount,
      materialCount,
      pyqCount,
      filter: filter || 'all',
      user: req.user
    });
  } catch (err) {
    console.error('Bookmarks error:', err);
    res.render('error', {
      message: 'Failed to load bookmarks.',
      user: req.user
    });
  }
});

// ─────────────────────────────────────────────
// POST /bookmarks/toggle — Add or remove bookmark
// ─────────────────────────────────────────────
router.post('/toggle', protect, studentOnly, async (req, res) => {
  const { itemId, itemType } = req.body;

  if (!itemId || !itemType) {
    return res.json({ success: false, message: 'Missing data.' });
  }

  try {
    // Check if already bookmarked
    const existing = await Bookmark.findOne({
      studentId: req.user.id,
      itemId
    });

    if (existing) {
      // Remove bookmark
      await Bookmark.findByIdAndDelete(existing._id);
      return res.json({ success: true, action: 'removed' });
    }

    // Add bookmark — fetch item details
    let title, subjectCode, subjectName, fileUrl, unit, year, examType;

    if (itemType === 'material') {
      const material = await StudyMaterial.findById(itemId).lean();
      if (!material) {
        return res.json({ success: false, message: 'Material not found.' });
      }
      const subject = await Subject.findOne({
        subjectCode: material.subjectCode
      }).lean();
      title = material.title;
      subjectCode = material.subjectCode;
      subjectName = subject ? subject.name : material.subjectCode;
      fileUrl = material.fileUrl;
      unit = material.unit;
    } else if (itemType === 'pyq') {
      const pyq = await PYQ.findById(itemId).lean();
      if (!pyq) {
        return res.json({ success: false, message: 'PYQ not found.' });
      }
      const subject = await Subject.findOne({
        subjectCode: pyq.subjectCode
      }).lean();
      title = `${pyq.subjectCode} — ${pyq.examType} ${pyq.year}`;
      subjectCode = pyq.subjectCode;
      subjectName = subject ? subject.name : pyq.subjectCode;
      fileUrl = pyq.fileUrl;
      year = pyq.year;
      examType = pyq.examType;
    }

    await Bookmark.create({
      studentId: req.user.id,
      itemType,
      itemId,
      subjectCode,
      subjectName,
      title,
      fileUrl,
      unit: unit || null,
      year: year || null,
      examType: examType || null,
      createdAt: new Date()
    });

    return res.json({ success: true, action: 'added' });

  } catch (err) {
    console.error('Bookmark toggle error:', err);
    return res.json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// GET /bookmarks/ids — Get all bookmarked IDs
// for checking state on materials/PYQ pages
// ─────────────────────────────────────────────
router.get('/ids', protect, studentOnly, async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({
      studentId: req.user.id
    }).select('itemId').lean();
    const ids = bookmarks.map(b => b.itemId.toString());
    res.json({ ids });
  } catch {
    res.json({ ids: [] });
  }
});

// ─────────────────────────────────────────────
// POST /bookmarks/remove-all — Clear all bookmarks
// ─────────────────────────────────────────────
router.post('/remove-all', protect, studentOnly, async (req, res) => {
  try {
    await Bookmark.deleteMany({ studentId: req.user.id });
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

module.exports = router;