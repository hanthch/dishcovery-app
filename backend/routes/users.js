const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { requireAuth, optionalAuth } = require('../middleware/auth');

function normalizePost(p) {
  if (!p) return null;
  const imageUrl = (Array.isArray(p.images) ? p.images[0] : null) || null;
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
// GET /users/suggested
// Returns up to 10 users the current user might want to follow:
//   - People followed by users you follow (FOAF)
//   - Excluding yourself and people you already follow
//   - Ordered by followers_count desc (most popular first)
// ============================================================
router.get('/suggested', requireAuth, async (req, res, next) => {
  try {
    // 1. Who do I follow?
    const { data: myFollowing } = await supabase
      .from('followers')
      .select('following_id')
      .eq('follower_id', req.userId);

    const myFollowingIds = (myFollowing || []).map(f => f.following_id);

    // 2. Who do THEY follow? (friends-of-friends)
    let fofIds = [];
    if (myFollowingIds.length > 0) {
      const { data: fof } = await supabase
        .from('followers')
        .select('following_id')
        .in('follower_id', myFollowingIds)
        .neq('following_id', req.userId);       // not myself

      fofIds = (fof || []).map(f => f.following_id);
    }

    // 3. Deduplicate, exclude already-followed and self
    const excludeIds = [req.userId, ...myFollowingIds];
    const candidateIds = [...new Set(fofIds)].filter(id => !excludeIds.includes(id));

    let users = [];
    if (candidateIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, followers_count, posts_count, bio')
        .in('id', candidateIds.slice(0, 30))    // cap DB query
        .eq('is_banned', false)
        .order('followers_count', { ascending: false })
        .limit(10);
      users = data || [];
    }

    // 4. Fallback: if < 5 suggestions, pad with popular users we don't follow yet
    if (users.length < 5) {
      const existingIds = [...excludeIds, ...users.map(u => u.id)];
      const { data: popular } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, followers_count, posts_count, bio')
        .not('id', 'in', `(${existingIds.join(',')})`)
        .eq('is_banned', false)
        .order('followers_count', { ascending: false })
        .limit(10 - users.length);
      users = [...users, ...(popular || [])];
    }

    res.json({ data: users });
  } catch (error) {
    console.error('[Users] GET /suggested error:', error);
    next(error);
  }
});

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

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio, role, is_banned, ban_reason, followers_count, following_count, posts_count, contributions, scout_points, badges, created_at')
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

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio, role, is_banned, followers_count, following_count, posts_count, contributions, scout_points, badges, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

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

router.get('/:id/posts', optionalAuth, async (req, res, next) => {
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

    // Batch-fetch liked/saved status for the requesting user
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

    res.json({ data: posts, page });
  } catch (error) {
    console.error('[Users] GET /:id/posts error:', error);
    next(error);
  }
});

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

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const { username, full_name, bio, avatar_url } = req.body;
    const updates = {};

    if (username !== undefined) {
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
        return res.status(400).json({ error: 'Username must be 3-30 chars, letters/numbers/underscores only' });
      }
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('username', username).neq('id', req.userId).maybeSingle();
      if (existing) return res.status(409).json({ error: 'Username already taken' });
      updates.username = username;
    }
    if (full_name !== undefined) updates.full_name = full_name;
    if (bio !== undefined) updates.bio = bio;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('profiles').update(updates).eq('id', req.userId).select().single();
    if (error) throw error;

    res.json({ data, message: 'Profile updated' });
  } catch (error) {
    console.error('[Users] PATCH /me error:', error);
    next(error);
  }
});

router.delete('/me', requireAuth, async (req, res, next) => {
  try {
    const { error } = await supabase.auth.admin.deleteUser(req.userId);
    if (error) throw error;
    res.json({ message: 'Account deleted' });
  } catch (error) {
    console.error('[Users] DELETE /me error:', error);
    next(error);
  }
});

router.post('/report', requireAuth, async (req, res, next) => {
  try {
    const { type, reason, post_id, target_user_id, restaurant_id } = req.body;

    if (!type || !reason) {
      return res.status(400).json({ error: 'type and reason are required' });
    }
    if (!['post', 'user', 'restaurant'].includes(type)) {
      return res.status(400).json({ error: 'type must be post, user, or restaurant' });
    }
    if (type === 'post' && !post_id) {
      return res.status(400).json({ error: 'post_id is required for post reports' });
    }
    if (type === 'user' && !target_user_id) {
      return res.status(400).json({ error: 'target_user_id is required for user reports' });
    }
    if (type === 'restaurant' && !restaurant_id) {
      return res.status(400).json({ error: 'restaurant_id is required for restaurant reports' });
    }
    // Can't report yourself
    if (target_user_id && target_user_id === req.userId) {
      return res.status(400).json({ error: 'Cannot report yourself' });
    }

    const dupeQuery = supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', req.userId)
      .eq('type', type)
      .eq('status', 'pending');

    if (post_id)         dupeQuery.eq('post_id', post_id);
    if (target_user_id)  dupeQuery.eq('target_user_id', target_user_id);
    if (restaurant_id)   dupeQuery.eq('restaurant_id', restaurant_id);

    const { data: existing } = await dupeQuery.maybeSingle();
    if (existing) {
      return res.status(409).json({ message: 'You have already reported this' });
    }

    const { data, error } = await supabase
      .from('reports')
      .insert({
        reporter_id:    req.userId,
        type,
        reason,
        post_id:        post_id        || null,
        target_user_id: target_user_id || null,
        restaurant_id:  restaurant_id  || null,
        status:         'pending',
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ data, message: 'Report submitted successfully' });
  } catch (error) {
    console.error('[Users] POST /report error:', error);
    next(error);
  }
});

module.exports = router;