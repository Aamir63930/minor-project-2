const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { facultyOnly } = require('../middleware/roleCheck');
const ForumPost = require('../models/ForumPost');
const ForumReply = require('../models/ForumReply');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const {
  getCurrentSemester
} = require('../utils/semesterHelper');

// ─────────────────────────────────────────────
// Helper: verify student can access subject
// ─────────────────────────────────────────────
const canAccessSubject = async (user, subjectCode) => {
  if (user.role === 'faculty' || user.role === 'admin') return true;
  const student = await Student.findById(user.id).lean();
  if (!student) return false;
  const currentSem = getCurrentSemester(student.enrollmentYear);
  const subject = await Subject.findOne({
    subjectCode,
    $or: [
      { courseCode: student.courseCode, semester: currentSem },
      { courseCode: 'COMMON', semester: currentSem }
    ]
  }).lean();
  return !!subject;
};

// ─────────────────────────────────────────────
// GET /forum/:subjectCode — Forum home
// ─────────────────────────────────────────────
router.get('/:subjectCode', protect, async (req, res) => {
  try {
    const { subjectCode } = req.params;
    const { filter } = req.query;

    const allowed = await canAccessSubject(req.user, subjectCode);
    if (!allowed) {
      return res.render('error', {
        message: 'You do not have access to this forum.',
        user: req.user
      });
    }

    const subject = await Subject.findOne({ subjectCode }).lean();
    if (!subject) {
      return res.render('error', {
        message: 'Subject not found.',
        user: req.user
      });
    }

    // Build query
    const query = { subjectCode };
    if (filter === 'resolved') query.isResolved = true;
    if (filter === 'unresolved') query.isResolved = false;
    if (filter === 'pinned') query.isPinned = true;

    const posts = await ForumPost.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(30)
      .lean();

    // Add upvote count and user's upvote status
    const postsWithMeta = posts.map(function(p) {
      return {
        ...p,
        upvoteCount: p.upvotes ? p.upvotes.length : 0,
        hasUpvoted: p.upvotes
          ? p.upvotes.some(function(id) {
              return id.toString() === req.user.id;
            })
          : false
      };
    });

    const totalPosts = await ForumPost.countDocuments({ subjectCode });
    const resolvedCount = await ForumPost.countDocuments({
      subjectCode, isResolved: true
    });

    res.render('forum/index', {
      subject,
      posts: postsWithMeta,
      totalPosts,
      resolvedCount,
      filter: filter || 'all',
      user: req.user
    });

  } catch (err) {
    console.error('Forum index error:', err);
    res.render('error', {
      message: 'Failed to load forum.',
      user: req.user
    });
  }
});

// ─────────────────────────────────────────────
// GET /forum/:subjectCode/post/:postId — View post
// ─────────────────────────────────────────────
router.get('/:subjectCode/post/:postId', protect, async (req, res) => {
  try {
    const { subjectCode, postId } = req.params;

    const allowed = await canAccessSubject(req.user, subjectCode);
    if (!allowed) {
      return res.render('error', {
        message: 'Access denied.',
        user: req.user
      });
    }

    const subject = await Subject.findOne({ subjectCode }).lean();
    const post = await ForumPost.findById(postId).lean();

    if (!post || post.subjectCode !== subjectCode) {
      return res.render('error', {
        message: 'Post not found.',
        user: req.user
      });
    }

    // Increment views
    await ForumPost.findByIdAndUpdate(postId, { $inc: { views: 1 } });

    const replies = await ForumReply.find({ postId })
      .sort({ isOfficialAnswer: -1, createdAt: 1 })
      .lean();

    const repliesWithMeta = replies.map(function(r) {
      return {
        ...r,
        upvoteCount: r.upvotes ? r.upvotes.length : 0,
        hasUpvoted: r.upvotes
          ? r.upvotes.some(function(id) {
              return id.toString() === req.user.id;
            })
          : false
      };
    });

    const postWithMeta = {
      ...post,
      upvoteCount: post.upvotes ? post.upvotes.length : 0,
      hasUpvoted: post.upvotes
        ? post.upvotes.some(function(id) {
            return id.toString() === req.user.id;
          })
        : false
    };

    res.render('forum/post', {
      subject,
      post: postWithMeta,
      replies: repliesWithMeta,
      user: req.user,
      success: req.query.success || null,
      error: req.query.error || null
    });

  } catch (err) {
    console.error('Forum post error:', err);
    res.render('error', {
      message: 'Failed to load post.',
      user: req.user
    });
  }
});

// ─────────────────────────────────────────────
// POST /forum/:subjectCode/new — Create post
// ─────────────────────────────────────────────
router.post('/:subjectCode/new', protect, async (req, res) => {
  const { subjectCode } = req.params;
  const { title, content } = req.body;

  if (!title || !content) {
    return res.redirect(
      `/forum/${subjectCode}?error=Title and content are required.`
    );
  }

  try {
    const allowed = await canAccessSubject(req.user, subjectCode);
    if (!allowed) {
      return res.redirect(`/forum/${subjectCode}?error=Access denied.`);
    }

    const subject = await Subject.findOne({ subjectCode }).lean();
    if (!subject) {
      return res.redirect(`/forum/${subjectCode}?error=Subject not found.`);
    }

    const post = await ForumPost.create({
      subjectCode,
      subjectName: subject.name,
      courseCode: subject.courseCode,
      semester: subject.semester,
      authorId: req.user.id,
      authorName: req.user.name,
      authorRole: req.user.role,
      title: title.trim(),
      content: content.trim(),
      createdAt: new Date()
    });

    return res.redirect(
      `/forum/${subjectCode}/post/${post._id}`
    );

  } catch (err) {
    console.error('Create post error:', err);
    return res.redirect(
      `/forum/${subjectCode}?error=Failed to post. Try again.`
    );
  }
});

// ─────────────────────────────────────────────
// POST /forum/:subjectCode/post/:postId/reply
// ─────────────────────────────────────────────
router.post('/:subjectCode/post/:postId/reply', protect, async (req, res) => {
  const { subjectCode, postId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.redirect(
      `/forum/${subjectCode}/post/${postId}?error=Reply cannot be empty.`
    );
  }

  try {
    const post = await ForumPost.findById(postId);
    if (!post) {
      return res.redirect(
        `/forum/${subjectCode}?error=Post not found.`
      );
    }

    const isOfficial = req.user.role === 'faculty' ||
                       req.user.role === 'admin';

    await ForumReply.create({
      postId,
      authorId: req.user.id,
      authorName: req.user.name,
      authorRole: req.user.role,
      content: content.trim(),
      isOfficialAnswer: isOfficial,
      createdAt: new Date()
    });

    // Update reply count
    await ForumPost.findByIdAndUpdate(postId, {
      $inc: { replyCount: 1 }
    });

    return res.redirect(
      `/forum/${subjectCode}/post/${postId}?success=Reply posted!`
    );

  } catch (err) {
    console.error('Reply error:', err);
    return res.redirect(
      `/forum/${subjectCode}/post/${postId}?error=Failed to post reply.`
    );
  }
});

// ─────────────────────────────────────────────
// POST /forum/post/:postId/upvote — Upvote post
// ─────────────────────────────────────────────
router.post('/post/:postId/upvote', protect, async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.postId);
    if (!post) return res.json({ success: false });

    const userId = req.user.id;
    const hasUpvoted = post.upvotes.some(function(id) {
      return id.toString() === userId;
    });

    if (hasUpvoted) {
      post.upvotes = post.upvotes.filter(function(id) {
        return id.toString() !== userId;
      });
    } else {
      post.upvotes.push(userId);
    }

    await post.save();
    return res.json({
      success: true,
      upvoteCount: post.upvotes.length,
      hasUpvoted: !hasUpvoted
    });

  } catch (err) {
    return res.json({ success: false });
  }
});

// ─────────────────────────────────────────────
// POST /forum/reply/:replyId/upvote
// ─────────────────────────────────────────────
router.post('/reply/:replyId/upvote', protect, async (req, res) => {
  try {
    const reply = await ForumReply.findById(req.params.replyId);
    if (!reply) return res.json({ success: false });

    const userId = req.user.id;
    const hasUpvoted = reply.upvotes.some(function(id) {
      return id.toString() === userId;
    });

    if (hasUpvoted) {
      reply.upvotes = reply.upvotes.filter(function(id) {
        return id.toString() !== userId;
      });
    } else {
      reply.upvotes.push(userId);
    }

    await reply.save();
    return res.json({
      success: true,
      upvoteCount: reply.upvotes.length,
      hasUpvoted: !hasUpvoted
    });

  } catch {
    return res.json({ success: false });
  }
});

// ─────────────────────────────────────────────
// POST /forum/post/:postId/resolve — Toggle resolve
// ─────────────────────────────────────────────
router.post('/post/:postId/resolve', protect, async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.postId);
    if (!post) return res.json({ success: false });

    // Only post author or faculty can resolve
    const canResolve =
      post.authorId.toString() === req.user.id ||
      req.user.role === 'faculty' ||
      req.user.role === 'admin';

    if (!canResolve) return res.json({ success: false });

    post.isResolved = !post.isResolved;
    await post.save();

    return res.json({
      success: true,
      isResolved: post.isResolved
    });

  } catch {
    return res.json({ success: false });
  }
});

// ─────────────────────────────────────────────
// POST /forum/post/:postId/pin — Pin/unpin (faculty)
// ─────────────────────────────────────────────
router.post('/post/:postId/pin', protect, facultyOnly, async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.postId);
    if (!post) return res.json({ success: false });
    post.isPinned = !post.isPinned;
    await post.save();
    return res.json({ success: true, isPinned: post.isPinned });
  } catch {
    return res.json({ success: false });
  }
});

// ─────────────────────────────────────────────
// POST /forum/post/:postId/delete
// ─────────────────────────────────────────────
router.post('/post/:postId/delete', protect, async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.postId);
    if (!post) return res.json({ success: false });

    const canDelete =
      post.authorId.toString() === req.user.id ||
      req.user.role === 'admin';

    if (!canDelete) return res.json({ success: false });

    await ForumReply.deleteMany({ postId: post._id });
    await ForumPost.findByIdAndDelete(post._id);

    return res.json({ success: true });

  } catch {
    return res.json({ success: false });
  }
});

// ─────────────────────────────────────────────
// POST /forum/reply/:replyId/official — Toggle official answer
// ─────────────────────────────────────────────
router.post('/reply/:replyId/official', protect, facultyOnly, async (req, res) => {
  try {
    const reply = await ForumReply.findById(req.params.replyId);
    if (!reply) return res.json({ success: false });
    reply.isOfficialAnswer = !reply.isOfficialAnswer;
    await reply.save();
    return res.json({
      success: true,
      isOfficialAnswer: reply.isOfficialAnswer
    });
  } catch {
    return res.json({ success: false });
  }
});

module.exports = router;