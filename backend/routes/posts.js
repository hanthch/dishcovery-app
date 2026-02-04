const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const supabase = require('../config/supabase');

router.post('/', authMiddleware, async (req, res) => {
  const { caption, images, restaurantId, newRestaurant, location } = req.body;

  let finalRestaurantId = restaurantId || null;

  // 1️⃣ Create new restaurant if needed
  if (newRestaurant) {
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .insert({
        name: newRestaurant.name,
        address: newRestaurant.address,
        google_place_id: newRestaurant.google_place_id || null,
        google_maps_url: newRestaurant.google_maps_url || null,
        lat: newRestaurant.lat || null,
        lng: newRestaurant.lng || null,
        food_types: newRestaurant.foodTypes || [],
        price_range: newRestaurant.priceRange || null,
        opening_hours: newRestaurant.openingHours || null,
        landmark_notes: newRestaurant.landmarkNotes || null,
        status: 'community',
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    finalRestaurantId = restaurant.id;
  }

  const { data: post, error: postErr } = await supabase
    .from('posts')
    .insert({
      user_id: req.user.id,
      caption: caption || null,
      images: images || null,
      restaurant_id: finalRestaurantId,
      location: location || null,
    })
    .select()
    .single();

  if (postErr) {
    return res.status(500).json({ error: postErr.message });
  }

  res.status(201).json({ data: post });
});


router.get('/trending', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      caption,
      images,
      created_at,
      location,
      user:users(id, username, avatar_url),
      restaurant:restaurants(
        id,
        name,
        address,
        google_maps_url,
        lat,
        lng,
        landmark_notes,
        food_types,
        price_range
      ),
      likes_count:post_likes(count),
      saves_count:post_saves(count),
      comments_count:post_comments(count)
    `)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return res.status(500).json({ error: 'Không tải được feed' });
  }

  res.json({ data, page: Number(page) });
});


router.post('/:postId/like', authMiddleware, async (req, res) => {
  const { postId } = req.params;

  const { error } = await supabase
    .from('post_likes')
    .upsert({
      post_id: postId,
      user_id: req.user.id,
    });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});


router.post('/:postId/save', authMiddleware, async (req, res) => {
  const { postId } = req.params;

  const { error } = await supabase
    .from('post_saves')
    .upsert({
      post_id: postId,
      user_id: req.user.id,
    });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

router.get('/:postId/comments', async (req, res) => {
  const { postId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error } = await supabase
    .from('post_comments')
    .select(`
      id,
      content,
      created_at,
      user:users(id, username, avatar_url)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .range(from, to);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ data, page: Number(page) });
});

router.post('/:postId/comments', authMiddleware, async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Nội dung không được trống' });
  }

  const { data, error } = await supabase
    .from('post_comments')
    .insert({
      post_id: postId,
      user_id: req.user.id,
      content: content.trim(),
    })
    .select(`
      id,
      content,
      created_at,
      user:users(id, username, avatar_url)
    `)
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ data });
});

router.get('/search', async (req, res) => {
  const {
    q,
    hashtag,
    sort = 'new',
    page = 1,
    limit = 10,
  } = req.query;

  const offset = (page - 1) * limit;

  let query = supabase
    .from('posts')
    .select(`
      *,
      user:users(id, username, avatar_url),
      restaurant:restaurants(*)
    `);

  if (q) {
    query = query.or(
      `caption.ilike.%${q}%,restaurant.name.ilike.%${q}%`
    );
  }

  if (hashtag) {
    query = query.contains('hashtags', [hashtag.toLowerCase()]);
  }

  // 🔁 SORTING
  if (sort === 'popular') {
    query = query.order('likes_count', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query.range(
    offset,
    offset + limit - 1
  );

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ data, page: Number(page) });
});

/* =========================
   SEARCH POSTS / RESTAURANTS
========================= */
router.get('/search', async (req, res) => {
  const {
    q,
    hashtag,
    sort = 'new',
    page = 1,
    limit = 10,
  } = req.query;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let queryBuilder = supabase
    .from('posts')
    .select(`
      id,
      caption,
      images,
      created_at,
      location,
      user:users(id, username, avatar_url),
      restaurant:restaurants(
        id,
        name,
        address,
        google_maps_url,
        food_types,
        price_range,
        landmark_notes
      ),
      likes_count:post_likes(count),
      comments_count:post_comments(count)
    `);

  // 🔍 TEXT SEARCH
  if (q) {
    queryBuilder = queryBuilder.ilike('caption', `%${q}%`);
  }

  // #️⃣ HASHTAG SEARCH
  if (hashtag) {
    queryBuilder = queryBuilder.ilike('caption', `%#${hashtag}%`);
  }

  // 🔥 SORT
  if (sort === 'popular') {
    queryBuilder = queryBuilder.order('likes_count', {
      ascending: false,
      foreignTable: 'post_likes',
    });
  } else {
    queryBuilder = queryBuilder.order('created_at', {
      ascending: false,
    });
  }

  const { data, error } = await queryBuilder.range(from, to);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({
    data,
    page: Number(page),
    hasMore: data.length === Number(limit),
  });
});

module.exports = router;
