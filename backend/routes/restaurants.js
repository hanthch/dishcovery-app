const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const supabase = require('../config/supabase');

/* ======================================================
   CONFIGURATION
====================================================== */
const DEFAULT_LIMIT = 10; // Reduced from 20 for faster response
const MAX_LIMIT = 50;
const QUERY_TIMEOUT = 5000; // 5 second timeout for queries

/* ======================================================
   HELPER FUNCTIONS
====================================================== */

/**
 * Apply timeout to Supabase queries
 */
async function queryWithTimeout(queryPromise, timeoutMs = QUERY_TIMEOUT) {
  return Promise.race([
    queryPromise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
    )
  ]);
}

/**
 * Sanitize and validate pagination params
 */
function getPaginationParams(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(MAX_LIMIT, parseInt(query.limit) || DEFAULT_LIMIT);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/* ======================================================
   RESTAURANTS HOME with FILTERS
   Used by: Restaurant home page with filter modal
====================================================== */
router.get('/', async (req, res) => {
  try {
    const { 
      type,        // Comma-separated types
      price,       // Comma-separated ranges
      cuisine,     // Comma-separated cuisines
      rating,      // Minimum rating
    } = req.query;

    const { page, limit, offset } = getPaginationParams(req.query);

    let query = supabase
      .from('restaurants')
      .select(`
        id,
        name,
        address,
        food_types,
        categories,
        price_range,
        rating,
        rating_count,
        google_maps_url,
        landmark_notes,
        opening_hours,
        cover_image,
        photos,
        verified,
        posts_count,
        created_at
      `, { count: 'exact' });

    // Apply filters
    if (type) {
      const types = type.split(',').map(t => t.trim());
      query = query.overlaps('categories', types);
    }

    if (price) {
      const prices = price.split(',').map(p => p.trim());
      const priceMap = {
        'Dưới 30k': 'budget',
        '30k-50k': 'moderate',
        '50k-100k': 'upscale',
        'Trên 100k': 'luxury'
      };
      const mappedPrices = prices.map(p => priceMap[p] || p);
      query = query.in('price_range', mappedPrices);
    }

    if (cuisine) {
      const cuisines = cuisine.split(',').map(c => c.trim());
      const cuisineMap = {
        'Việt': 'vietnamese',
        'Thái': 'thai',
        'Hàn': 'korean',
        'Âu-Mỹ': 'western',
        'Nhật': 'japanese',
        'Trung': 'chinese',
        'Ấn': 'indian',
        'Khác': 'other'
      };
      const mappedCuisines = cuisines.map(c => cuisineMap[c] || c.toLowerCase());
      query = query.overlaps('food_types', mappedCuisines);
    }

    if (rating) {
      query = query.gte('rating', parseFloat(rating));
    }

    // Pagination with timeout
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await queryWithTimeout(query);

    if (error) throw error;

    res.json({ 
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: count ? (offset + limit) < count : false
      }
    });

  } catch (error) {
    console.error('Error fetching restaurants:', error);
    
    if (error.message === 'Query timeout') {
      return res.status(504).json({ 
        error: 'Request timeout. Try reducing filters or using pagination.' 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

/* ======================================================
   CATEGORY BROWSING - OPTIMIZED
   Used by: category.tsx
   Returns limited results with pagination
====================================================== */
router.get('/category/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { page, limit, offset } = getPaginationParams(req.query);

    // Map frontend category names to backend values
    const categoryMap = {
      'via-he': 'street-food',
      'nup-hem': 'hidden-gem',
      'chay': 'vegetarian',
      'sang-trong': 'luxury',
      'lau': 'hotpot',
      'binh-dan': 'student-friendly',
      'an-khuya': 'late-night',
      'lai-rai': 'bar',
      'vegan': 'vegetarian',
      'hidden-gem': 'hidden-gem',
      'long-standing': 'long-standing',
      'student-friendly': 'student-friendly',
      'late-night': 'late-night',
      'breakfast': 'breakfast',
      'fancy': 'luxury',
      'vietnamese': 'vietnamese',
      'thai': 'thai',
      'korean': 'korean',
      'japanese': 'japanese',
      'chinese': 'chinese',
      'american': 'western',
      'western': 'western',
      'indian': 'indian',
      'other': 'other'
    };

    const mappedCategory = categoryMap[slug] || slug;

    const query = supabase
      .from('restaurants')
      .select(`
        id,
        name,
        address,
        food_types,
        categories,
        price_range,
        rating,
        rating_count,
        google_maps_url,
        landmark_notes,
        cover_image,
        photos,
        verified,
        posts_count,
        created_at
      `, { count: 'exact' })
      .or(`categories.cs.{${mappedCategory}},food_types.cs.{${mappedCategory}}`)
      .order('posts_count', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await queryWithTimeout(query);

    if (error) throw error;

    res.json({ 
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: count ? (offset + limit) < count : false
      }
    });

  } catch (error) {
    console.error('Error fetching category:', error);
    
    if (error.message === 'Query timeout') {
      return res.status(504).json({ 
        error: 'Request timeout' 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

/* ======================================================
   TOP 10 RESTAURANTS - OPTIMIZED
   Used by: top10.tsx
   CRITICAL: This should be fast and never timeout
====================================================== */
router.get('/top10', async (req, res) => {
  try {
    // Simple, fast query - no joins, no complex logic
    const query = supabase
      .from('restaurants')
      .select(`
        id,
        name,
        address,
        food_types,
        categories,
        price_range,
        rating,
        rating_count,
        google_maps_url,
        landmark_notes,
        opening_hours,
        cover_image,
        photos,
        verified,
        posts_count,
        created_at
      `)
      .order('posts_count', { ascending: false })
      .order('rating', { ascending: false })
      .limit(10);

    // Shorter timeout for Top 10 - this should be cached
    const { data, error } = await queryWithTimeout(query, 3000);

    if (error) throw error;

    // Add rank numbers
    const ranked = (data || []).map((r, index) => ({
      ...r,
      rank: index + 1,
      top_rank_this_week: index + 1
    }));

    // Cache this response
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    res.json({ data: ranked });

  } catch (error) {
    console.error('Error fetching top 10:', error);
    
    if (error.message === 'Query timeout') {
      return res.status(504).json({ 
        error: 'Service temporarily unavailable',
        data: [] // Return empty array so frontend doesn't crash
      });
    }
    
    res.status(500).json({ 
      error: error.message,
      data: [] // Return empty array so frontend doesn't crash
    });
  }
});

/* ======================================================
   RESTAURANT DETAIL
   Used by: restaurant-detail.tsx
====================================================== */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Separate queries to avoid timeout from complex joins
    const restaurantQuery = supabase
      .from('restaurants')
      .select(`
        id,
        name,
        address,
        food_types,
        categories,
        price_range,
        rating,
        rating_count,
        opening_hours,
        landmark_notes,
        google_maps_url,
        lat,
        lng,
        cover_image,
        photos,
        verified,
        posts_count,
        created_at,
        phone,
        website,
        description
      `)
      .eq('id', id)
      .single();

    const { data, error } = await queryWithTimeout(restaurantQuery);

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Restaurant not found' });
      }
      throw error;
    }

    // Get reviews separately (non-blocking)
    try {
      const reviewsQuery = supabase
        .from('reviews')
        .select(`
          id,
          rating,
          title,
          content,
          created_at,
          user:users (
            id,
            username,
            avatar_url
          )
        `)
        .eq('restaurant_id', id)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: reviews } = await queryWithTimeout(reviewsQuery);
      
      res.json({ 
        data: {
          ...data,
          top_reviews: reviews || []
        }
      });
    } catch (reviewError) {
      // If reviews fail, still return restaurant data
      console.error('Error fetching reviews:', reviewError);
      res.json({ data: { ...data, top_reviews: [] } });
    }

  } catch (error) {
    console.error('Error fetching restaurant:', error);
    
    if (error.message === 'Query timeout') {
      return res.status(504).json({ error: 'Request timeout' });
    }
    
    res.status(500).json({ error: error.message });
  }
});

/* ======================================================
   RESTAURANT SEARCH - OPTIMIZED
   Used by: restaurant-search.tsx
====================================================== */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const { limit } = getPaginationParams(req.query);

    if (!q || !q.trim()) {
      return res.json({ data: [] });
    }

    const searchTerm = q.trim().toLowerCase();

    // Use simpler search to avoid timeout
    const query = supabase
      .from('restaurants')
      .select(`
        id,
        name,
        address,
        food_types,
        categories,
        price_range,
        rating,
        rating_count,
        google_maps_url,
        landmark_notes,
        cover_image,
        photos,
        verified,
        posts_count
      `)
      .or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
      .order('posts_count', { ascending: false })
      .limit(limit);

    const { data, error } = await queryWithTimeout(query, 3000);

    if (error) throw error;

    res.json({ data: data || [] });

  } catch (error) {
    console.error('Error searching restaurants:', error);
    
    if (error.message === 'Query timeout') {
      return res.status(504).json({ 
        error: 'Search timeout. Try a more specific query.',
        data: []
      });
    }
    
    res.status(500).json({ error: error.message, data: [] });
  }
});

/* ======================================================
   SAVE/BOOKMARK RESTAURANT
====================================================== */
router.post('/:restaurantId/save', authMiddleware, async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const { error } = await supabase
      .from('saved_restaurants')
      .upsert({
        restaurant_id: restaurantId,
        user_id: req.user.id,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'restaurant_id,user_id'
      });

    if (error) throw error;

    res.json({ success: true, message: 'Restaurant saved' });
  } catch (error) {
    console.error('Error saving restaurant:', error);
    res.status(500).json({ error: error.message });
  }
});

/* ======================================================
   UNSAVE/UNBOOKMARK RESTAURANT
====================================================== */
router.post('/:restaurantId/unsave', authMiddleware, async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const { error } = await supabase
      .from('saved_restaurants')
      .delete()
      .match({
        restaurant_id: restaurantId,
        user_id: req.user.id,
      });

    if (error) throw error;

    res.json({ success: true, message: 'Restaurant unsaved' });
  } catch (error) {
    console.error('Error unsaving restaurant:', error);
    res.status(500).json({ error: error.message });
  }
});

/* ======================================================
   CHECK IF RESTAURANT IS SAVED
====================================================== */
router.get('/:restaurantId/is-saved', authMiddleware, async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const { data, error } = await supabase
      .from('saved_restaurants')
      .select('id')
      .match({
        restaurant_id: restaurantId,
        user_id: req.user.id,
      })
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({ saved: !!data });
  } catch (error) {
    console.error('Error checking saved status:', error);
    res.status(500).json({ error: error.message });
  }
});

/* ======================================================
   GET LANDMARK NOTES
====================================================== */
router.get('/:restaurantId/landmark-notes', async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const { data, error } = await supabase
      .from('landmark_notes')
      .select(`
        id,
        content,
        created_at,
        user:users!landmark_notes_user_id_fkey (
          username,
          avatar_url
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    res.json({ data: data || [] });
  } catch (error) {
    console.error('Error fetching landmark notes:', error);
    res.status(500).json({ error: error.message });
  }
});

/* ======================================================
   HEALTH CHECK
   Used for testing backend connectivity
====================================================== */
router.get('/health/check', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'restaurants-api'
  });
});

module.exports = router;