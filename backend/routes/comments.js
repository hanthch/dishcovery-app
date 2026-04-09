const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
// FIX: use requireAuth middleware (custom JWT) instead of supabase.auth.getUser()
// supabase.auth.getUser() expects a Supabase-issued JWT, but this app issues
// its own JWTs signed with JWT_SECRET — they are incompatible.
const { requireAuth } = require('../middleware/auth');

// GET /api/v1/comments?postId=xxx
router.get('/', async (req, res, next) => {
  try {
    const { postId, page = 1, limit = 20 } = req.query;

    if (!postId) return res.status(400).json({ error: 'postId is required' });

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { data, error } = await supabase
      .from('comments')
      .select('id, content, created_at, user:profiles(id, username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    res.json({ data: data || [] });
  } catch (err) {
    console.error('[Comments] GET / error:', err);
    next(err);
  }
});

// POST /api/v1/comments
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { post_id, content } = req.body;

    if (!post_id) return res.status(400).json({ error: 'post_id is required' });
    if (!content || !content.trim()) return res.status(400).json({ error: 'content is required' });

    const { data, error } = await supabase
      .from('comments')
      .insert([{ post_id, user_id: req.userId, content: content.trim() }])
      .select('id, content, created_at, user:profiles(id, username, avatar_url)')
      .single();

    if (error) throw error;

    res.status(201).json({ data });
  } catch (err) {
    console.error('[Comments] POST / error:', err);
    next(err);
  }
});

// DELETE /api/v1/comments/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId); // ensures users can only delete their own

    if (error) throw error;

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('[Comments] DELETE /:id error:', err);
    next(err);
  }
});

module.exports = router;