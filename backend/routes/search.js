const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/v1/search - Universal Search with Contextual Filters
router.get('/', async (req, res) => {
  try {
    const { q, filter = 'newest' } = req.query; // Default to 'newest' for authenticity

    if (!q) return res.status(400).json({ error: 'Search query required' });

    // Determine sorting logic for the search filter
    let sortColumn = 'created_at';
    if (filter === 'popular') sortColumn = 'likes_count';

    // Search Posts (Authentic Local Content)
    const { data: posts } = await supabase
      .from('posts')
      .select('*, user:users(*), restaurant:restaurants(*)')
      .ilike('caption', `%${q}%`)
      .order(sortColumn, { ascending: false })
      .limit(15);

    // Search Restaurants (The actual Gems)
    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('*')
      .or(`name.ilike.%${q}%,address.ilike.%${q}%,landmark_notes.ilike.%${q}%`)
      .limit(10);

    // Format for unified mobile search results
    const formattedResults = [
      ...(posts || []).map(p => ({
        type: 'post',
        id: p.id,
        title: p.caption,
        subtitle: `📍 ${p.restaurant?.name || 'Local Spot'}`,
        image: p.image_url,
        data: p
      })),
      ...(restaurants || []).map(r => ({
        type: 'restaurant',
        id: r.id,
        title: r.name,
        subtitle: r.address,
        image: r.cover_image,
        landmark: r.landmark_notes,
        data: r
      }))
    ];

    res.json({ data: formattedResults });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;