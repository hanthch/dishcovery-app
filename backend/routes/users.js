const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { requireAuth, optionalAuth } = require('../middleware/auth');

function normalizePost(p) {
  if (!p) return null;
  const imageUrl = (Array.isArray(p.images) ? p.images[0] : null) || null;

  // Normalize nested restaurant — resolve single image URL so all consumers
  // (PostCard, user-profile grid) use image_url without any fallback chain.
  // cover_image = TEXT (single URL), photos = TEXT[] (array of URLs).
  // Both are full Supabase Storage public URLs.
  let restaurant = null;
  if (p.restaurant) {
    const r = p.restaurant;
    const coverImage = r.cover_image || null;
    const photos = Array.isArray(r.photos) ? r.photos : [];
    restaurant = {
      id:              r.id,
      name:            r.name,
      address:         r.address         || null,
      cover_image:     coverImage,
      photos:          photos,
      image_url:       coverImage || photos[0] || null, // single resolved URL for UI
      images:          photos,
      food_types:      r.food_types      || [],
      rating:          r.rating          ?? null,
      google_maps_url: r.google_maps_url || null,
    };
  }

  return {
    id:             p.id,
    caption:        p.caption        || null,
    image_url:      imageUrl,
    images:         p.images         || [],
    likes_count:    p.likes_count    || 0,
    comments_count: p.comments_count || 0,
    saves_count:    p.saves_count    || 0,
    is_trending:    p.is_trending    || false,
    created_at:     p.created_at,
    updated_at:     p.updated_at     || null,
    user:           p.user           || { id: '', username: 'unknown', avatar_url: '' },
    restaurant,
    is_liked:       p.is_liked       || false,
    is_saved:       p.is_saved       || false,
  };
}

// ============================================================
// GET /users/me/saved-restaurants
// ============================================================
router.get('/me/saved-restaurants', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('saved_restaurants')
      .select(`
        restaurant:restaurants(
          id, name, address, cover_image, photos, food_types,
          rating, rating_count, price_range, verified, status,
          latitude, longitude, google_maps_url,
          opening_hours, top_rank_this_week, posts_count
        )
      `)
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const restaurants = (data || [])
      .map(r => r.restaurant)
      .filter(Boolean)
      .map(r => {
        // cover_image = TEXT, photos = TEXT[] — both full Supabase Storage public URLs
        const coverImage = r.cover_image || null;
        const photos = Array.isArray(r.photos) ? r.photos : [];
        return {
          id:              r.id,
          name:            r.name,
          address:         r.address          || null,
          cover_image:     coverImage,
          photos:          photos,
          image_url:       coverImage || photos[0] || null, // single resolved URL for UI
          images:          photos,
          food_types:      r.food_types        || [],
          rating:          r.rating            ?? null,
          rating_count:    r.rating_count      ?? 0,
          price_range:     r.price_range       || null,
          verified:        r.verified          || false,
          status:          r.status            || 'unverified',
          latitude:        r.latitude          ?? null,
          longitude:       r.longitude         ?? null,
          google_maps_url: r.google_maps_url   || null,
          opening_hours:   r.opening_hours     || null,
          top_rank_this_week: r.top_rank_this_week ?? null,
          posts_count:     r.posts_count       ?? 0,
          is_saved:        true,
        };
      });

    res.json({ data: restaurants });
  } catch (error) {
    console.error('[Users] GET /me/saved-restaurants error:', error);
    next(error);
  }
});

// ============================================================
// GET /users/me/saved-posts
// ============================================================
router.get('/me/saved-posts', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('saved_posts')
      .select(`
        post:posts(
          id, caption, images, likes_count, comments_count,
          saves_count, is_trending, created_at, updated_at,
          user:profiles(id, username, avatar_url),
          restaurant:restaurants(id, name, address, cover_image, photos, food_types, rating, google_maps_url)
        )
      `)
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const posts = (data || [])
      .map(r => r.post)
      .filter(Boolean)
      .map(p => normalizePost({ ...p, is_saved: true }));

    res.json({ data: posts });
  } catch (error) {
    console.error('[Users] GET /me/saved-posts error:', error);
    next(error);
  }
});

// ============================================================
// GET /users/me
// ============================================================
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio, followers_count, following_count, posts_count, contributions, scout_points, badges, created_at')
      .eq('id', req.userId)
      .maybeSingle();

    if (error) throw error;
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    res.json({ data: { ...profile, is_own_profile: true, is_following: false } });
  } catch (error) {
    console.error('[Users] GET /me error:', error);
    next(error);
  }
});

// ============================================================
// GET /users/:id
// ============================================================
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio, followers_count, following_count, posts_count, contributions, scout_points, badges, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check follow relationship
    let isFollowing = false;
    if (req.userId && req.userId !== id) {
      const { data: followData } = await supabase
        .from('followers')
        .select('id')
        .eq('follower_id', req.userId)
        .eq('following_id', id)
        .maybeSingle();
      isFollowing = !!followData;
    }

    res.json({
      data: {
        ...profile,
        is_following: isFollowing,
        is_own_profile: req.userId === id,
      },
    });
  } catch (error) {
    console.error('[Users] GET /:id error:', error);
    next(error);
  }
});

// ============================================================
// GET /users/:id/posts
// ============================================================
router.get('/:id/posts', async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const offset = (page - 1) * limit;

    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, caption, images, likes_count, comments_count,
        saves_count, is_trending, created_at, updated_at,
        user:profiles(id, username, avatar_url),
        restaurant:restaurants(id, name, address, cover_image, photos, food_types, rating, google_maps_url)
      `)
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // BUG FIX #5: normalise posts so image_url is set from images[0]
    const posts = (data || []).map(normalizePost);

    res.json({ data: posts, page });
  } catch (error) {
    console.error('[Users] GET /:id/posts error:', error);
    next(error);
  }
});

// ============================================================
// POST /users/:id/follow
// ============================================================
router.post('/:id/follow', requireAuth, async (req, res, next) => {
  try {
    const { id: targetId } = req.params;

    if (targetId === req.userId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const { error } = await supabase
      .from('followers')
      .upsert(
        { follower_id: req.userId, following_id: targetId },
        { onConflict: 'follower_id,following_id' }
      );

    if (error) throw error;

    res.json({ following: true });
  } catch (error) {
    console.error('[Users] POST /:id/follow error:', error);
    next(error);
  }
});

// ============================================================
// POST /users/:id/unfollow
// ============================================================
router.post('/:id/unfollow', requireAuth, async (req, res, next) => {
  try {
    const { id: targetId } = req.params;

    const { error } = await supabase
      .from('followers')
      .delete()
      .eq('follower_id', req.userId)
      .eq('following_id', targetId);

    if (error) throw error;

    res.json({ following: false });
  } catch (error) {
    console.error('[Users] POST /:id/unfollow error:', error);
    next(error);
  }
});

// ============================================================
// GET /users/:id/followers
// ============================================================
router.get('/:id/followers', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const { data, error } = await supabase
      .from('followers')
      .select('follower:profiles!follower_id(id, username, full_name, avatar_url, followers_count, posts_count)')
      .eq('following_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const followers = (data || [])
      .map(r => r.follower)
      .filter(Boolean);

    res.json({ data: followers, page });
  } catch (error) {
    console.error('[Users] GET /:id/followers error:', error);
    next(error);
  }
});

// ============================================================
// GET /users/:id/following
// ============================================================
router.get('/:id/following', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const { data, error } = await supabase
      .from('followers')
      .select('following:profiles!following_id(id, username, full_name, avatar_url, followers_count, posts_count)')
      .eq('follower_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const following = (data || [])
      .map(r => r.following)
      .filter(Boolean);

    res.json({ data: following, page });
  } catch (error) {
    console.error('[Users] GET /:id/following error:', error);
    next(error);
  }
});

module.exports = router;
