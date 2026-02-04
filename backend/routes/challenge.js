const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const supabase = require('../config/supabase');

// GET /api/v1/challenges - Get all challenges
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*, participants:challenge_participants(count)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/challenges/:challengeId - Get challenge detail
router.get('/:challengeId', async (req, res) => {
  try {
    const { challengeId } = req.params;

    const { data, error } = await supabase
      .from('challenges')
      .select('*, participants:challenge_participants(*, users(*))')
      .eq('id', challengeId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Challenge not found' });

    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/challenges/:challengeId/join - Join challenge
router.post('/:challengeId/join', authMiddleware, async (req, res) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('challenge_participants')
      .insert([{ challenge_id: challengeId, user_id: userId }])
      .select();

    if (error) throw error;

    res.json({ data, message: 'Joined challenge successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/challenges/:challengeId/leave - Leave challenge
router.post('/:challengeId/leave', authMiddleware, async (req, res) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user.id;

    const { error } = await supabase
      .from('challenge_participants')
      .delete()
      .eq('challenge_id', challengeId)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ message: 'Left challenge successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;