const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');

// Assume 'db' is your PostgreSQL connection for the password_reset_codes table
// const db = require('../config/db'); 

// ==========================================
// 1. REGISTRATION & LOGIN
// ==========================================

// POST /api/v1/auth/register - Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, name } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in Supabase
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password: hashedPassword,
          username,
          name,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Generate JWT token
    const token = jwt.sign(
      { id: data.id, email: data.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      data: {
        user: data,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/auth/login - Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    // Remove password from response
    delete user.password;

    res.json({
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/auth/logout - Logout user
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// ==========================================
// 2. PASSWORD RESET FLOW
// ==========================================

// Forgot Password - Send verification code
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code in database with 15-minute expiry
    await db.query(
      'INSERT INTO password_reset_codes (email, code, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'15 minutes\')',
      [email, code]
    );
    
    // Note: Integration with email service (e.g., Nodemailer) should happen here
    
    res.json({ 
      message: 'Mã xác nhận đã được gửi đến email của bạn' 
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Verify Code - Check if the user-entered code is valid
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    const result = await db.query(
      'SELECT * FROM password_reset_codes WHERE email = $1 AND code = $2 AND expires_at > NOW()',
      [email, code]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Mã xác nhận không hợp lệ hoặc đã hết hạn' });
    }
    
    res.json({ message: 'Mã xác nhận hợp lệ' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Reset Password - Update the user's password in the database
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, password } = req.body;
    
    // Verify code again for security
    const codeCheck = await db.query(
      'SELECT * FROM password_reset_codes WHERE email = $1 AND code = $2 AND expires_at > NOW()',
      [email, code]
    );
    
    if (codeCheck.rows.length === 0) {
      return res.status(400).json({ message: 'Mã xác nhận không hợp lệ' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update password in the users table
    await db.query(
      'UPDATE users SET password = $1 WHERE email = $2',
      [hashedPassword, email]
    );
    
    // Delete used code
    await db.query(
      'DELETE FROM password_reset_codes WHERE email = $1',
      [email]
    );
    
    res.json({ message: 'Mật khẩu đã được đặt lại thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Resend Code - Clear old codes and send a new one
router.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Delete old codes
    await db.query('DELETE FROM password_reset_codes WHERE email = $1', [email]);
    
    // Generate new 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    await db.query(
      'INSERT INTO password_reset_codes (email, code, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'15 minutes\')',
      [email, code]
    );
    
    res.json({ message: 'Mã xác nhận mới đã được gửi' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;