const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');

const API_BASE_URL = 'https://xxxxx.ngrok.io/api/v1';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined');
}

// ==========================================
// 1. REGISTRATION
// ==========================================

router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      username,
      firstName,
      lastName,
      birthDate,
      phoneNumber,
    } = req.body;

    // Basic validation
    if (!email || !password || !username || !firstName || !lastName) {
      return res.status(400).json({ error: 'All required fields must be filled' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password: hashedPassword,
          username,
          first_name: firstName,
          last_name: lastName,
          birth_date: birthDate || null,
          phone_number: phoneNumber || null,
          name: `${firstName} ${lastName}`,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({
          error: 'Email or username already exists',
        });
      }
      throw error;
    }

    // 🔐 IMPORTANT: never return password
    delete data.password;

    // Generate JWT
    const token = jwt.sign(
      { id: data.id, email: data.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      data: {
        user: data,
        token,
      },
    });
  } catch (error) {
    console.error('REGISTER ERROR:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// 2. LOGIN
// ==========================================

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    delete user.password;

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// 3. PASSWORD RESET FLOW
// ==========================================

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('password_reset_codes')
      .insert([{ email, code, expires_at: expiresAt }]);

    if (error) throw error;

    // TODO: send email
    return res.json({ message: 'Verification code sent' });
  } catch (error) {
    console.error('FORGOT PASSWORD ERROR:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    const { data, error } = await supabase
      .from('password_reset_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    return res.json({ message: 'Code verified' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, password } = req.body;

    const { data } = await supabase
      .from('password_reset_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!data) {
      return res.status(400).json({ error: 'Invalid session' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('email', email);

    await supabase
      .from('password_reset_codes')
      .delete()
      .eq('email', email);

    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
