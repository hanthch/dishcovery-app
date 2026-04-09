const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { requireAuth, generateToken } = require('../middleware/auth');

router.post('/social', async (req, res, next) => {
  try {
    const { provider, access_token, identity_token } = req.body;

    if (!provider || (!access_token && !identity_token)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'provider and access_token (or identity_token for Apple) are required',
      });
    }

    if (!['google', 'facebook', 'apple'].includes(provider)) {
      return res.status(400).json({ error: 'Unsupported provider' });
    }

    let authData, authError;

    if (provider === 'apple') {
      ({ data: authData, error: authError } =
        await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: identity_token,
        }));
    } else {
      ({ data: authData, error: authError } =
        await supabase.auth.signInWithIdToken({
          provider,
          token: access_token,
        }));
    }

    if (authError) {
      console.error(`[Auth] /social ${provider} error:`, authError);
      return res.status(401).json({
        error: 'Unauthorized',
        message: `${provider} authentication failed`,
      });
    }

    const supabaseUser = authData.user;
    const userId       = supabaseUser.id;
    const email        = supabaseUser.email || `${userId}@noemail.dishcovery.app`;

    const meta      = supabaseUser.user_metadata || {};
    const fullName  = meta.full_name || meta.name || meta.given_name || '';
    const avatarUrl = meta.avatar_url || meta.picture || null;

    const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 25);

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, username, role, is_banned')
      .eq('id', userId)
      .maybeSingle();

    let username = existingProfile?.username;

    if (!existingProfile) {
      let candidate = baseUsername;
      let suffix = 0;
      while (true) {
        const { data: taken } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', candidate)
          .maybeSingle();
        if (!taken) break;
        suffix++;
        candidate = `${baseUsername}_${suffix}`;
      }
      username = candidate;

      await supabase.from('profiles').upsert({
        id: userId,
        username,
        full_name: fullName,
        avatar_url: avatarUrl,
        role: 'user',
        is_banned: false,
      });
    }

    if (existingProfile?.is_banned) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This account has been suspended',
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const token = generateToken(userId, email);

    const user = {
      id:              userId,
      email,
      username:        profile?.username || username,
      full_name:       profile?.full_name || fullName,
      avatar_url:      profile?.avatar_url || avatarUrl,
      role:            profile?.role || 'user',
      is_banned:       profile?.is_banned || false,
      followers_count: profile?.followers_count || 0,
      following_count: profile?.following_count || 0,
      posts_count:     profile?.posts_count || 0,
      contributions:   profile?.contributions || 0,
      scout_points:    profile?.scout_points || 0,
      badges:          profile?.badges || [],
    };

    res.json({ data: { user, token }, message: 'Social login successful' });
  } catch (error) {
    console.error('[Auth] POST /social error:', error);
    next(error);
  }
});

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

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Username must be 3-30 characters, letters/numbers/underscores only',
      });
    }

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

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, full_name: full_name || username },
    });

    if (authError) {
      if (
        authError.message.includes('already registered') ||
        authError.message.includes('already been registered')
      ) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Email already registered',
        });
      }
      throw authError;
    }

    const userId = authData.user.id;

    await supabase
      .from('profiles')
      .upsert({ id: userId, username, full_name: full_name || username, avatar_url: null })
      .select()
      .single();

    const token = generateToken(userId, email);

    const user = {
      id:              userId,
      email,
      username,
      full_name:       full_name || username,
      avatar_url:      null,
      role:            'user',
      is_banned:       false,
      followers_count: 0,
      following_count: 0,
      posts_count:     0,
      contributions:   0,
      scout_points:    0,
      badges:          [],
    };

    res.status(201).json({ data: { user, token }, message: 'Account created successfully' });
  } catch (error) {
    console.error('[Auth] POST /register error:', error);
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email and password are required',
      });
    }

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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('[Auth] Profile fetch error on login:', profileError);
    }

    // Check ban status
    if (profile?.is_banned) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This account has been suspended',
      });
    }

    const token = generateToken(userId, email);

    const user = {
      id:              userId,
      email:           authData.user.email,
      username:        profile?.username || email.split('@')[0],
      full_name:       profile?.full_name || '',
      avatar_url:      profile?.avatar_url || null,
      bio:             profile?.bio || null,
      role:            profile?.role || 'user',
      is_banned:       profile?.is_banned || false,
      followers_count: profile?.followers_count || 0,
      following_count: profile?.following_count || 0,
      posts_count:     profile?.posts_count || 0,
      contributions:   profile?.contributions || 0,
      scout_points:    profile?.scout_points || 0,
      badges:          profile?.badges || [],
    };

    res.json({ data: { user, token }, message: 'Login successful' });
  } catch (error) {
    console.error('[Auth] POST /login error:', error);
    next(error);
  }
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

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

    res.json({ data: { id: req.userId, email: req.userEmail, ...profile } });
  } catch (error) {
    console.error('[Auth] GET /me error:', error);
    next(error);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const code      = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await supabase
      .from('password_reset_codes')
      .update({ used: true })
      .eq('email', email)
      .eq('used', false);

    const { error } = await supabase
      .from('password_reset_codes')
      .insert({ email, code, expires_at: expiresAt.toISOString(), used: false });

    if (error) {
      console.error('[Auth] Failed to insert reset code:', error);
      throw error;
    }

    console.log(`[Auth] 🔑 Password reset code for ${email}: ${code}`);

    res.json({ message: 'If that account exists, a reset code was sent' });
  } catch (error) {
    console.error('[Auth] POST /forgot-password error:', error);
    next(error);
  }
});


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

router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, code, password } = req.body;

    if (!email || !code || !password) {
      return res.status(400).json({ error: 'Email, code, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

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

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    let userId = profileData?.id;

    if (!userId) {
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
        perPage: 1000,
        page: 1,
      });
      if (listError) throw listError;
      const found = listData?.users?.find(u => u.email === email);
      if (!found) {
        return res.status(404).json({ error: 'No account found with this email' });
      }
      userId = found.id;
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password,
    });

    if (updateError) throw updateError;

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