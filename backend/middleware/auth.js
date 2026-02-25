const jwt = require('jsonwebtoken');

// ============================================================
// MIDDLEWARE: requireAuth
// Protects routes that need a logged-in user.
// Reads the Bearer token from the Authorization header,
// verifies it with JWT_SECRET, and attaches userId + userEmail
// to the request object for downstream route handlers.
// Returns 401 if no token or token is invalid/expired.
// ============================================================
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }

    // Attach to request so route handlers can use req.userId / req.userEmail
    req.userId    = decoded.userId;
    req.userEmail = decoded.email;

    next();
  } catch (error) {
    console.error('[Auth Middleware] requireAuth error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================
// MIDDLEWARE: optionalAuth
// Same as requireAuth but never blocks the request.
// If a valid token is present, req.userId / req.userEmail are set.
// If no token or an invalid token is provided, the request
// continues with req.userId === undefined.
// Used on public routes that have auth-aware behaviour
// (e.g. showing whether a post is liked by the current user).
// ============================================================
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId    = decoded.userId;
        req.userEmail = decoded.email;
      } catch {
        // Invalid token — continue without auth, do not block
      }
    }

    next();
  } catch (error) {
    // Never block the request in optional auth
    next();
  }
};

// ============================================================
// HELPER: generateToken
// Creates a signed JWT for a user after login or registration.
// The token payload contains userId and email.
// Expiry defaults to 7d if JWT_EXPIRES_IN is not set in .env.
//
// NOTE: This is our own JWT system, completely separate from
// Supabase Auth tokens. Never pass these tokens to
// supabase.auth.getUser() — use req.userId from requireAuth
// middleware instead.
// ============================================================
const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = { requireAuth, optionalAuth, generateToken };