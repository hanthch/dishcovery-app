const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { normalizeRestaurantImages } = require('../config/cloudinary');
const { ensureGoogleMapsUrl } = require('../config/googleMaps');

const FOOD_TYPE_SLUG_MAP = {
  'mon-viet':  'Món Việt',
  'mon-thai':  'Món Thái',
  'mon-han':   'Món Hàn',
  'mon-au-my': 'Món Âu-Mỹ',
  'mon-nhat':  'Món Nhật',
  'mon-trung': 'Món Trung',
  'mon-an':    'Món Ấn',
  'khac':      'Khác',
  'bun-pho':     'Bún & Phở',
  'com-chien':   'Cơm & Cháo',
  'banh-mi':     'Bánh mì',
  'lau-nuong':   'Lẩu & Nướng',
  'hai-san':     'Hải sản',
  'an-vat':      'Ăn vặt',
  'trang-mieng': 'Tráng miệng',
  'chay':        'Món chay',
  'cafe':    'Café',
  'do-uong': 'Đồ uống',
  'tra-sua': 'Trà sữa',
  'nuoc-ep': 'Nước ép',
  'sinh-to': 'Sinh tố',
};

const PRICE_SLUG_MAP = {
  'under-30k':  'Dưới 30k VND',
  '30k-50k':    '30k - 80k VND',
  '30k-80k':    '30k - 80k VND',
  '50k-100k':   '80k - 150k VND',
  '80k-150k':   '80k - 150k VND',
  'over-100k':  'Trên 150k VND',
  'over-150k':  'Trên 150k VND',
  'binh-dan':   'Dưới 30k VND',
  'gia-hop-ly': '30k - 80k VND',
  'tam-trung':  '80k - 150k VND',
  'cao-cap':    'Trên 150k VND',
};

function normalizeRestaurant(r) {
  if (!r) return null;

  const landmarkNotes =
    r.landmark_notes_data && r.landmark_notes_data.length > 0
      ? r.landmark_notes_data
      : null;

  const restaurant = {
    id: r.id,
    name: r.name,

    // Location
    address:         r.address || null,
    latitude:        r.latitude  ? parseFloat(r.latitude)  : null,
    longitude:       r.longitude ? parseFloat(r.longitude) : null,
    google_maps_url: r.google_maps_url || null,

    food_types: r.food_types || [],
    cuisine:    r.food_types || [],
    categories: r.food_types || [],
    cover_image: r.cover_image || null,
    image_url:   r.cover_image || null,
    photos:      r.photos || [],
    images:      r.photos || [],
    has_images:  !!(r.cover_image || (r.photos && r.photos.length > 0)),
    rating:       r.rating       ? parseFloat(r.rating) : null,
    rating_count: r.rating_count || 0,
    price_range: r.price_range || null,
    priceRange:  r.price_range || null,
    verified: r.verified || false,
    status:   r.status   || 'unverified',
    opening_hours: r.opening_hours || null,
    landmark_notes: landmarkNotes,
    landmarkNotes:  landmarkNotes,
    top_rank_this_week: r.top_rank_this_week || null,
    topRankThisWeek:    r.top_rank_this_week || null,
    rank:               r.top_rank_this_week || null,
    weekly_activity:    r.weekly_activity    || 0,
    posts_count:        r.posts_count        || 0,
    created_at:  r.created_at,
    is_saved:    r.is_saved    || false,
    top_reviews: r.top_reviews || [],
  };

  return ensureGoogleMapsUrl(restaurant);
}

const RESTAURANT_SELECT = `
  *,
  landmark_notes_data:landmark_notes(id, text, helpful_count, verified)
`;

async function attachSavedStatus(restaurants, userId) {
  if (!userId || !restaurants.length) return restaurants;

  const ids = restaurants.map(r => r.id);
  const { data: savedRows } = await supabase
    .from('saved_restaurants')
    .select('restaurant_id')
    .eq('user_id', userId)
    .in('restaurant_id', ids);

  const savedSet = new Set((savedRows || []).map(s => s.restaurant_id));
  return restaurants.map(r => ({ ...r, is_saved: savedSet.has(r.id) }));
}

router.get('/top-rated', optionalAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select(RESTAURANT_SELECT)
      .not('top_rank_this_week', 'is', null)
      .order('top_rank_this_week', { ascending: true })
      .limit(10);

    if (error) throw error;

    let restaurants = (data || []).map(normalizeRestaurant);
    restaurants = await attachSavedStatus(restaurants, req.userId);

    res.json({ data: restaurants });
  } catch (error) {
    console.error('[Restaurants] GET /top-rated error:', error);
    next(error);
  }
});

router.get('/search', optionalAuth, async (req, res, next) => {
  try {
    const { q, type, price, rating, page = 1, limit = 20 } = req.query;

    const pageNum  = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(parseInt(limit) || 20, 50);
    const offset   = (pageNum - 1) * limitNum;

    let query = supabase
      .from('restaurants')
      .select(RESTAURANT_SELECT, { count: 'exact' });
    if (q && q.trim()) {
      query = query.ilike('name', `%${q.trim()}%`);
    }
    if (type) {
      const rawTypes = type.split(',').map(t => t.trim()).filter(Boolean);
      const dbTypes  = rawTypes.map(t => FOOD_TYPE_SLUG_MAP[t] || t);
      if (dbTypes.length === 1) {
        query = query.contains('food_types', [dbTypes[0]]);
      } else {
        query = query.overlaps('food_types', dbTypes);
      }
    }
    if (price) {
      const rawPrices = price.split(',').map(p => p.trim()).filter(Boolean);
      const dbPrices  = rawPrices.map(p => PRICE_SLUG_MAP[p] || p);
      if (dbPrices.length === 1) {
        query = query.ilike('price_range', `%${dbPrices[0]}%`);
      } else {
        query = query.or(dbPrices.map(p => `price_range.ilike.%${p}%`).join(','));
      }
    }
    if (rating) {
      const minRating = parseFloat(rating);
      if (!isNaN(minRating)) query = query.gte('rating', minRating);
    }

    const { data, error, count } = await query
      .order('rating', { ascending: false })
      .order('rating_count', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) throw error;
    let restaurants = (data || []).map(normalizeRestaurant);
    restaurants = await attachSavedStatus(restaurants, req.userId);

    res.json({
      data: restaurants,
      page: pageNum,
      limit: limitNum,
      total: count ?? restaurants.length,
      hasMore: restaurants.length === limitNum,
    });
  } catch (error) {
    console.error('[Restaurants] GET /search error:', error);
    next(error);
  }
});

router.get('/category/:category', optionalAuth, async (req, res, next) => {
  try {
    const { category } = req.params;
    const page  = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;

    const foodType = FOOD_TYPE_SLUG_MAP[category] || category;

    const { data, error } = await supabase
      .from('restaurants')
      .select(RESTAURANT_SELECT)
      .contains('food_types', [foodType])
      .order('rating', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    let restaurants = (data || []).map(normalizeRestaurant);
    restaurants = await attachSavedStatus(restaurants, req.userId);

    res.json({ data: restaurants });
  } catch (error) {
    console.error('[Restaurants] GET /category/:category error:', error);
    next(error);
  }
});

router.get('/markets/list', optionalAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select(RESTAURANT_SELECT)
      .order('rating', { ascending: false })
      .limit(20);

    if (error) throw error;

    let restaurants = (data || []).map(normalizeRestaurant);
    restaurants = await attachSavedStatus(restaurants, req.userId);

    res.json({ data: restaurants });
  } catch (error) {
    console.error('[Restaurants] GET /markets/list error:', error);
    next(error);
  }
});

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { type, price, rating, page = 1, limit = 20 } = req.query;

    const pageNum  = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(parseInt(limit) || 20, 50);
    const offset   = (pageNum - 1) * limitNum;

    let query = supabase
      .from('restaurants')
      .select(RESTAURANT_SELECT, { count: 'exact' });

    if (type) {
      const rawTypes = type.split(',').map(t => t.trim()).filter(Boolean);
      const dbTypes  = rawTypes.map(t => FOOD_TYPE_SLUG_MAP[t] || t);
      if (dbTypes.length === 1) {
        query = query.contains('food_types', [dbTypes[0]]);
      } else {
        query = query.overlaps('food_types', dbTypes);
      }
    }

    if (price) {
      const rawPrices = price.split(',').map(p => p.trim()).filter(Boolean);
      const dbPrices  = rawPrices.map(p => PRICE_SLUG_MAP[p] || p);
      if (dbPrices.length === 1) {
        query = query.ilike('price_range', `%${dbPrices[0]}%`);
      } else {
        query = query.or(dbPrices.map(p => `price_range.ilike.%${p}%`).join(','));
      }
    }

    if (rating) {
      const minRating = parseFloat(rating);
      if (!isNaN(minRating)) query = query.gte('rating', minRating);
    }

    const { data, error, count } = await query
      .order('rating', { ascending: false })
      .order('rating_count', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) throw error;

    // FIX: attach is_saved per user for authenticated requests
    let restaurants = (data || []).map(normalizeRestaurant);
    restaurants = await attachSavedStatus(restaurants, req.userId);

    res.json({
      data: restaurants,
      page: pageNum,
      limit: limitNum,
      total: count ?? restaurants.length,
      hasMore: restaurants.length === limitNum,
    });
  } catch (error) {
    console.error('[Restaurants] GET / error:', error);
    next(error);
  }
});

router.get('/:id/is-saved', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('saved_restaurants')
      .select('id')
      .eq('restaurant_id', id)
      .eq('user_id', req.userId)
      .maybeSingle();

    if (error) throw error;
    res.json({ saved: !!data });
  } catch (error) {
    console.error('[Restaurants] GET /:id/is-saved error:', error);
    next(error);
  }
});

router.get('/:id/landmark-notes', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('landmark_notes')
      .select(`
        id, text, helpful_count, verified, created_at,
        user:profiles(id, username, avatar_url)
      `)
      .eq('restaurant_id', id)
      .order('helpful_count', { ascending: false });

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    console.error('[Restaurants] GET /:id/landmark-notes error:', error);
    next(error);
  }
});


router.post('/:id/landmark-notes', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }

    const { data, error } = await supabase
      .from('landmark_notes')
      .insert({
        restaurant_id: id,
        user_id: req.userId,
        text: text.trim(),
      })
      .select(`
        id, text, helpful_count, verified, created_at,
        user:profiles(id, username, avatar_url)
      `)
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('[Restaurants] POST /:id/landmark-notes error:', error);
    next(error);
  }
});

router.post('/:id/landmark-notes/:noteId/like', requireAuth, async (req, res, next) => {
  try {
    const { noteId } = req.params;

    // Primary: call the RPC defined in schema SQL
    const { error: rpcError } = await supabase.rpc('increment_landmark_helpful', {
      note_id: noteId,
    });

    if (rpcError) {
      // Fallback: read then write (safe without supabase.raw())
      const { data: note, error: readErr } = await supabase
        .from('landmark_notes')
        .select('helpful_count')
        .eq('id', noteId)
        .single();

      if (readErr) throw readErr;

      const { error: writeErr } = await supabase
        .from('landmark_notes')
        .update({ helpful_count: (note.helpful_count || 0) + 1 })
        .eq('id', noteId);

      if (writeErr) throw writeErr;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Restaurants] POST /:id/landmark-notes/:noteId/like error:', error);
    next(error);
  }
});

router.get('/:id/reviews', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const page  = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('reviews')
      .select(`
        id, rating, title, content, images, dish_name, dish_price,
        likes, is_flagged, created_at,
        user:profiles(id, username, avatar_url)
      `, { count: 'exact' })
      .eq('restaurant_id', id)
      .eq('is_flagged', false)
      .order('likes', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const reviews = (data || []).map(r => ({
      id:         r.id,
      rating:     r.rating,
      title:      r.title,
      text:       r.content,
      content:    r.content,
      user:       r.user,
      likes:      r.likes || 0,
      images:     r.images || [],
      dish_name:  r.dish_name,
      dish_price: r.dish_price,
      created_at: r.created_at,
    }));

    res.json({
      data: reviews,
      page,
      limit,
      total: count ?? reviews.length,
      hasMore: reviews.length === limit,
    });
  } catch (error) {
    console.error('[Restaurants] GET /:id/reviews error:', error);
    next(error);
  }
});

router.post('/:id/reviews', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, title, content, images, dish_name, dish_price } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating must be between 1 and 5' });
    }

    // FIX: Prevent duplicate reviews — one review per user per restaurant.
    // Without this, the same user can submit unlimited reviews, inflating the
    // rating and spamming the review list.
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('restaurant_id', id)
      .eq('user_id', req.userId)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Bạn đã đánh giá quán này rồi.' });
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        restaurant_id: id,
        user_id:       req.userId,
        rating:        parseInt(rating),
        title:         title?.trim()   || null,
        content:       content?.trim() || null,
        images:        images          || [],
        dish_name:     dish_name?.trim()                            || null,
        dish_price:    dish_price != null ? parseFloat(dish_price) : null,
      })
      .select(`
        id, rating, title, content, images, dish_name, dish_price,
        likes, created_at,
        user:profiles(id, username, avatar_url)
      `)
      .single();

    if (error) throw error;

    // FIX: Recalculate rating using only non-flagged reviews — flagged/spam
    // reviews were previously included, silently skewing the restaurant score.
    const { data: stats } = await supabase
      .from('reviews')
      .select('rating')
      .eq('restaurant_id', id)
      .eq('is_flagged', false);

    if (stats && stats.length > 0) {
      const avg = stats.reduce((sum, r) => sum + r.rating, 0) / stats.length;
      await supabase
        .from('restaurants')
        .update({
          rating:       Math.round(avg * 100) / 100,
          rating_count: stats.length,
        })
        .eq('id', id);
    }

    res.status(201).json({
      id:         data.id,
      rating:     data.rating,
      title:      data.title,
      text:       data.content,
      content:    data.content,
      user:       data.user,
      likes:      data.likes || 0,
      images:     data.images || [],
      dish_name:  data.dish_name,
      dish_price: data.dish_price,
      created_at: data.created_at,
    });
  } catch (error) {
    console.error('[Restaurants] POST /:id/reviews error:', error);
    next(error);
  }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        landmark_notes_data:landmark_notes(
          id, text, helpful_count, verified, created_at,
          user:profiles(id, username, avatar_url)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Restaurant not found' });
      }
      throw error;
    }

    // Fetch top reviews (by likes desc, non-flagged only)
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select(`
        id, rating, title, content, images, dish_name, dish_price, likes, created_at,
        user:profiles(id, username, avatar_url)
      `)
      .eq('restaurant_id', id)
      .eq('is_flagged', false)
      .order('likes', { ascending: false })
      .limit(10);

    // Saved status for authenticated user
    let isSaved = false;
    if (req.userId) {
      const { data: savedData } = await supabase
        .from('saved_restaurants')
        .select('id')
        .eq('restaurant_id', id)
        .eq('user_id', req.userId)
        .maybeSingle();
      isSaved = !!savedData;
    }

    const restaurant = normalizeRestaurant(data);
    restaurant.top_reviews = (reviewsData || []).map(r => ({
      id:         r.id,
      rating:     r.rating,
      title:      r.title,
      text:       r.content,
      content:    r.content,
      user:       r.user,
      likes:      r.likes || 0,
      images:     r.images || [],
      dish_name:  r.dish_name,
      dish_price: r.dish_price,
      created_at: r.created_at,
    }));
    restaurant.is_saved = isSaved;

    res.json(restaurant);
  } catch (error) {
    console.error('[Restaurants] GET /:id error:', error);
    next(error);
  }
});

router.post('/:id/save', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('saved_restaurants')
      .upsert(
        { restaurant_id: id, user_id: req.userId },
        { onConflict: 'restaurant_id,user_id' }
      );

    if (error) throw error;
    res.json({ success: true, saved: true });
  } catch (error) {
    console.error('[Restaurants] POST /:id/save error:', error);
    next(error);
  }
});

router.post('/:id/unsave', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('saved_restaurants')
      .delete()
      .eq('restaurant_id', id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ success: true, saved: false });
  } catch (error) {
    console.error('[Restaurants] POST /:id/unsave error:', error);
    next(error);
  }
});

module.exports = router;