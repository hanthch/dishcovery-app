const express = require('express');
const router = express.Router();
// BUG FIX #7: removed unused bcrypt and crypto imports
// Supabase Auth handles all password hashing internally
const { supabase } = require('../config/supabase');
const { requireAuth, generateToken } = require('../middleware/auth');

// ============================================================
// POST /auth/register
// ============================================================
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, username, full_name } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email, password, and username are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Password must be at least 6 characters',
      });
    }

    // Validate username format (alphanumeric + underscore only)
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Username must be 3-30 characters, letters/numbers/underscores only',
      });
    }

    // Check username uniqueness
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Username already taken',
      });
    }

    // Create Supabase auth user (Supabase handles password hashing)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,  // skip email verification for dev; set false in production
      user_metadata: { username, full_name: full_name || username },
    });

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Email already registered',
        });
      }
      throw authError;
    }

    const userId = authData.user.id;

    // Upsert profile row (the trigger should have created it; this is a safety net)
    await supabase
      .from('profiles')
      .upsert({
        id: userId,
        username,
        full_name: full_name || username,
        avatar_url: null,
      })
      .select()
      .single();

    const token = generateToken(userId, email);

    const user = {
      id: userId,
      email,
      username,
      full_name: full_name || username,
      avatar_url: null,
      followers_count: 0,
      following_count: 0,
      posts_count: 0,
    };

    res.status(201).json({
      data: { user, token },
      message: 'Account created successfully',
    });
  } catch (error) {
    console.error('[Auth] POST /register error:', error);
    next(error);
  }
});

// ============================================================
// POST /auth/login
// ============================================================
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email and password are required',
      });
    }

    // Supabase validates credentials
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    const userId = authData.user.id;

    // Fetch full profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('[Auth] Profile fetch error on login:', profileError);
    }

    const token = generateToken(userId, email);

    const user = {
      id: userId,
      email: authData.user.email,
      username: profile?.username || email.split('@')[0],
      full_name: profile?.full_name || '',
      avatar_url: profile?.avatar_url || null,
      bio: profile?.bio || null,
      followers_count: profile?.followers_count || 0,
      following_count: profile?.following_count || 0,
      posts_count: profile?.posts_count || 0,
    };

    res.json({
      data: { user, token },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('[Auth] POST /login error:', error);
    next(error);
  }
});

// ============================================================
// POST /auth/logout
// JWT is stateless — client clears token from AsyncStorage
// ============================================================
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// ============================================================
// GET /auth/me
// Returns current user profile (requires valid JWT)
// ============================================================
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.userId)
      .maybeSingle();

    if (error) throw error;

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      data: {
        id: req.userId,
        email: req.userEmail,
        ...profile,
      },
    });
  } catch (error) {
    console.error('[Auth] GET /me error:', error);
    next(error);
  }
});

// ============================================================
// POST /auth/forgot-password
// Step 1: generates + stores a 6-digit code
// In production: integrate an email provider (Resend, SendGrid)
// ============================================================
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Generate a 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalidate any existing unused codes for this email first
    await supabase
      .from('password_reset_codes')
      .update({ used: true })
      .eq('email', email)
      .eq('used', false);

    // Store new code
    const { error } = await supabase
      .from('password_reset_codes')
      .insert({ email, code, expires_at: expiresAt.toISOString() });

    if (error) throw error;

    // TODO in production: send email with code via Resend/SendGrid
    // For development: code is logged to console
    console.log(`[Auth] 🔑 Password reset code for ${email}: ${code}`);

    // Always return success to prevent email enumeration attacks
    res.json({ message: 'If that account exists, a reset code was sent' });
  } catch (error) {
    console.error('[Auth] POST /forgot-password error:', error);
    next(error);
  }
});

// ============================================================
// POST /auth/verify-code
// Step 2: verify the 6-digit code
// ============================================================
router.post('/verify-code', async (req, res, next) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const { data, error } = await supabase
      .from('password_reset_codes')
      .select('id')
      .eq('email', email)
      .eq('code', code)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(400).json({
        error: 'Invalid Code',
        message: 'Code is invalid or has expired',
      });
    }

    res.json({ message: 'Code verified successfully' });
  } catch (error) {
    console.error('[Auth] POST /verify-code error:', error);
    next(error);
  }
});

// ============================================================
// POST /auth/reset-password
// Step 3: set new password using verified code
// ============================================================
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, code, password } = req.body;

    if (!email || !code || !password) {
      return res.status(400).json({ error: 'Email, code, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Re-verify code (prevents token reuse attacks)
    const { data: codeData, error: codeError } = await supabase
      .from('password_reset_codes')
      .select('id')
      .eq('email', email)
      .eq('code', code)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeError) throw codeError;

    if (!codeData) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    // Find user by email via admin API
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const user = listData?.users?.find(u => u.email === email);
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email' });
    }

    // Update password in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password }
    );

    if (updateError) throw updateError;

    // Mark code as used so it cannot be reused
    await supabase
      .from('password_reset_codes')
      .update({ used: true })
      .eq('id', codeData.id);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('[Auth] POST /reset-password error:', error);
    next(error);
  }
});

module.exports = router;