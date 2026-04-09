const { supabase } = require('../config/supabase');

const requireAdmin = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, is_banned')
      .eq('id', req.userId)
      .maybeSingle();

    if (error) {
      console.error('[AdminAuth] Profile fetch error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required',
      });
    }

    if (profile.is_banned) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Account is suspended',
      });
    }

    req.userRole = 'admin';
    next();
  } catch (error) {
    console.error('[AdminAuth] requireAdmin error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { requireAdmin };