const Notification = require('../models/Notification');
const Student = require('../models/Student');
const nodemailer = require('nodemailer');

// ─────────────────────────────────────────────
// Email transporter (Gmail)
// ─────────────────────────────────────────────
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ Email credentials missing");
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// ─────────────────────────────────────────────
// Send email notification (with retry)
// ─────────────────────────────────────────────
const sendEmail = async (to, subject, html, retries = 2) => {
  const transporter = createTransporter();
  if (!transporter || !to) return;

  try {
    await transporter.sendMail({
      from: `"SOET Portal 🎓" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log(`📧 Email sent to ${to}`);
  } catch (err) {
    console.error(`❌ Email failed to ${to}:`, err.message);

    if (retries > 0) {
      console.log(`🔁 Retrying... (${retries})`);
      await new Promise(r => setTimeout(r, 1500));
      return sendEmail(to, subject, html, retries - 1);
    }
  }
};

// ─────────────────────────────────────────────
// Email template
// ─────────────────────────────────────────────
const buildEmailHTML = (title, message, subjectName, type, portalUrl) => {
  const icon = type === 'new_material' ? '📚' : type === 'new_pyq' ? '📝' : '📢';
  const color = type === 'new_material' ? '#003399' : type === 'new_pyq' ? '#7b1fa2' : '#e65100';

  return `
  <!DOCTYPE html>
  <html>
  <body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:520px;margin:30px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">

      <div style="background:${color};padding:28px 30px;text-align:center;">
        <div style="font-size:2.5rem;">${icon}</div>
        <h2 style="color:white;margin:10px 0 4px;font-size:1.2rem;">${title}</h2>
        <p style="color:rgba(255,255,255,0.8);margin:0;font-size:0.85rem;">
          SOET Resource Portal · KR Mangalam University
        </p>
      </div>

      <div style="padding:28px 30px;">
        <p style="color:#333;font-size:0.95rem;line-height:1.6;">
          ${message}
        </p>

        ${subjectName ? `
        <div style="background:#f0f4ff;border-left:4px solid ${color};border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:20px;">
          <div style="font-size:0.75rem;color:#888;text-transform:uppercase;">
            Subject
          </div>
          <div style="font-size:0.95rem;font-weight:600;color:#1a1a1a;margin-top:3px;">
            ${subjectName}
          </div>
        </div>` : ''}

        <a href="${portalUrl}" style="display:inline-block;background:${color};color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;">
          View on SOET Portal →
        </a>
      </div>

      <div style="background:#f8f9ff;padding:16px;text-align:center;border-top:1px solid #e0e7ff;">
        <p style="margin:0;font-size:0.75rem;color:#aaa;">
          You received this because you are enrolled in this subject.
        </p>
      </div>

    </div>
  </body>
  </html>
  `;
};

// ─────────────────────────────────────────────
// Notify students
// ─────────────────────────────────────────────
const notifyStudentsForSubject = async ({
  subjectCode,
  subjectName,
  courseCode,
  semester,
  type,
  title,
  message,
  refId
}) => {
  try {
    const students = await Student.find({
      courseCode,
      isActive: true
    }).lean();

    if (!students.length) {
      console.warn("⚠️ No students found");
      return;
    }

    const { getCurrentSemester } = require('./semesterHelper');

    const eligibleStudents = students.filter(s => {
      const currentSem = getCurrentSemester(s.enrollmentYear);
      return currentSem === semester;
    });

    if (!eligibleStudents.length) {
      console.warn("⚠️ No eligible students");
      return;
    }

    // Save notifications
    const notifications = eligibleStudents.map(s => ({
      recipientId: s._id,
      recipientRole: 'student',
      type,
      title,
      message,
      subjectCode,
      subjectName,
      courseCode,
      semester,
      refId: refId || null,
      isRead: false,
      createdAt: new Date()
    }));

    await Notification.insertMany(notifications);
    console.log(`✅ ${notifications.length} notifications created`);

    // Send Emails
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const portalUrl = process.env.PORTAL_URL || 'http://localhost:3000';
      const html = buildEmailHTML(title, message, subjectName, type, portalUrl);

      const batchSize = 5; // reduced for stability

      for (let i = 0; i < eligibleStudents.length; i += batchSize) {
        const batch = eligibleStudents.slice(i, i + batchSize);

        await Promise.all(
          batch.map(s => {
            if (!s.email) return null;
            return sendEmail(s.email, title, html);
          })
        );

        await new Promise(r => setTimeout(r, 1200));
      }
    }

  } catch (err) {
    console.error('❌ Notification error:', err.message);
  }
};

// ─────────────────────────────────────────────
// Get unread count
// ─────────────────────────────────────────────
const getUnreadCount = async (userId) => {
  try {
    return await Notification.countDocuments({
      recipientId: userId,
      isRead: false
    });
  } catch (err) {
    console.error("Unread count error:", err.message);
    return 0;
  }
};

module.exports = {
  notifyStudentsForSubject,
  getUnreadCount,
  sendEmail,
  buildEmailHTML
};
