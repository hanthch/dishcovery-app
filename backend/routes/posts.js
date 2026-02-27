const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { buildGoogleMapsUrl, ensureGoogleMapsUrl } = require('../config/googleMaps');

function normalizePost(p) {
  if (!p) return null;
  const imageUrl = (Array.isArray(p.images) ? p.images[0] : null) || null;
  return {
    id: p.id,
    caption: p.caption || null,
    image_url: imageUrl,        // PostCard reads p.image_url
    images: p.images || [],
    likes_count: p.likes_count || 0,
    comments_count: p.comments_count || 0,
    saves_count: p.saves_count || 0,
    is_trending: p.is_trending || false,
    created_at: p.created_at,
    updated_at: p.updated_at || null,
    user: p.user || { id: '', username: 'unknown', avatar_url: '' },
    restaurant: p.restaurant || null,
    is_liked: p.is_liked || false,
    is_saved: p.is_saved || false,
  };
}

function mapPriceRange(level) {
  const map = {
    1: 'Dưới 30k VND',
    2: '30k - 80k VND',
    3: '80k - 150k VND',
    4: 'Trên 150k VND',
  };
  return map[level] || map[1];
}

async function createRestaurantFromNewPlace(newRestaurant, userId) {
  const {
    name,
    address,
    openingHours,
    cuisine = [],   // food types array from modal
    price_range,    // integer 1-4
    landmark_notes, // text string
    lat,
    lng,
  } = newRestaurant;

  // Build google_maps_url from coordinates or name+address
  const googleMapsUrl = buildGoogleMapsUrl({ name, address, lat, lng });

  // Insert restaurant
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .insert({
      name: name.trim(),
      address: address?.trim() || null,
      latitude: lat || null,
      longitude: lng || null,
      google_maps_url: googleMapsUrl,
      food_types: Array.isArray(cuisine) && cuisine.length > 0 ? cuisine : [],
      opening_hours: openingHours?.trim() || null,
      price_range: price_range ? mapPriceRange(price_range) : null,
      verified: false,
      status: 'unverified',
      // No cover_image, rating, or rank — it's brand new
    })
    .select('id, name, address, cover_image, food_types, rating, google_maps_url')
    .single();

  if (restaurantError) {
    console.error('[Posts] Failed to insert new restaurant:', restaurantError);
    throw restaurantError;
  }

  console.log(`[Posts] New restaurant created: "${name}" → ${restaurant.id}`);

  // Insert landmark note if provided (great UX — community contributions work immediately)
  if (landmark_notes && landmark_notes.trim() && userId) {
    const { error: noteError } = await supabase
      .from('landmark_notes')
      .insert({
        restaurant_id: restaurant.id,
        user_id: userId,
        text: landmark_notes.trim(),
        helpful_count: 0,
        verified: false,
      });

    if (noteError) {
      // Non-fatal — landmark note failure should NOT block post creation
      console.error('[Posts] Failed to insert landmark note:', noteError);
    } else {
      console.log(`[Posts] 📍 Landmark note added for "${name}"`);
    }
  }

  return restaurant;
}

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = (page - 1) * limit;

    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, caption, images, likes_count, comments_count, saves_count,
        is_trending, created_at, updated_at,
        user:profiles(id, username, avatar_url),
        restaurant:restaurants(id, name, address, cover_image, food_types, rating, google_maps_url)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Batch-fetch liked/saved status for authenticated users
    let likedIds = new Set();
    let savedIds = new Set();
    if (req.userId && data && data.length > 0) {
      const postIds = data.map(p => p.id);
      const [likesRes, savesRes] = await Promise.all([
        supabase.from('likes').select('post_id').eq('user_id', req.userId).in('post_id', postIds),
        supabase.from('saved_posts').select('post_id').eq('user_id', req.userId).in('post_id', postIds),
      ]);
      likedIds = new Set((likesRes.data || []).map(l => l.post_id));
      savedIds = new Set((savesRes.data || []).map(s => s.post_id));
    }

    const posts = (data || []).map(p =>
      normalizePost({
        ...p,
        is_liked: likedIds.has(p.id),
        is_saved: savedIds.has(p.id),
      })
    );

    res.json({ data: posts, page, hasMore: posts.length === limit });
  } catch (error) {
    console.error('[Posts] GET / error:', error);
    next(error);
  }
});

router.get('/trending', optionalAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const filter = req.query.filter || 'all';
    const limit = 10;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('posts')
      .select(`
        id, caption, images, likes_count, comments_count, saves_count,
        is_trending, created_at, updated_at,
        user:profiles(id, username, avatar_url),
        restaurant:restaurants(id, name, address, cover_image, food_types, rating, google_maps_url)
      `);

    if (filter === 'popular') {
      query = query.order('likes_count', { ascending: false });
    } else if (filter === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else {
      // Default: trending-flagged first, then newest
      query = query
        .order('is_trending', { ascending: false })
        .order('created_at', { ascending: false });
    }

    const { data, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    // Batch-fetch liked/saved status for authenticated users
    let likedIds = new Set();
    let savedIds = new Set();
    if (req.userId && data && data.length > 0) {
      const postIds = data.map(p => p.id);
      const [likesRes, savesRes] = await Promise.all([
        supabase.from('likes').select('post_id').eq('user_id', req.userId).in('post_id', postIds),
        supabase.from('saved_posts').select('post_id').eq('user_id', req.userId).in('post_id', postIds),
      ]);
      likedIds = new Set((likesRes.data || []).map(l => l.post_id));
      savedIds = new Set((savesRes.data || []).map(s => s.post_id));
    }

    const posts = (data || []).map(p =>
      normalizePost({
        ...p,
        is_liked: likedIds.has(p.id),
        is_saved: savedIds.has(p.id),
      })
    );

    res.json({ data: posts, page, hasMore: posts.length === limit });
  } catch (error) {
    console.error('[Posts] GET /trending error:', error);
    next(error);
  }
});

router.get('/search', optionalAuth, async (req, res, next) => {
  try {
    const { q, hashtag, sort = 'new', page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 10, 50);
    const offset = (pageNum - 1) * limitNum;

    if ((!q || !q.trim()) && (!hashtag || !hashtag.trim())) {
      return res.json({ data: [], page: pageNum });
    }

    let query = supabase
      .from('posts')
      .select(`
        id, caption, images, likes_count, comments_count,
        saves_count, is_trending, created_at, updated_at,
        user:profiles(id, username, avatar_url),
        restaurant:restaurants(id, name, address, cover_image, food_types, google_maps_url)
      `);

    if (hashtag && hashtag.trim()) {
      const tag = hashtag.trim().replace(/^#/, '');
      query = query.ilike('caption', `%#${tag}%`);
    } else if (q && q.trim()) {
      query = query.ilike('caption', `%${q.trim()}%`);
    }

    if (sort === 'popular') {
      query = query.order('likes_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query.range(offset, offset + limitNum - 1);
    if (error) throw error;

    res.json({ data: (data || []).map(normalizePost), page: pageNum });
  } catch (error) {
    console.error('[Posts] GET /search error:', error);
    next(error);
  }
});

// ============================================================
// GET /posts/:id
// ============================================================
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, caption, images, likes_count, comments_count, saves_count,
        is_trending, created_at, updated_at,
        user:profiles(id, username, avatar_url, bio),
        restaurant:restaurants(id, name, address, cover_image, food_types, rating, google_maps_url)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Post not found' });
      }
      throw error;
    }

    let isLiked = false;
    let isSaved = false;
    if (req.userId) {
      const [likeRes, saveRes] = await Promise.all([
        supabase.from('likes').select('id').eq('post_id', id).eq('user_id', req.userId).maybeSingle(),
        supabase.from('saved_posts').select('id').eq('post_id', id).eq('user_id', req.userId).maybeSingle(),
      ]);
      isLiked = !!likeRes.data;
      isSaved = !!saveRes.data;
    }

    res.json({
      data: normalizePost({ ...data, is_liked: isLiked, is_saved: isSaved }),
    });
  } catch (error) {
    console.error('[Posts] GET /:id error:', error);
    next(error);
  }
});


router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { caption, images, restaurantId, newRestaurant, location } = req.body;

    if (!caption && (!images || images.length === 0)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Post must have a caption or at least one image',
      });
    }

    // ---- Resolve restaurant_id ----
    let resolvedRestaurantId = restaurantId || null;
    let createdRestaurant = null;

    if (newRestaurant && newRestaurant.isNew) {
      // User added a brand-new place via create-new-place-modal
      // → Create it in the DB first, then link the post to it
      createdRestaurant = await createRestaurantFromNewPlace(newRestaurant, req.userId);
      resolvedRestaurantId = createdRestaurant.id;
    } else if (location && !restaurantId) {
      // User tagged a raw location (from OSM) but chose NOT to add it to DB
      // Just log it — the post has no restaurant_id in this case
      console.log('[Posts] 📍 Location-only tag (not in DB):', JSON.stringify(location));
    }

    // ---- Insert post ----
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: req.userId,
        restaurant_id: resolvedRestaurantId,
        caption: caption?.trim() || '',
        images: Array.isArray(images) ? images : [],
      })
      .select(`
        id, caption, images, likes_count, comments_count, saves_count,
        is_trending, created_at, updated_at,
        user:profiles(id, username, avatar_url),
        restaurant:restaurants(id, name, address, cover_image, food_types, rating, google_maps_url)
      `)
      .single();

    if (error) throw error;

    // ---- Best-effort: update restaurant posts_count ----
    if (resolvedRestaurantId) {
      supabase
        .from('restaurants')
        .select('posts_count')
        .eq('id', resolvedRestaurantId)
        .single()
        .then(({ data: r }) => {
          if (r) {
            supabase
              .from('restaurants')
              .update({ posts_count: (r.posts_count || 0) + 1 })
              .eq('id', resolvedRestaurantId)
              .then(() => {})
              .catch(() => {});
          }
        })
        .catch(() => {});
    }

    res.status(201).json({ data: normalizePost(data) });
  } catch (error) {
    console.error('[Posts] POST / error:', error);
    next(error);
  }
});

// ============================================================
// POST /posts/:id/like
// ============================================================
router.post('/:id/like', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('likes')
      .upsert(
        { post_id: id, user_id: req.userId },
        { onConflict: 'post_id,user_id' }
      );
    if (error) throw error;

    const { data: post } = await supabase.from('posts').select('likes_count').eq('id', id).single();
    res.json({ liked: true, likes_count: post?.likes_count || 0 });
  } catch (error) {
    console.error('[Posts] POST /:id/like error:', error);
    next(error);
  }
});

// ============================================================
// DELETE /posts/:id/like
// ============================================================
router.delete('/:id/like', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('post_id', id)
      .eq('user_id', req.userId);
    if (error) throw error;

    const { data: post } = await supabase.from('posts').select('likes_count').eq('id', id).single();
    res.json({ liked: false, likes_count: post?.likes_count || 0 });
  } catch (error) {
    console.error('[Posts] DELETE /:id/like error:', error);
    next(error);
  }
});

// ============================================================
// POST /posts/:id/save
// ============================================================
router.post('/:id/save', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('saved_posts')
      .upsert(
        { post_id: id, user_id: req.userId },
        { onConflict: 'post_id,user_id' }
      );
    if (error) throw error;
    res.json({ saved: true });
  } catch (error) {
    console.error('[Posts] POST /:id/save error:', error);
    next(error);
  }
});

// ============================================================
// DELETE /posts/:id/save
// ============================================================
router.delete('/:id/save', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('saved_posts')
      .delete()
      .eq('post_id', id)
      .eq('user_id', req.userId);
    if (error) throw error;
    res.json({ saved: false });
  } catch (error) {
    console.error('[Posts] DELETE /:id/save error:', error);
    next(error);
  }
});

// ============================================================
// GET /posts/:id/comments
// ============================================================
router.get('/:id/comments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('comments')
      .select(`id, content, created_at, user:profiles(id, username, avatar_url)`)
      .eq('post_id', id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    console.error('[Posts] GET /:id/comments error:', error);
    next(error);
  }
});

// ============================================================
// POST /posts/:id/comments
// ============================================================
router.post('/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: id, user_id: req.userId, content: content.trim() })
      .select(`id, content, created_at, user:profiles(id, username, avatar_url)`)
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (error) {
    console.error('[Posts] POST /:id/comments error:', error);
    next(error);
  }
});

module.exports = router;
