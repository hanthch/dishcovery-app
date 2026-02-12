const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const supabase = require('../config/supabase');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

const createEmailTransporter = () => {
  // Check which email service to use based on environment variables
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use App Password, not regular password
      },
    });
  } else if (process.env.EMAIL_SERVICE === 'smtp') {
    // Custom SMTP server (for services like SendGrid, Mailgun, etc.)
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  } else {
    // Fallback to console logging if no email service configured
    console.warn('No email service configured. Emails will be logged to console.');
    return null;
  }
};

const transporter = createEmailTransporter();

/**
 * Send verification email with reset code
 * @param {string} email - Recipient email address
 * @param {string} code - 6-digit verification code
 * @returns {Promise<void>}
 */
const sendVerificationEmail = async (email, code) => {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset - Dishcovery</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #FF6B6B 0%, #FFA500 100%); padding: 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800;">
                    🍽️ Dishcovery
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 24px; font-weight: 700;">
                    Password Reset Request
                  </h2>
                  
                  <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                    You recently requested to reset your password for your Dishcovery account. 
                    Use the verification code below to complete the process:
                  </p>
                  
                  <!-- Verification Code Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td align="center" style="background-color: #f9f9f9; border: 2px dashed #e0e0e0; border-radius: 12px; padding: 30px;">
                        <p style="color: #999; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">
                          Your Verification Code
                        </p>
                        <h1 style="color: #FF6B6B; font-size: 42px; font-weight: 800; letter-spacing: 8px; margin: 0;">
                          ${code}
                        </h1>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                    <strong>This code will expire in 15 minutes</strong>
                  </p>
                  
                  <div style="background-color: #fff9e6; border-left: 4px solid #FFA500; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="color: #666; font-size: 14px; margin: 0; line-height: 1.6;">
                      <strong>Security tip:</strong> If you didn't request this password reset, 
                      please ignore this email or contact support if you have concerns about your account security.
                    </p>
                  </div>
                  
                  <p style="color: #999; font-size: 13px; line-height: 1.6; margin: 30px 0 0 0;">
                    Questions? Contact us at 
                    <a href="mailto:support@dishcovery.app" style="color: #FF6B6B; text-decoration: none;">
                      support@dishcovery.app
                    </a>
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9f9f9; padding: 20px 30px; border-top: 1px solid #e0e0e0;">
                  <p style="color: #999; font-size: 12px; margin: 0; text-align: center; line-height: 1.5;">
                    © ${new Date().getFullYear()} Dishcovery. All rights reserved.<br>
                    This is an automated email, please do not reply.
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Plain text version for email clients that don't support HTML
  const emailText = `
Dishcovery - Password Reset Request

You recently requested to reset your password for your Dishcovery account.

Your verification code is: ${code}

This code will expire in 15 minutes.

If you didn't request this password reset, please ignore this email.

Questions? Contact us at support@dishcovery.app

© ${new Date().getFullYear()} Dishcovery. All rights reserved.
  `;

  // If transporter is configured, send actual email
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: {
          name: 'Dishcovery',
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER
        },
        to: email,
        subject: 'Your Password Reset Code - Dishcovery',
        text: emailText,
        html: emailHtml,
      });

      console.log('Email sent successfully to:', email);
      console.log('Message ID:', info.messageId);
      
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send verification email');
    }
  } else {
    // Fallback to console logging for development
    console.log('='.repeat(70));
    console.log('EMAIL SIMULATION - Verification Code');
    console.log('='.repeat(70));
    console.log(`To: ${email}`);
    console.log(`Subject: Your Password Reset Code - Dishcovery`);
    console.log(`Code: ${code}`);
    console.log(`Expires: 15 minutes`);
    console.log('='.repeat(70));
    console.log('Configure EMAIL_SERVICE in .env to send real emails');
    console.log('='.repeat(70));
    
    return true;
  }
};

/**
 * Send welcome email after successful registration
 * @param {string} email - User's email
 * @param {string} username - User's username
 * @returns {Promise<void>}
 */
const sendWelcomeEmail = async (email, username) => {
  if (!transporter) {
    console.log(`📧 Welcome email (simulated) sent to: ${email}`);
    return;
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to Dishcovery!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
              
              <tr>
                <td style="background: linear-gradient(135deg, #FF6B6B 0%, #FFA500 100%); padding: 40px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 32px;">
                    🍽️ Welcome to Dishcovery!
                  </h1>
                </td>
              </tr>
              
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #1a1a1a; margin: 0 0 20px 0;">
                    Hi ${username}! 👋
                  </h2>
                  
                  <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Thank you for joining Dishcovery! We're excited to have you as part of our community.
                  </p>
                  
                  <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                    Start exploring amazing restaurants, share your culinary adventures, and connect with food lovers around you!
                  </p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="#" style="background-color: #FF6B6B; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-size: 16px; font-weight: 700; display: inline-block;">
                      Start Exploring
                    </a>
                  </div>
                  
                  <p style="color: #999; font-size: 14px; text-align: center; margin: 30px 0 0 0;">
                    Need help? Contact us at 
                    <a href="mailto:support@dishcovery.app" style="color: #FF6B6B;">support@dishcovery.app</a>
                  </p>
                </td>
              </tr>
              
              <tr>
                <td style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
                  <p style="color: #999; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Dishcovery. All rights reserved.
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: {
        name: 'Dishcovery',
        address: process.env.EMAIL_FROM || process.env.EMAIL_USER
      },
      to: email,
      subject: 'Welcome to Dishcovery! 🍽️',
      html: emailHtml,
    });
    console.log('Welcome email sent to:', email);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error for welcome email - it's not critical
  }
};

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

    if (!email || !password || !username || !firstName || !lastName) {
      return res.status(400).json({ 
        error: 'All required fields must be filled (email, password, username, firstName, lastName)' 
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return res.status(400).json({ 
        error: 'Password must contain uppercase, lowercase, and numbers' 
      });
    }

    if (phoneNumber && !/^\+84\d{9}$/.test(phoneNumber)) {
      return res.status(400).json({ 
        error: 'Invalid Vietnamese phone number format. Expected: +84XXXXXXXXX' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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
      console.error('Supabase registration error:', error);
      
      if (error.code === '23505') {
        if (error.message.includes('email')) {
          return res.status(400).json({ error: 'Email already exists' });
        } else if (error.message.includes('username')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(400).json({ error: 'Email or username already exists' });
      }
      
      throw error;
    }

    delete data.password;

    const token = jwt.sign(
      { 
        id: data.id, 
        email: data.email,
        username: data.username 
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log(`User registered successfully: ${data.email}`);

    sendWelcomeEmail(email, username).catch(err => {
      console.error('Welcome email failed (non-critical):', err);
    });

    return res.status(201).json({
      data: {
        user: data,
        token,
      },
    });
  } catch (error) {
    console.error('REGISTER ERROR:', error);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

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
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    delete user.password;

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        username: user.username 
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log(`User logged in: ${user.email}`);

    return res.json({
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (!user || userError) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return res.json({ message: 'If this email exists, a verification code has been sent' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from('password_reset_codes')
      .insert([{ 
        email, 
        code, 
        expires_at: expiresAt 
      }]);

    if (insertError) {
      console.error('Error storing reset code:', insertError);
      throw insertError;
    }

    await sendVerificationEmail(email, code);

    console.log(`Password reset code sent to: ${email}`);

    return res.json({ 
      message: 'Verification code sent to your email',
      ...(process.env.NODE_ENV === 'development' && { devCode: code })
    });
  } catch (error) {
    console.error('FORGOT PASSWORD ERROR:', error);
    return res.status(500).json({ error: 'Server error while processing password reset' });
  }
});

router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Invalid code format' });
    }

    const { data, error } = await supabase
      .from('password_reset_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      console.log(`Invalid or expired code attempt for: ${email}`);
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    console.log(`Code verified for: ${email}`);

    return res.json({ 
      message: 'Code verified successfully',
      verified: true 
    });
  } catch (error) {
    console.error('VERIFY CODE ERROR:', error);
    return res.status(500).json({ error: 'Server error during code verification' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, password } = req.body;

    if (!email || !code || !password) {
      return res.status(400).json({ error: 'Email, code, and new password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return res.status(400).json({ 
        error: 'Password must contain uppercase, lowercase, and numbers' 
      });
    }

    const { data: resetData, error: resetError } = await supabase
      .from('password_reset_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (resetError || !resetData) {
      return res.status(400).json({ error: 'Invalid or expired reset session' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('email', email);

    if (updateError) {
      console.error('Error updating password:', updateError);
      throw updateError;
    }

    await supabase
      .from('password_reset_codes')
      .delete()
      .eq('email', email);

    console.log(`Password reset successfully for: ${email}`);

    return res.json({ 
      message: 'Password reset successfully' 
    });
  } catch (error) {
    console.error('RESET PASSWORD ERROR:', error);
    return res.status(500).json({ error: 'Server error during password reset' });
  }
});


router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    delete user.password;

    return res.json({
      data: user,
    });
  } catch (error) {
    console.error('GET CURRENT USER ERROR:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  console.log('User logged out');
  return res.json({ message: 'Logged out successfully' });
});

module.exports = router;
