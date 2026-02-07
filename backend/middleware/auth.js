const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify using the Secret from your Supabase Dashboard
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /**
     * IMPORTANT: Supabase stores the User ID in the 'sub' (subject) field of the JWT.
     * We map 'sub' to 'id' so your existing route code (req.user.id) doesn't break.
     */
    req.user = {
      ...decoded,
      id: decoded.sub 
    };

    next();
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    const message = error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ error: message });
  }
};

module.exports = authMiddleware;