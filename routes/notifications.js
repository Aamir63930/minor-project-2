const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Notification = require('../models/Notification');

// ─────────────────────────────────────────────
// GET /notifications — Full notifications page
// ─────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { filter } = req.query;
    const query = { recipientId: req.user.id };
    if (filter === 'unread') query.isRead = false;
    if (filter === 'materials') query.type = 'new_material';
    if (filter === 'pyqs') query.type = 'new_pyq';

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipientId: req.user.id,
      isRead: false
    });

    res.render('notifications/index', {
      notifications,
      unreadCount,
      filter: filter || 'all',
      user: req.user
    });
  } catch (err) {
    console.error('Notifications page error:', err);
    res.render('error', { message: 'Failed to load notifications.', user: req.user });
  }
});

// ─────────────────────────────────────────────
// GET /notifications/unread-count — for navbar badge (JSON)
// ─────────────────────────────────────────────
router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipientId: req.user.id,
      isRead: false
    });
    res.json({ count });
  } catch {
    res.json({ count: 0 });
  }
});

// ─────────────────────────────────────────────
// GET /notifications/dropdown — latest 5 for navbar dropdown (JSON)
// ─────────────────────────────────────────────
router.get('/dropdown', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipientId: req.user.id
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipientId: req.user.id,
      isRead: false
    });

    res.json({ notifications, unreadCount });
  } catch {
    res.json({ notifications: [], unreadCount: 0 });
  }
});

// ─────────────────────────────────────────────
// POST /notifications/:id/read — Mark one as read
// ─────────────────────────────────────────────
router.post('/:id/read', protect, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user.id },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

// ─────────────────────────────────────────────
// POST /notifications/read-all — Mark all as read
// ─────────────────────────────────────────────
router.post('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

module.exports = router;