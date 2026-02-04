const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const supabase = require('../config/supabase');

// GET /api/v1/users/:userId - Get user profile
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('users')
      .select('*, posts(count), followers:follows!followed_id(count), following:follows!follower_id(count)')
      .eq('id', userId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'User not found' });

    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/users/:userId/follow - Follow user
router.post('/:userId/follow', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user.id;

    if (userId === followerId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const { data, error } = await supabase
      .from('follows')
      .insert([{ follower_id: followerId, followed_id: userId }])
      .select();

    if (error) throw error;

    res.json({ data, message: 'User followed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/users/:userId/unfollow - Unfollow user
router.post('/:userId/unfollow', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user.id;

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('followed_id', userId);

    if (error) throw error;

    res.json({ message: 'User unfollowed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/users/:userId/followers - Get user followers
router.get('/:userId/followers', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('follows')
      .select('follower:users!follower_id(*)')
      .eq('followed_id', userId);

    if (error) throw error;

    res.json({ data: data.map(item => item.follower) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/users/:userId/following - Get user following
router.get('/:userId/following', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('follows')
      .select('followed:users!followed_id(*)')
      .eq('follower_id', userId);

    if (error) throw error;

    res.json({ data: data.map(item => item.followed) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/users/me/saved-posts - Get saved posts
router.get('/me/saved-posts', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('saved_posts')
      .select('post:posts(*, users(*))')
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ data: data.map(item => item.post) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/users/me/saved-restaurants - Get saved restaurants
router.get('/me/saved-restaurants', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('saved_restaurants')
      .select('restaurant:restaurants(*)')
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ data: data.map(item => item.restaurant) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;