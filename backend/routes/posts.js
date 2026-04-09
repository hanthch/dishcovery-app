const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { buildGoogleMapsUrl, ensureGoogleMapsUrl } = require('../config/googleMaps');

function normalizePost(p) {
  if (!p) return null;
  const imageUrl = (Array.isArray(p.images) ? p.images[0] : null) || null;

  let restaurant = null;
  if (p.restaurant) {
    const r          = p.restaurant;
    const coverImage = r.cover_image || null;
    const photos     = Array.isArray(r.photos) ? r.photos : [];
    restaurant = {
      id:              r.id,
      name:            r.name,
      address:         r.address         || null,
      cover_image:     coverImage,
      photos:          photos,
      image_url:       coverImage || photos[0] || null,
      images:          photos,
      food_types:      r.food_types      || [],
      rating:          r.rating          ?? null,
      // FIX: always populate google_maps_url — the DB trigger auto-generates
      // this from lat/lng or name+address, so it should never be null in
      // practice. The frontend guards against null regardless.
      google_maps_url: r.google_maps_url || null,
    };
  }

  // FIX: Normalise is_following to the string literal 'true' or 'false'
  // regardless of whether the caller passed a real boolean (e.g. from the
  // GET /:id route) or a string (e.g. from the batch followingIds.has() path).
  // The Post TypeScript type declares `is_following?: string` and PostCard
  // reads it with `post.is_following === 'true'`, so the contract is:
  //   truthy value  → 'true'
  //   falsy value   → 'false'
  const rawFollowing = p.is_following;
  const isFollowingStr =
    rawFollowing === true || rawFollowing === 'true' ? 'true' : 'false';

  return {
    id:             p.id,
    caption:        p.caption        || null,
    image_url:      imageUrl,        // PostCard reads p.image_url
    images:         p.images         || [],
    likes_count:    p.likes_count    || 0,
    comments_count: p.comments_count || 0,
    saves_count:    p.saves_count    || 0,
    is_trending:    p.is_trending    || false,
    is_flagged:     p.is_flagged     || false,
    flag_reason:    p.flag_reason    || null,
    created_at:     p.created_at,
    updated_at:     p.updated_at     || null,
    // full_name is forwarded from the profiles join so LikesModal and
    // CommentsModal can show display names without a separate request.
    user:           p.user           || { id: '', username: 'unknown', avatar_url: null, full_name: null },
    restaurant,
    is_liked:       p.is_liked       || false,
    is_saved:       p.is_saved       || false,
    is_following:   isFollowingStr,
  };
}

// ── mapPriceRange ─────────────────────────────────────────────────────────────
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
      name:            name.trim(),
      address:         address?.trim() || null,
      latitude:        lat || null,
      longitude:       lng || null,
      google_maps_url: googleMapsUrl,
      food_types:      Array.isArray(cuisine) && cuisine.length > 0 ? cuisine : [],
      opening_hours:   openingHours?.trim() || null,
      price_range:     price_range ? mapPriceRange(price_range) : null,
      verified:        false,
      status:          'unverified',
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
        user_id:       userId,
        text:          landmark_notes.trim(),
        helpful_count: 0,
        verified:      false,
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
    const page   = parseInt(req.query.page) || 1;
    const limit  = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = (page - 1) * limit;

    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, caption, images, likes_count, comments_count, saves_count,
        is_trending, created_at, updated_at,
        user:profiles(id, username, full_name, avatar_url),
        restaurant:restaurants(id, name, address, cover_image, photos, food_types, rating, google_maps_url)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Batch-fetch liked/saved/following status for authenticated users
    let likedIds     = new Set();
    let savedIds     = new Set();
    let followingIds = new Set();
    if (req.userId && data && data.length > 0) {
      const postIds   = data.map(p => p.id);
      const authorIds = [...new Set(data.map(p => p.user?.id).filter(Boolean))];
      const [likesRes, savesRes, followsRes] = await Promise.all([
        supabase.from('likes').select('post_id').eq('user_id', req.userId).in('post_id', postIds),
        supabase.from('saved_posts').select('post_id').eq('user_id', req.userId).in('post_id', postIds),
        authorIds.length > 0
          ? supabase.from('followers').select('following_id').eq('follower_id', req.userId).in('following_id', authorIds)
          : Promise.resolve({ data: [] }),
      ]);
      likedIds     = new Set((likesRes.data   || []).map(l => l.post_id));
      savedIds     = new Set((savesRes.data   || []).map(s => s.post_id));
      followingIds = new Set((followsRes.data || []).map(f => f.following_id));
    }

    const posts = (data || []).map(p =>
      normalizePost({
        ...p,
        is_liked:     likedIds.has(p.id),
        is_saved:     savedIds.has(p.id),
        is_following: followingIds.has(p.user?.id) ? 'true' : 'false',
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
    const page   = parseInt(req.query.page) || 1;
    const filter = req.query.filter || 'all';
    const limit  = 10;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('posts')
      .select(`
        id, caption, images, likes_count, comments_count, saves_count,
        is_trending, created_at, updated_at,
        user:profiles(id, username, full_name, avatar_url),
        restaurant:restaurants(id, name, address, cover_image, photos, food_types, rating, google_maps_url)
      `);

    if (filter === 'popular') {
      query = query.order('likes_count', { ascending: false });
    } else if (filter === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else {
      // Default: trending-flagged first, then newest
      query = query
        .order('is_trending', { ascending: false })
        .order('created_at',  { ascending: false });
    }

    const { data, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    // Batch-fetch liked/saved/following status for authenticated users
    let likedIds     = new Set();
    let savedIds     = new Set();
    let followingIds = new Set();
    if (req.userId && data && data.length > 0) {
      const postIds   = data.map(p => p.id);
      const authorIds = [...new Set(data.map(p => p.user?.id).filter(Boolean))];
      const [likesRes, savesRes, followsRes] = await Promise.all([
        supabase.from('likes').select('post_id').eq('user_id', req.userId).in('post_id', postIds),
        supabase.from('saved_posts').select('post_id').eq('user_id', req.userId).in('post_id', postIds),
        authorIds.length > 0
          ? supabase.from('followers').select('following_id').eq('follower_id', req.userId).in('following_id', authorIds)
          : Promise.resolve({ data: [] }),
      ]);
      likedIds     = new Set((likesRes.data   || []).map(l => l.post_id));
      savedIds     = new Set((savesRes.data   || []).map(s => s.post_id));
      followingIds = new Set((followsRes.data || []).map(f => f.following_id));
    }

    const posts = (data || []).map(p =>
      normalizePost({
        ...p,
        is_liked:     likedIds.has(p.id),
        is_saved:     savedIds.has(p.id),
        is_following: followingIds.has(p.user?.id) ? 'true' : 'false',
      })
    );

    res.json({ data: posts, page, hasMore: posts.length === limit });
  } catch (error) {
    console.error('[Posts] GET /trending error:', error);
    next(error);
  }
});

// ============================================================
// GET /posts/search
// ============================================================
router.get('/search', optionalAuth, async (req, res, next) => {
  try {
    const { q, hashtag, sort = 'new', page = 1, limit = 10 } = req.query;
    const pageNum  = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 10, 50);
    const offset   = (pageNum - 1) * limitNum;

    if ((!q || !q.trim()) && (!hashtag || !hashtag.trim())) {
      return res.json({ data: [], page: pageNum });
    }

    let query = supabase
      .from('posts')
      .select(`
        id, caption, images, likes_count, comments_count,
        saves_count, is_trending, created_at, updated_at,
        user:profiles(id, username, full_name, avatar_url),
        restaurant:restaurants(id, name, address, cover_image, photos, food_types, rating, google_maps_url)
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

    // FIX: Batch-fetch liked/saved/following status for authenticated users —
    // same pattern as GET /trending and GET /. Without this, every search result
    // always shows is_liked=false, is_saved=false, is_following=false.
    let likedIds     = new Set();
    let savedIds     = new Set();
    let followingIds = new Set();
    if (req.userId && data && data.length > 0) {
      const postIds   = data.map(p => p.id);
      const authorIds = [...new Set(data.map(p => p.user?.id).filter(Boolean))];
      const [likesRes, savesRes, followsRes] = await Promise.all([
        supabase.from('likes').select('post_id').eq('user_id', req.userId).in('post_id', postIds),
        supabase.from('saved_posts').select('post_id').eq('user_id', req.userId).in('post_id', postIds),
        authorIds.length > 0
          ? supabase.from('followers').select('following_id').eq('follower_id', req.userId).in('following_id', authorIds)
          : Promise.resolve({ data: [] }),
      ]);
      likedIds     = new Set((likesRes.data   || []).map(l => l.post_id));
      savedIds     = new Set((savesRes.data   || []).map(s => s.post_id));
      followingIds = new Set((followsRes.data || []).map(f => f.following_id));
    }

    const posts = (data || []).map(p =>
      normalizePost({
        ...p,
        is_liked:     likedIds.has(p.id),
        is_saved:     savedIds.has(p.id),
        is_following: followingIds.has(p.user?.id) ? 'true' : 'false',
      })
    );

    res.json({ data: posts, page: pageNum, hasMore: posts.length === limitNum });
  } catch (error) {
    console.error('[Posts] GET /search error:', error);
    next(error);
  }
});

// ============================================================
// GET /posts/:id  — single post detail
// ============================================================
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, caption, images, likes_count, comments_count, saves_count,
        is_trending, created_at, updated_at,
        user:profiles(id, username, full_name, avatar_url, bio),
        restaurant:restaurants(id, name, address, cover_image, photos, food_types, rating, google_maps_url)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Post not found' });
      }
      throw error;
    }

    let isLiked     = false;
    let isSaved     = false;
    let isFollowing = false;
    if (req.userId) {
      const [likeRes, saveRes, followRes] = await Promise.all([
        supabase.from('likes').select('id').eq('post_id', id).eq('user_id', req.userId).maybeSingle(),
        supabase.from('saved_posts').select('id').eq('post_id', id).eq('user_id', req.userId).maybeSingle(),
        data?.user?.id
          ? supabase.from('followers').select('id').eq('follower_id', req.userId).eq('following_id', data.user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      isLiked     = !!likeRes.data;
      isSaved     = !!saveRes.data;
      isFollowing = !!followRes.data;
    }

    res.json({
      data: normalizePost({ ...data, is_liked: isLiked, is_saved: isSaved, is_following: isFollowing ? 'true' : 'false' }),
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
        error:   'Validation Error',
        message: 'Post must have a caption or at least one image',
      });
    }

    // ---- Resolve restaurant_id ----
    let resolvedRestaurantId = restaurantId || null;
    let createdRestaurant    = null;

    if (newRestaurant && newRestaurant.isNew) {
      createdRestaurant    = await createRestaurantFromNewPlace(newRestaurant, req.userId);
      resolvedRestaurantId = createdRestaurant.id;
    } else if (location && !restaurantId) {
      console.log('[Posts] 📍 Location-only tag (not in DB):', JSON.stringify(location));
    }

    // ---- Insert post ----
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id:       req.userId,
        restaurant_id: resolvedRestaurantId,
        caption:       caption?.trim() || '',
        images:        Array.isArray(images) ? images : [],
      })
      .select(`
        id, caption, images, likes_count, comments_count, saves_count,
        is_trending, created_at, updated_at,
        user:profiles(id, username, full_name, avatar_url),
        restaurant:restaurants(id, name, address, cover_image, photos, food_types, rating, google_maps_url)
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
// POST /posts/:id/like  — like a post (idempotent upsert)
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
// DELETE /posts/:id/like  — unlike a post
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

router.get('/:id/likes', optionalAuth, async (req, res, next) => {
  try {
    const { id }  = req.params;
    const page    = parseInt(req.query.page) || 1;
    const limit   = 20;
    const offset  = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('likes')
      .select(
        'user:profiles(id, username, full_name, avatar_url, followers_count)',
        { count: 'exact' }
      )
      .eq('post_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const users = (data || []).map(r => r.user).filter(Boolean);

    res.json({
      data:    users,
      page,
      hasMore: offset + users.length < (count || 0),
      total:   count || 0,
    });
  } catch (error) {
    console.error('[Posts] GET /:id/likes error:', error);
    next(error);
  }
});

// ============================================================
// POST /posts/:id/save  — save a post (idempotent upsert)
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
// DELETE /posts/:id/save  — unsave a post
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
// GET /posts/:id/comments  — fetch all comments for a post
// ============================================================
router.get('/:id/comments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('comments')
      // FIX: added full_name so CommentsModal can show display names
      .select('id, content, created_at, user:profiles(id, username, full_name, avatar_url)')
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
// POST /posts/:id/comments  — add a comment to a post
// ============================================================
router.post('/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const { id }      = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: id, user_id: req.userId, content: content.trim() })
      .select('id, content, created_at, user:profiles(id, username, full_name, avatar_url)')
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (error) {
    console.error('[Posts] POST /:id/comments error:', error);
    next(error);
  }
});

module.exports = router;