const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');
const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const { redirectIfLoggedIn } = require('../middleware/auth');

// ─────────────────────────────────────
// Helper: sign JWT and set cookie
// ─────────────────────────────────────
const signTokenAndCookie = (res, payload) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  return token;
};

// ─────────────────────────────────────
// GET /auth/landing
// ─────────────────────────────────────
router.get('/landing', redirectIfLoggedIn, (req, res) => {
  res.render('auth/landing', { error: null, query: req.query });
});

// ─────────────────────────────────────
// GET /auth/faculty-login
// ─────────────────────────────────────
router.get('/faculty-login', redirectIfLoggedIn, (req, res) => {
  res.render('auth/faculty-login', { error: null, email: '' });
});

// ─────────────────────────────────────
// POST /auth/login  (Faculty / Admin manual login)
// ─────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Basic input validation
  if (!email || !password) {
    return res.render('auth/faculty-login', {
      error: 'Email and password are required.',
      email: email || ''
    });
  }

  try {
    const faculty = await Faculty.findOne({ email: email.toLowerCase().trim() });

    if (!faculty) {
      return res.render('auth/faculty-login', {
        error: 'No account found with this email.',
        email
      });
    }

    if (!faculty.isActive) {
      return res.render('auth/faculty-login', {
        error: 'Your account has been deactivated. Contact admin.',
        email
      });
    }

    const isMatch = await bcrypt.compare(password, faculty.password);
    if (!isMatch) {
      return res.render('auth/faculty-login', {
        error: 'Incorrect password. Please try again.',
        email
      });
    }

    // Sign JWT
    signTokenAndCookie(res, {
      id: faculty._id,
      email: faculty.email,
      name: faculty.name,
      role: faculty.role,         // 'faculty' or 'admin'
      employeeId: faculty.employeeId,
      designation: faculty.designation,
    });

    return res.redirect('/faculty/dashboard');

  } catch (err) {
    console.error('Faculty login error:', err);
    return res.render('auth/faculty-login', {
      error: 'Server error. Please try again.',
      email
    });
  }
});

// ─────────────────────────────────────
// GET /auth/azure   — Redirect to Microsoft login
// ─────────────────────────────────────
router.get('/azure', redirectIfLoggedIn, (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.AZURE_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.AZURE_REDIRECT_URI,
    response_mode: 'query',
    scope: 'openid profile email User.Read',
    prompt: 'select_account',
  });

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
  return res.redirect(authUrl);
});

// ─────────────────────────────────────
// GET /auth/azure/callback
// ─────────────────────────────────────
router.get('/azure/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    console.error('Azure OAuth error:', error_description);
    return res.render('auth/landing', {
      error: 'Microsoft login failed. Please try again.'
    });
  }

  if (!code) {
    return res.render('auth/landing', {
      error: 'No authorization code received from Microsoft.'
    });
  }

  try {
    // Step 1: Exchange code for tokens
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/common/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.AZURE_CLIENT_ID,
          client_secret: process.env.AZURE_CLIENT_SECRET,
          code,
          redirect_uri: process.env.AZURE_REDIRECT_URI,
          grant_type: 'authorization_code',
          scope: 'openid profile email User.Read',
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Token exchange error:', tokenData.error_description);
      return res.render('auth/landing', {
        error: 'Failed to complete Microsoft authentication.'
      });
    }

    // Step 2: Get user profile from Microsoft Graph
    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await profileResponse.json();
    const msEmail = (profile.mail || profile.userPrincipalName || '').toLowerCase().trim();

    if (!msEmail) {
      return res.render('auth/landing', {
        error: 'Could not retrieve your email from Microsoft. Try again.'
      });
    }

    // Step 3: Domain check — must be @krmu.edu.in
    if (!msEmail.endsWith('@krmu.edu.in')) {
      return res.render('auth/landing', {
        error: `Access denied. Only @krmu.edu.in accounts are allowed. You logged in with: ${msEmail}`
      });
    }

    // Step 4: Check if student exists in our database
    const student = await Student.findOne({ email: msEmail });

    if (!student) {
      return res.render('auth/landing', {
        error: 'Your email is not registered with SOET. Contact your department administrator.'
      });
    }

    if (!student.isActive) {
      return res.render('auth/landing', {
        error: 'Your account has been deactivated. Contact the department.'
      });
    }

    // Step 5: Sign JWT for student
    signTokenAndCookie(res, {
      id: student._id,
      email: student.email,
      name: student.name,
      role: 'student',
      rollNo: student.rollNo,
      courseCode: student.courseCode,
      enrollmentYear: student.enrollmentYear,
      section: student.section,
    });

    return res.redirect('/student/dashboard');

  } catch (err) {
    console.error('Azure callback error:', err);
    return res.render('auth/landing', {
      error: 'An unexpected error occurred during login. Please try again.'
    });
  }
});

// ─────────────────────────────────────
// GET /auth/logout
// ─────────────────────────────────────
router.get('/logout', (req, res) => {
  // Destroy the JWT cookie
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });

  // Set no-cache so back button doesn't restore dashboard
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');

  // Redirect to MS logout → comes back to landing after
  const portalUrl = process.env.PORTAL_URL || 'http://localhost:3000';
  const postLogout = encodeURIComponent(`${portalUrl}/auth/landing`);
  return res.redirect(
    `https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=${postLogout}`
  );
});

module.exports = router;