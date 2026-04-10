const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { ensureGoogleMapsUrl } = require('../config/googleMaps');

// ============================================================
// SINGLE SOURCE OF TRUTH FOR ALL SLUG → DB VALUE MAPS
//
// These MUST match:
//   Frontend: src/constants/categoryConfig.ts  (FOOD_TYPE_SLUG_MAP, PRICE_OPTIONS)
//   Frontend: src/types/restaurant.ts          (FoodType enum, FOOD_TYPE_SLUG_MAP)
//   Seed:     seed.sql                         (food_types arrays, price_range values)
// ============================================================

// Slug → exact DB food_types string value
const FOOD_TYPE_SLUG_MAP = {
  // Country cuisines
  'mon-viet':   'Món Việt',
  'mon-thai':   'Món Thái',
  'mon-han':    'Món Hàn',
  'mon-au-my':  'Món Âu-Mỹ',
  'mon-nhat':   'Món Nhật',
  'mon-trung':  'Món Trung',
  'mon-an':     'Món Ấn',
  'khac':       'Khác',
  // Dish / meal formats
  'bun-pho':     'Bún & Phở',
  'com-chien':   'Cơm & Cháo',
  'banh-mi':     'Bánh mì',
  'lau-nuong':   'Lẩu & Nướng',
  'hai-san':     'Hải sản',
  'an-vat':      'Ăn vặt',
  'trang-mieng': 'Tráng miệng',
  'chay':        'Món chay',
  // Drinks
  'cafe':    'Café',
  'do-uong': 'Đồ uống',
  'tra-sua': 'Trà sữa',
  'nuoc-ep': 'Nước ép',
  'sinh-to': 'Sinh tố',
};

// FilterModal/search slug → exact DB price_range string value
// Canonical DB values: 'Dưới 30k VND' | '30k - 80k VND' | '80k - 150k VND' | 'Trên 150k VND'
const PRICE_SLUG_MAP = {
  // FilterModal price IDs
  'under-30k':  'Dưới 30k VND',
  '30k-50k':    '30k - 80k VND',
  '50k-100k':   '80k - 150k VND',
  'over-100k':  'Trên 150k VND',
  // Category-screen price tier slugs
  'binh-dan':   'Dưới 30k VND',
  'gia-hop-ly': '30k - 80k VND',
  'tam-trung':  '80k - 150k VND',
  'cao-cap':    'Trên 150k VND',
};

// Helper: translate comma-separated slug list → DB food_type strings
function translateFoodTypeSlugs(slugParam) {
  if (!slugParam) return [];
  return slugParam
    .split(',')
    .map(s => FOOD_TYPE_SLUG_MAP[s.trim()] || s.trim())
    .filter(Boolean);
}

// Helper: translate comma-separated price slug list → DB price_range strings
function translatePriceSlugs(priceParam) {
  if (!priceParam) return [];
  return priceParam
    .split(',')
    .map(p => PRICE_SLUG_MAP[p.trim()] || p.trim())
    .filter(Boolean);
}

async function recalculateRestaurantStats(restaurantId) {
  const { data: allReviews, error: reviewsError } = await supabase
    .from('reviews')
    .select('rating')
    .eq('restaurant_id', restaurantId);

  if (reviewsError) throw reviewsError;

  const reviewCount = allReviews?.length || 0;

  if (reviewCount === 0) {
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
        rating: null,
        rating_count: 0,
      })
      .eq('id', restaurantId);

    if (updateError) throw updateError;
    return;
  }

  const avg =
    allReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount;

  const { error: updateError } = await supabase
    .from('restaurants')
    .update({
      rating: Math.round(avg * 100) / 100,
      rating_count: reviewCount,
    })
    .eq('id', restaurantId);

  if (updateError) throw updateError;
}

// ============================================================
// NORMALIZER — raw Supabase row → API response shape
// Provides both snake_case and camelCase aliases for all fields
// so frontend components that use either convention work correctly.
// ============================================================
function normalizeRestaurant(r) {
  if (!r) return null;

  const landmarkNotes =
    r.landmark_notes_data && r.landmark_notes_data.length > 0
      ? r.landmark_notes_data
      : null;

  const restaurant = {
    id:              r.id,
    name:            r.name,
    address:         r.address  || null,
    latitude:        r.latitude  ? parseFloat(r.latitude)  : null,
    longitude:       r.longitude ? parseFloat(r.longitude) : null,
    google_maps_url: r.google_maps_url || null,

    // food_types is the canonical field; frontend also reads cuisine/categories
    food_types:  r.food_types || [],
    cuisine:     r.food_types || [],   // camelCase alias
    categories:  r.food_types || [],   // legacy alias

    cover_image: r.cover_image || null,
    image_url:   r.cover_image || null, // alias
    photos:      r.photos      || [],
    images:      r.photos      || [],   // alias
    has_images:  !!(r.cover_image || (r.photos && r.photos.length > 0)),

    rating:       r.rating       ? parseFloat(r.rating) : null,
    rating_count: r.rating_count || 0,
    price_range:  r.price_range  || null,
    priceRange:   r.price_range  || null, // alias

    verified:      r.verified || false,
    status:        r.status   || 'unverified',
    opening_hours: r.opening_hours || null,

    landmark_notes: landmarkNotes,
    landmarkNotes:  landmarkNotes, // alias

    top_rank_this_week: r.top_rank_this_week || null,
    topRankThisWeek:    r.top_rank_this_week || null, // alias
    rank:               r.top_rank_this_week || null,
    weekly_activity:    r.weekly_activity || 0,
    posts_count:        r.posts_count     || 0,
    created_at:         r.created_at,

    is_saved:    r.is_saved    || false,
    top_reviews: r.top_reviews || [],
  };

  // Ensure google_maps_url is populated (fallback to coordinates or name)
  return ensureGoogleMapsUrl(restaurant);
}

// ============================================================
// Shared Supabase SELECT fragments
// ============================================================
const RESTAURANT_SELECT = `
  *,
  landmark_notes_data:landmark_notes(id, text, helpful_count, verified)
`;

const RESTAURANT_SELECT_WITH_USER = `
  *,
  landmark_notes_data:landmark_notes(
    id, text, helpful_count, verified, created_at,
    user:profiles(id, username, avatar_url)
  )
`;

// ============================================================
// ⚠️  ROUTE ORDER IS CRITICAL IN EXPRESS
//
// All named/specific routes MUST be registered BEFORE /:id.
// If /:id appears first, Express matches 'top-rated', 'search',
// 'config', 'markets' etc. as id params and the real handlers
// are never reached — causing Supabase UUID errors and timeouts.
//
// Order:
//   1. GET /config
//   2. GET /search
//   3. GET /top-rated
//   4. GET /category/:category
//   5. GET /markets/list
//   6. GET /              (paginated list)
//   7. POST /             (create)
//   8. GET /:id           ← must be LAST among GET routes
//   9. All /:id sub-routes
// ============================================================

// ============================================================
// 1. GET /restaurants/config
// Returns the full category/tab/price configuration so the
// frontend can render tabs dynamically without hardcoded arrays.
// ============================================================
router.get('/config', async (req, res, next) => {
  try {
    // Fetch counts per food_type string from DB
    const { data: countData } = await supabase
      .from('restaurants')
      .select('food_types');

    // Build a map: dbValue → count
    const countMap = {};
    (countData || []).forEach(row => {
      (row.food_types || []).forEach(ft => {
        countMap[ft] = (countMap[ft] || 0) + 1;
      });
    });

    // Helper: get count for a slug
    const countForSlug = slug => countMap[FOOD_TYPE_SLUG_MAP[slug]] || 0;

    const config = {
      foodTabs: [
        { id: 'bun-pho',     label: 'Bún & Phở',   icon: '🍜', dbValue: 'Bún & Phở',    count: countForSlug('bun-pho')     },
        { id: 'banh-mi',     label: 'Bánh mì',      icon: '🥖', dbValue: 'Bánh mì',      count: countForSlug('banh-mi')     },
        { id: 'com-chien',   label: 'Cơm & Cháo',   icon: '🍚', dbValue: 'Cơm & Cháo',   count: countForSlug('com-chien')   },
        { id: 'lau-nuong',   label: 'Lẩu & Nướng',  icon: '🍲', dbValue: 'Lẩu & Nướng',  count: countForSlug('lau-nuong')   },
        { id: 'hai-san',     label: 'Hải sản',       icon: '🦐', dbValue: 'Hải sản',      count: countForSlug('hai-san')     },
        { id: 'an-vat',      label: 'Ăn vặt',        icon: '🧆', dbValue: 'Ăn vặt',      count: countForSlug('an-vat')      },
        { id: 'trang-mieng', label: 'Tráng miệng',   icon: '🍨', dbValue: 'Tráng miệng',  count: countForSlug('trang-mieng') },
        { id: 'chay',        label: 'Món chay',      icon: '🥗', dbValue: 'Món chay',     count: countForSlug('chay')        },
      ],
      drinkTabs: [
        { id: 'tra-sua',  label: 'Trà sữa', icon: '🧋', dbValue: 'Trà sữa', count: countForSlug('tra-sua')  },
        { id: 'cafe',     label: 'Cà phê',  icon: '☕', dbValue: 'Café',    count: countForSlug('cafe')     },
        { id: 'nuoc-ep',  label: 'Nước ép', icon: '🥤', dbValue: 'Nước ép', count: countForSlug('nuoc-ep')  },
        { id: 'sinh-to',  label: 'Sinh tố', icon: '🍹', dbValue: 'Sinh tố', count: countForSlug('sinh-to')  },
        { id: 'do-uong',  label: 'Khác',    icon: '🧃', dbValue: 'Đồ uống', count: countForSlug('do-uong')  },
      ],
      cuisineTabs: [
        { id: 'mon-viet',  label: 'Món Việt',  icon: '🇻🇳', dbValue: 'Món Việt',  count: countForSlug('mon-viet')  },
        { id: 'mon-han',   label: 'Món Hàn',   icon: '🇰🇷', dbValue: 'Món Hàn',   count: countForSlug('mon-han')   },
        { id: 'mon-nhat',  label: 'Món Nhật',  icon: '🇯🇵', dbValue: 'Món Nhật',  count: countForSlug('mon-nhat')  },
        { id: 'mon-thai',  label: 'Món Thái',  icon: '🇹🇭', dbValue: 'Món Thái',  count: countForSlug('mon-thai')  },
        { id: 'mon-trung', label: 'Món Trung', icon: '🇨🇳', dbValue: 'Món Trung', count: countForSlug('mon-trung') },
        { id: 'mon-au-my', label: 'Món Tây',   icon: '🇺🇸', dbValue: 'Món Âu-Mỹ', count: countForSlug('mon-au-my') },
        { id: 'mon-an',    label: 'Món Ấn',    icon: '🇮🇳', dbValue: 'Món Ấn',   count: countForSlug('mon-an')    },
        { id: 'khac',      label: 'Khác',      icon: '🌍', dbValue: 'Khác',     count: countForSlug('khac')      },
      ],
      priceOptions: [
        { id: 'under-30k', label: 'Dưới 30k',  dbValue: 'Dưới 30k VND'   },
        { id: '30k-50k',   label: '30k – 80k',  dbValue: '30k - 80k VND'  },
        { id: '50k-100k',  label: '80k – 150k', dbValue: '80k - 150k VND' },
        { id: 'over-100k', label: 'Trên 150k',  dbValue: 'Trên 150k VND'  },
      ],
      priceCategoryOptions: [
        { id: 'binh-dan',   label: 'Bình dân (Dưới 30k)',    dbValue: 'Dưới 30k VND'   },
        { id: 'gia-hop-ly', label: 'Hợp lý (30k – 80k)',     dbValue: '30k - 80k VND'  },
        { id: 'tam-trung',  label: 'Tầm trung (80k – 150k)', dbValue: '80k - 150k VND' },
        { id: 'cao-cap',    label: 'Cao cấp (Trên 150k)',     dbValue: 'Trên 150k VND'  },
      ],
      // tabsKey used by useAppConfig.ts to resolve tab arrays
      homeSections: [
        { key: 'food',    title: 'Hôm nay ăn gì?',      tabsKey: 'foodTabs'    },
        { key: 'drinks',  title: 'Uống gì hôm nay?',     tabsKey: 'drinkTabs'   },
        { key: 'cuisine', title: 'Ẩm thực thế giới 🌏',  tabsKey: 'cuisineTabs' },
      ],
    };

    res.json({ data: config });
  } catch (error) {
    console.error('[Restaurants] GET /config error:', error);
    next(error);
  }
});

// ============================================================
// 2. GET /restaurants/search
// Query params: q, type (slug), price (slug), rating, limit
// ============================================================
router.get('/search', async (req, res, next) => {
  try {
    const { q, type, price, rating, limit = 20 } = req.query;
    const limitNum   = Math.min(parseInt(limit) || 20, 50);
    const hasQuery   = q && q.trim();
    const hasFilters = type || price || rating;

    if (!hasQuery && !hasFilters) {
      return res.json({ data: [] });
    }

    let query = supabase
      .from('restaurants')
      .select(RESTAURANT_SELECT);

    if (hasQuery) {
      const t = q.trim();
      query = query.or(`name.ilike.%${t}%,address.ilike.%${t}%`);
    }

    if (type) {
      const dbTypes = translateFoodTypeSlugs(type);
      if (dbTypes.length === 1) {
        query = query.contains('food_types', [dbTypes[0]]);
      } else if (dbTypes.length > 1) {
        query = query.overlaps('food_types', dbTypes);
      }
    }

    if (price) {
      const dbPrices = translatePriceSlugs(price);
      if (dbPrices.length === 1) {
        query = query.eq('price_range', dbPrices[0]);
      } else if (dbPrices.length > 1) {
        query = query.in('price_range', dbPrices);
      }
    }

    if (rating) {
      const minRating = parseFloat(rating);
      if (!isNaN(minRating)) query = query.gte('rating', minRating);
    }

    const { data, error } = await query
      .order('rating', { ascending: false })
      .limit(limitNum);

    if (error) throw error;

    res.json({ data: (data || []).map(normalizeRestaurant) });
  } catch (error) {
    console.error('[Restaurants] GET /search error:', error);
    next(error);
  }
});

// ============================================================
// 3. GET /restaurants/top-rated
// Returns restaurants ranked by top_rank_this_week (not null),
// ordered ascending (rank 1 first).
// Called by ApiService.getTopTen() and category.tsx (type='top10').
// ============================================================
router.get('/top-rated', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select(RESTAURANT_SELECT)
      .not('top_rank_this_week', 'is', null)
      .order('top_rank_this_week', { ascending: true })
      .limit(10);

    if (error) throw error;

    res.json({ data: (data || []).map(normalizeRestaurant) });
  } catch (error) {
    console.error('[Restaurants] GET /top-rated error:', error);
    next(error);
  }
});

// ============================================================
// 4. GET /restaurants/category/:category
// Handles all slug types:
//   • Food/drink/cuisine slugs → food_types array containment
//   • Price slugs              → price_range exact match
//   • 'top-rated'              → top_rank_this_week ASC (not null)
//   • 'moi-nhat'               → order by created_at DESC
//   • 'verified'               → verified = true
//   • 'nuoc-ngoai'             → exclude 'Món Việt'
// ============================================================
router.get('/category/:category', async (req, res, next) => {
  try {
    const { category } = req.params;
    const page   = parseInt(req.query.page)  || 1;
    const limit  = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;

    let queryBuilder = supabase
      .from('restaurants')
      .select(RESTAURANT_SELECT, { count: 'exact' });

    let orderBy = { column: 'rating', ascending: false };

    if (FOOD_TYPE_SLUG_MAP[category]) {
      // Covers ALL food tabs, drink tabs, and cuisine tabs
      queryBuilder = queryBuilder.contains('food_types', [FOOD_TYPE_SLUG_MAP[category]]);

    } else if (PRICE_SLUG_MAP[category]) {
      // Category-screen price tier slugs — exact match on canonical DB string
      queryBuilder = queryBuilder.eq('price_range', PRICE_SLUG_MAP[category]);

    } else if (category === 'verified') {
      queryBuilder = queryBuilder.eq('verified', true);

    } else if (category === 'top-rated') {
      // Order by weekly rank; only return restaurants that have a rank
      queryBuilder = queryBuilder.not('top_rank_this_week', 'is', null);
      orderBy = { column: 'top_rank_this_week', ascending: true };

    } else if (category === 'moi-nhat') {
      orderBy = { column: 'created_at', ascending: false };

    } else if (category === 'nuoc-ngoai') {
      // Exclude Vietnamese food — CS operator checks array containment
      queryBuilder = queryBuilder.not('food_types', 'cs', '{"Món Việt"}');

    } else {
      // Fallback: treat as a raw food_type DB string
      queryBuilder = queryBuilder.contains('food_types', [category]);
    }

    const { data, error, count } = await queryBuilder
      .order(orderBy.column, { ascending: orderBy.ascending })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const restaurants = (data || []).map(normalizeRestaurant);

    res.json({
      data:    restaurants,
      page,
      limit,
      total:   count ?? restaurants.length,
      hasMore: restaurants.length === limit,
    });
  } catch (error) {
    console.error('[Restaurants] GET /category/:category error:', error);
    next(error);
  }
});

// ============================================================
// 5. GET /restaurants/markets/list
// ============================================================
router.get('/markets/list', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select(RESTAURANT_SELECT)
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
// 6. GET /restaurants  (paginated list with optional filters)
// ============================================================
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { type, cuisine, price, rating, page = 1, limit = 20 } = req.query;
    const typeParam = type || cuisine;
    const pageNum   = parseInt(page)  || 1;
    const limitNum  = Math.min(parseInt(limit) || 20, 50);
    const offset    = (pageNum - 1) * limitNum;

    let query = supabase
      .from('restaurants')
      .select(RESTAURANT_SELECT, { count: 'exact' });

    if (typeParam) {
      const dbTypes = translateFoodTypeSlugs(typeParam);
      if (dbTypes.length === 1) {
        query = query.contains('food_types', [dbTypes[0]]);
      } else if (dbTypes.length > 1) {
        query = query.overlaps('food_types', dbTypes);
      }
    }

    if (price) {
      const dbPrices = translatePriceSlugs(price);
      if (dbPrices.length === 1) {
        query = query.eq('price_range', dbPrices[0]);
      } else if (dbPrices.length > 1) {
        query = query.in('price_range', dbPrices);
      }
    }

    if (rating) {
      const minRating = parseFloat(rating);
      if (!isNaN(minRating)) query = query.gte('rating', minRating);
    }

    const { data, error, count } = await query
      .order('rating',       { ascending: false })
      .order('rating_count', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) throw error;

    const restaurants = (data || []).map(normalizeRestaurant);

    res.json({
      data:    restaurants,
      page:    pageNum,
      limit:   limitNum,
      total:   count ?? restaurants.length,
      hasMore: restaurants.length === limitNum,
    });
  } catch (error) {
    console.error('[Restaurants] GET / error:', error);
    next(error);
  }
});

// ============================================================
// 7. POST /restaurants  (create — auth required)
// ============================================================
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const {
      name, address, latitude, longitude,
      food_types, price_range, opening_hours, cover_image, photos,
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
// 8. GET /restaurants/:id
// ⚠️  MUST come after ALL named routes above. Express matches
//     routes in registration order — anything above this point
//     that looks like a path segment would be captured as :id.
// ============================================================
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('restaurants')
      .select(RESTAURANT_SELECT_WITH_USER)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Restaurant not found' });
      }
      throw error;
    }

    // Top 5 reviews ordered by likes
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        id, rating, title, content, images, dish_name, dish_price, likes, is_flagged, created_at,
        user:profiles(id, username, avatar_url)
      `)
      .eq('restaurant_id', id)
      .order('likes', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5);

      if (reviewsError) {
        console.error('[Restaurants] GET /:id reviews query error:', reviewsError);
        throw reviewsError;
      }

    // Saved status for authenticated users
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
      is_flagged: r.is_flagged,
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
// 9. GET /restaurants/:id/is-saved
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
// 10. GET /restaurants/:id/landmark-notes
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
// 11. POST /restaurants/:id/landmark-notes
// ============================================================
router.post('/:id/landmark-notes', requireAuth, async (req, res, next) => {
  try {
    const { id }   = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Note text is required' });
    }
    const { data, error } = await supabase
      .from('landmark_notes')
      .insert({ restaurant_id: id, user_id: req.userId, text: text.trim() })
      .select(`id, text, helpful_count, verified, created_at, user:profiles(id, username, avatar_url)`)
      .single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (error) {
    console.error('[Restaurants] POST /:id/landmark-notes error:', error);
    next(error);
  }
});

// ============================================================
// 12. POST /restaurants/:id/reviews
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
    await recalculateRestaurantStats(id);

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
// 13. GET /restaurants/:id/reviews  (paginated)
// Query params: page (default 1), limit (default 10), sort (likes|newest)
// ============================================================
router.get('/:id/reviews', async (req, res, next) => {
  try {
    const { id }             = req.params;
    const page               = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit              = Math.min(parseInt(req.query.limit) || 10, 50);
    const sort               = req.query.sort === 'newest' ? 'newest' : 'likes';
    const offset             = (page - 1) * limit;

    let query = supabase
    .from('reviews')
    .select(`
      id, rating, title, content, images, dish_name, dish_price,
      likes, is_flagged, created_at,
      user:profiles(id, username, avatar_url)
    `, { count: 'exact' })
    .eq('restaurant_id', id);

  if (sort === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else {
    query = query
      .order('likes', { ascending: false })
      .order('created_at', { ascending: false });
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

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
      is_flagged: r.is_flagged,
      created_at: r.created_at,
    }));

    res.json({
      data:    reviews,
      page,
      limit,
      total:   count || 0,
      hasMore: offset + reviews.length < (count || 0),
    });
  } catch (error) {
    console.error('[Restaurants] GET /:id/reviews error:', error);
    next(error);
  }
});

// ============================================================
// 14. DELETE /restaurants/:id/reviews/:reviewId
// ============================================================
router.delete('/:id/reviews/:reviewId', requireAuth, async (req, res, next) => {
  try {
    const { id, reviewId } = req.params;

    const { data: deletedReview, error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', req.userId)
      .select('id')
      .maybeSingle();

    if (error) throw error;

    if (!deletedReview) {
      return res.status(404).json({ error: 'Review not found or not allowed to delete' });
    }

    await recalculateRestaurantStats(id);

    res.json({ success: true });
  } catch (error) {
    console.error('[Restaurants] DELETE /:id/reviews/:reviewId error:', error);
    next(error);
  }
});

// ============================================================
// 15. POST /restaurants/:id/reviews/:reviewId/like
// ============================================================
router.post('/:id/reviews/:reviewId/like', requireAuth, async (req, res, next) => {
  try {
    const { id: restaurantId, reviewId } = req.params;
    const userId = req.userId;

    // 1) Make sure the review exists and belongs to this restaurant
    const { data: review, error: reviewErr } = await supabase
      .from('reviews')
      .select('id, restaurant_id')
      .eq('id', reviewId)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (reviewErr) throw reviewErr;

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // 2) Check whether this user already liked the review
    const { data: existingLike, error: likeErr } = await supabase
      .from('review_likes')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', userId)
      .maybeSingle();

    if (likeErr) throw likeErr;

    let liked;

    if (existingLike) {
      // Unlike
      const { error: deleteErr } = await supabase
        .from('review_likes')
        .delete()
        .eq('review_id', reviewId)
        .eq('user_id', userId);

      if (deleteErr) throw deleteErr;
      liked = false;
    } else {
      // Like
      const { error: insertErr } = await supabase
        .from('review_likes')
        .insert({
          review_id: reviewId,
          user_id: userId,
        });

      if (insertErr) throw insertErr;
      liked = true;
    }

    // 3) Recount total likes for this review
    const { count, error: countErr } = await supabase
      .from('review_likes')
      .select('*', { count: 'exact', head: true })
      .eq('review_id', reviewId);

    if (countErr) throw countErr;

    const likes = count || 0;

    // 4) Keep reviews.likes in sync
    const { error: updateErr } = await supabase
      .from('reviews')
      .update({ likes })
      .eq('id', reviewId);

    if (updateErr) throw updateErr;

    return res.json({
      success: true,
      liked,
      likes,
    });
  } catch (error) {
    console.error('[Restaurants] POST /:id/reviews/:reviewId/like error:', error);
    next(error);
  }
});

// ============================================================
// 16. POST /restaurants/:id/save  &  POST /restaurants/:id/unsave
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