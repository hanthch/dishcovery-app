const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/v1/comments - typically accessed via /posts/:id/comments
router.get('/', async (req, res) => {
  try {
    const { postId, page = 1, limit = 20 } = req.query;

    if (!postId) return res.status(400).json({ error: 'postId is required' });

    const offset = (page - 1) * limit;

    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/comments
router.post('/', async (req, res) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) return res.status(401).json({ error: 'No token provided' });

    const { data: user, error: authError } = await supabase.auth.getUser(token);

    if (authError) return res.status(401).json({ error: authError.message });

    const { post_id, content } = req.body;

    const { data, error } = await supabase
      .from('comments')
      .insert([
        {
          post_id,
          user_id: user.user.id,
          content,
        },
      ])
      .select();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ data: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/comments/:id
router.delete('/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) return res.status(401).json({ error: 'No token provided' });

    const { data: user, error: authError } = await supabase.auth.getUser(token);

    if (authError) return res.status(401).json({ error: authError.message });

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', user.user.id);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
