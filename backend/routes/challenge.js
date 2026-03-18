const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/v1/challenges
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/challenges/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ error: 'Challenge not found' });

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/challenges/:id/join
router.post('/:id/join', async (req, res) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) return res.status(401).json({ error: 'No token provided' });

    const { data: user, error: authError } = await supabase.auth.getUser(token);

    if (authError) return res.status(401).json({ error: authError.message });

    const { data, error } = await supabase
      .from('challenge_participants')
      .insert([
        {
          challenge_id: req.params.id,
          user_id: user.user.id,
        },
      ]);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'Joined challenge' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/challenges/:id/leave
router.post('/:id/leave', async (req, res) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) return res.status(401).json({ error: 'No token provided' });

    const { data: user, error: authError } = await supabase.auth.getUser(token);

    if (authError) return res.status(401).json({ error: authError.message });

    const { error } = await supabase
      .from('challenge_participants')
      .delete()
      .eq('challenge_id', req.params.id)
      .eq('user_id', user.user.id);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'Left challenge' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
