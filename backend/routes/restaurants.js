const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const supabase = require('../config/supabase');

/* ======================================================
   RESTAURANTS HOME (IMDb-style directory)
   Used by: Restaurants index page
====================================================== */
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      id,
      name,
      address,
      food_types,
      categories,
      price_range,
      google_maps_url
    `)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

/* ======================================================
   CATEGORY BROWSING
   Used by: category.tsx
====================================================== */
router.get('/category/:slug', async (req, res) => {
  const { slug } = req.params;

  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      id,
      name,
      address,
      food_types,
      categories,
      price_range,
      google_maps_url
    `)
    .contains('categories', [slug])
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

/* ======================================================
   TOP 10 RESTAURANTS (REAL USER SIGNALS)
   Used by: top10.tsx
====================================================== */
router.get('/top10', async (req, res) => {
  /**
   * Ranking logic:
   * - posts_count: number of posts mentioning this restaurant
   * - comments_count: discussion depth
   * - saves_count: intent
   */
  const { data, error } = await supabase.rpc('get_top_restaurants', {
    limit_count: 10,
  });

  if (error) return res.status(500).json({ error: error.message });

  const ranked = data.map((r, index) => ({
    ...r,
    rank: index + 1,
  }));

  res.json({ data: ranked });
});

/* ======================================================
   RESTAURANT DETAIL
   Used by: restaurant-detail.tsx
====================================================== */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      id,
      name,
      address,
      food_types,
      categories,
      price_range,
      opening_hours,
      landmark_notes,
      google_maps_url,
      lat,
      lng,
      created_at
    `)
    .eq('id', id)
    .single();

  if (error) return res.status(404).json({ error: 'Restaurant not found' });
  res.json({ data });
});

/* ======================================================
   RESTAURANT SEARCH (Directory search)
   Used by: search.tsx
====================================================== */
router.get('/search', async (req, res) => {
  const { q } = req.query;

  if (!q || !q.trim()) return res.json({ data: [] });

  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      id,
      name,
      address,
      food_types,
      price_range,
      google_maps_url
    `)
    .or(`name.ilike.%${q}%,address.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});


router.post('/:restaurantId/save', authMiddleware, async (req, res) => {
  const { restaurantId } = req.params;

  const { error } = await supabase
    .from('saved_restaurants')
    .upsert({
      restaurant_id: restaurantId,
      user_id: req.user.id,
    });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

router.post('/:restaurantId/unsave', authMiddleware, async (req, res) => {
  const { restaurantId } = req.params;

  const { error } = await supabase
    .from('saved_restaurants')
    .delete()
    .match({
      restaurant_id: restaurantId,
      user_id: req.user.id,
    });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});


router.get('/:restaurantId/landmark-notes', async (req, res) => {
  const { restaurantId } = req.params;

  const { data, error } = await supabase
    .from('landmark_notes')
    .select(`
      id,
      content,
      created_at,
      user:users(username, avatar_url)
    `)
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

module.exports = router;
