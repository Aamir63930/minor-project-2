const jwt = require('jsonwebtoken');

/**
 * Utility: Set no-cache headers
 */
const setNoCache = (res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
};

/**
 * Middleware: Protect routes (optionally role-based)
 * Usage:
 * protect() → only authentication
 * protect(['admin']) → only admin
 * protect(['student', 'faculty']) → multiple roles
 */
const protect = (roles = []) => {
  return (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
      setNoCache(res);
      return res.redirect('/auth/landing');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      // Role-based check (if roles provided)
      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).send('Access Denied');
      }

      setNoCache(res);
      next();
    } catch (err) {
      console.error('JWT Error:', err.message);
      res.clearCookie('token');
      setNoCache(res);
      return res.redirect('/auth/landing');
    }
  };
};

/**
 * Middleware: Redirect logged-in users away from auth pages
 */
const redirectIfLoggedIn = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === 'student') {
      return res.redirect('/student/dashboard');
    }

    if (decoded.role === 'faculty' || decoded.role === 'admin') {
      return res.redirect('/faculty/dashboard');
    }

  } catch (err) {
    console.warn('Invalid token, clearing cookie...');
    res.clearCookie('token');
  }

  next();
};

module.exports = { protect, redirectIfLoggedIn };