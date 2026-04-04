const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { studentOnly } = require('../middleware/roleCheck');
const Rating = require('../models/Rating');
const StudyMaterial = require('../models/StudyMaterial');

// ─────────────────────────────────────────────
// POST /ratings/submit — Submit or update rating
// ─────────────────────────────────────────────
router.post('/submit', protect, studentOnly, async (req, res) => {
  const { materialId, stars, comment } = req.body;

  if (!materialId || !stars) {
    return res.json({ success: false, message: 'Missing required fields.' });
  }

  const starsNum = parseInt(stars);
  if (starsNum < 1 || starsNum > 5) {
    return res.json({ success: false, message: 'Stars must be 1–5.' });
  }

  try {
    const material = await StudyMaterial.findById(materialId).lean();
    if (!material) {
      return res.json({ success: false, message: 'Material not found.' });
    }

    // Upsert — update if exists, create if not
    await Rating.findOneAndUpdate(
      { studentId: req.user.id, materialId },
      {
        studentId: req.user.id,
        materialId,
        subjectCode: material.subjectCode,
        stars: starsNum,
        comment: comment ? comment.trim().substring(0, 300) : '',
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Recalculate average
    const stats = await Rating.aggregate([
      { $match: { materialId: material._id } },
      {
        $group: {
          _id: null,
          avgStars: { $avg: '$stars' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    const avgStars = stats.length > 0
      ? Math.round(stats[0].avgStars * 10) / 10
      : starsNum;
    const totalRatings = stats.length > 0 ? stats[0].totalRatings : 1;

    return res.json({
      success: true,
      avgStars,
      totalRatings,
      userStars: starsNum
    });

  } catch (err) {
    console.error('Rating submit error:', err);
    return res.json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// GET /ratings/my — Get student's ratings
// for a subject (to pre-fill stars on page load)
// ─────────────────────────────────────────────
router.get('/my/:subjectCode', protect, studentOnly, async (req, res) => {
  try {
    const ratings = await Rating.find({
      studentId: req.user.id,
      subjectCode: req.params.subjectCode
    }).select('materialId stars comment').lean();

    const map = {};
    ratings.forEach(r => {
      map[r.materialId.toString()] = {
        stars: r.stars,
        comment: r.comment
      };
    });

    res.json({ ratings: map });
  } catch {
    res.json({ ratings: {} });
  }
});

// ─────────────────────────────────────────────
// GET /ratings/stats/:subjectCode
// Average ratings for all materials in subject
// ─────────────────────────────────────────────
router.get('/stats/:subjectCode', protect, async (req, res) => {
  try {
    const stats = await Rating.aggregate([
      { $match: { subjectCode: req.params.subjectCode } },
      {
        $group: {
          _id: '$materialId',
          avgStars: { $avg: '$stars' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    const map = {};
    stats.forEach(s => {
      map[s._id.toString()] = {
        avgStars: Math.round(s.avgStars * 10) / 10,
        totalRatings: s.totalRatings
      };
    });

    res.json({ stats: map });
  } catch {
    res.json({ stats: {} });
  }
});

module.exports = router;