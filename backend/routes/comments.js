const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const supabase = require('../config/supabase');

// This file is mainly for comment-related routes that aren't nested under posts
// Most comment routes are already in posts.js

module.exports = router;