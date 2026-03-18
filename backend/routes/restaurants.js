const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { normalizeRestaurantImages } = require('../config/cloudinary');
const { ensureGoogleMapsUrl } = require('../config/googleMaps');

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
    address: r.address || null,
    latitude: r.latitude ? parseFloat(r.latitude) : null,
    longitude: r.longitude ? parseFloat(r.longitude) : null,
    google_maps_url: r.google_maps_url || null,

    // Food types
    food_types: r.food_types || [],
    cuisine: r.food_types || [],     // alias
    categories: r.food_types || [], // alias

    // Images
    cover_image: r.cover_image || null,
    image_url: r.cover_image || null,  
    photos: r.photos || [],
    images: r.photos || [],            // alias
    has_images: !!(r.cover_image || (r.photos && r.photos.length > 0)),

    // Ratings
    rating: r.rating ? parseFloat(r.rating) : null,
    rating_count: r.rating_count || 0,

    // Price
    price_range: r.price_range || null,
    priceRange: r.price_range || null,

    // Status
    verified: r.verified || false,
    status: r.status || 'unverified',

    // Hours
    opening_hours: r.opening_hours || null,

    // Landmark notes
    landmark_notes: landmarkNotes,
    landmarkNotes: landmarkNotes,

    // Ranking
    top_rank_this_week: r.top_rank_this_week || null,
    topRankThisWeek: r.top_rank_this_week || null,
    rank: r.top_rank_this_week || null,
    weekly_activity: r.weekly_activity || 0,
    posts_count: r.posts_count || 0,

    // Metadata
    created_at: r.created_at,
    is_saved: r.is_saved || false,
    top_reviews: r.top_reviews || [],
  };


  return ensureGoogleMapsUrl(restaurant);
}

// ============================================================
// GET /restaurants/top-rated
// ============================================================
router.get('/top-rated', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        landmark_notes_data:landmark_notes(id, text, helpful_count, verified)
      `)
      .not('top_rank_this_week', 'is', null)
      .order('top_rank_this_week', { ascending: true })
      .limit(10);

    if (error) throw error;

    res.json((data || []).map(normalizeRestaurant));
  } catch (error) {
    console.error('[Restaurants] GET /top-rated error:', error);
    next(error);
  }
});

// ============================================================
// GET /restaurants/category/:category
// Returns restaurants filtered by food-type category
// Supports slug-style params (e.g. 'mon-viet') and display names
// MUST be before /:id
// ============================================================
router.get('/category/:category', async (req, res, next) => {
  try {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;

    // Map URL slugs to the food_types values stored in DB
    const SLUG_MAP = {
      'mon-viet':  'Món Việt',
      'mon-thai':  'Món Thái',
      'mon-han':   'Món Hàn',
      'mon-au-my': 'Món Âu-Mỹ',
      'mon-nhat':  'Món Nhật',
      'mon-trung': 'Món Trung',
      'mon-an':    'Món Ấn',
      'khac':      'Khác',
    };

    const foodType = SLUG_MAP[category] || category;

    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        landmark_notes_data:landmark_notes(id, text, helpful_count, verified)
      `)
      .contains('food_types', [foodType])
      .order('rating', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json((data || []).map(normalizeRestaurant));
  } catch (error) {
    console.error('[Restaurants] GET /category/:category error:', error);
    next(error);
  }
});

// ============================================================
// GET /restaurants/markets/list
// MUST be before /:id
// ============================================================
router.get('/markets/list', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        landmark_notes_data:landmark_notes(id, text, helpful_count, verified)
      `)
      .order('rating', { ascending: false })
      .limit(20);

    if (error) throw error;

    res.json({ data: (data || []).map(normalizeRestaurant) });
  } catch (error) {
    console.error('[Restaurants] GET /markets/list error:', error);
    next(error);
  }
});

// ============================================================
// GET /restaurants
// ============================================================
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { type, cuisine, price, rating, page = 1, limit = 20 } = req.query;
    const typeParam = type || cuisine;

    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, 50);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('restaurants')
      .select(`
        *,
        landmark_notes_data:landmark_notes(id, text, helpful_count, verified)
      `, { count: 'exact' });

    // Filter by food types (comma-separated, OR logic)
    if (type) {
      const types = type.split(',').map(t => t.trim()).filter(Boolean);
      if (types.length === 1) {
        query = query.contains('food_types', [types[0]]);
      } else {
        query = query.overlaps('food_types', types);
      }
    }

    // Filter by price range (comma-separated, OR logic)
    if (price) {
      const prices = price.split(',').map(p => p.trim()).filter(Boolean);
      if (prices.length === 1) {
        query = query.ilike('price_range', `%${prices[0]}%`);
      } else {
        query = query.or(prices.map(p => `price_range.ilike.%${p}%`).join(','));
      }
    }

    // Filter by minimum rating
    if (rating) {
      const minRating = parseFloat(rating);
      if (!isNaN(minRating)) {
        query = query.gte('rating', minRating);
      }
    }

    const { data, error, count } = await query
      .order('rating', { ascending: false })
      .order('rating_count', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) throw error;

    const restaurants = (data || []).map(normalizeRestaurant);

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

// ============================================================
// POST /restaurants
// Creates a new restaurant entry (authenticated users)
// Called by ApiService.createRestaurant()
// Returns the normalised restaurant object directly (no { data } wrapper)
// ============================================================
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const {
      name,
      address,
      latitude,
      longitude,
      food_types,
      price_range,
      opening_hours,
      cover_image,
      photos,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Restaurant name is required' });
    }

    const { data, error } = await supabase
      .from('restaurants')
      .insert({
        name:          name.trim(),
        address:       address       || null,
        latitude:      latitude      || null,
        longitude:     longitude     || null,
        food_types:    food_types    || [],
        price_range:   price_range   || null,
        opening_hours: opening_hours || null,
        cover_image:   cover_image   || null,
        photos:        photos        || [],
        status:        'pending',
      })
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json(normalizeRestaurant(data));
  } catch (error) {
    console.error('[Restaurants] POST / error:', error);
    next(error);
  }
});

// ============================================================
// POST /restaurants/:id/reviews
// Submit a review for a restaurant (authenticated users)
// Called from restaurant-detail.tsx handleSubmitReview()
// ============================================================
router.post('/:id/reviews', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, title, content, images, dish_name, dish_price } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        restaurant_id: id,
        user_id:       req.userId,
        rating:        parseInt(rating),
        title:         title      || null,
        content:       content    || null,
        images:        images     || [],
        dish_name:     dish_name  || null,
        dish_price:    dish_price ? parseFloat(dish_price) : null,
      })
      .select(`
        id, rating, title, content, images, dish_name, dish_price, likes, created_at,
        user:profiles(id, username, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Recalculate restaurant average rating
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('restaurant_id', id);

    if (allReviews && allReviews.length > 0) {
      const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      await supabase
        .from('restaurants')
        .update({ rating: Math.round(avg * 100) / 100, rating_count: allReviews.length })
        .eq('id', id);
    }

    res.status(201).json({
      data: {
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
      },
    });
  } catch (error) {
    console.error('[Restaurants] POST /:id/reviews error:', error);
    next(error);
  }
});

// ============================================================
// GET /restaurants/:id/is-saved
// Must be before /:id to avoid route collision
// ============================================================
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

// ============================================================
// GET /restaurants/:id/landmark-notes
// Must be before /:id
// ============================================================
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

// ============================================================
// GET /restaurants/:id
// Full restaurant detail with reviews + saved status
// ============================================================
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

    // Fetch top reviews
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select(`
        id, rating, title, content, images, dish_name, dish_price, likes, created_at,
        user:profiles(id, username, avatar_url)
      `)
      .eq('restaurant_id', id)
      .order('likes', { ascending: false })
      .limit(5);

    // Check saved status for authenticated user
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
      id: r.id,
      rating: r.rating,
      title: r.title,
      text: r.content,
      content: r.content,
      user: r.user,
      likes: r.likes || 0,
      images: r.images || [],
      dish_name: r.dish_name,
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

// ============================================================
// POST /restaurants/:id/save
// ============================================================
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

// ============================================================
// POST /restaurants/:id/unsave
// ============================================================
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