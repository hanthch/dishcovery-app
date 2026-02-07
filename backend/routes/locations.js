const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/v1/locations/search
// This is now your primary endpoint for finding restaurants by address or name
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q) return res.json({ data: [] });

    // We search both the name and address so users can find spots easily
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .or(`name.ilike.%${q}%,address.ilike.%${q}%`) 
      .limit(limit);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;