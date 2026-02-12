const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); 
const authMiddleware = require('../middleware/auth');
const supabase = require('../config/supabase');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const QUERY_TIMEOUT = 15000; 

async function queryWithTimeout(queryPromise, timeoutMs = QUERY_TIMEOUT) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Query timeout')), timeoutMs);
  });

  return Promise.race([
    queryPromise.then(res => {
      clearTimeout(timeoutId);
      return res;
    }),
    timeoutPromise
  ]);
}

function getPaginationParams(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(MAX_LIMIT, parseInt(query.limit) || DEFAULT_LIMIT);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ data: [] });

    const searchQuery = supabase
      .from('restaurants')
      .select('id, name, address, cover_image, rating, food_types, cuisine, price_range, verified, latitude, longitude')
      .ilike('name', `%${q}%`)
      .limit(15);

    const { data, error } = await queryWithTimeout(searchQuery, 7000);

    if (error) throw error;
    
    const results = (data || []).map(restaurant => ({
      ...restaurant,
      cuisine: restaurant.food_types || restaurant.cuisine || []
    }));
    
    res.json({ data: results });
  } catch (error) {
    res.status(error.message === 'Query timeout' ? 504 : 500).json({ error: error.message });
  }
});

router.get('/top10', async (req, res) => {
  try {
    const query = supabase
      .from('restaurants')
      .select('id, name, cover_image, rating, posts_count, food_types, cuisine, address, price_range, photos, verified, landmark_notes')
      .order('posts_count', { ascending: false }) 
      .limit(10);

    const { data, error } = await queryWithTimeout(query, 5000);

    if (error) throw error;

    // Add rank numbers and map fields
    const rankedData = (data || []).map((item, index) => ({
      ...item,
      rank: index + 1,
      top_rank_this_week: index + 1,
      cuisine: item.food_types || item.cuisine || [], // ✅ Field mapping
    }));

    res.json({ data: rankedData });
  } catch (error) {
    res.status(error.message === 'Query timeout' ? 504 : 500).json({ error: error.message, data: [] });
  }
});

router.get('/category/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { page, limit, offset } = getPaginationParams(req.query);

    const categoryMap = {
      'via-he': 'Quán vỉa hè',
      'nup-hem': 'Quán núp hẻm',
      'chay': 'Quán chay',
      'sang-trong': 'Quán sang trọng',
      'binh-dan': 'Quán bình dân',
      'an-khuya': 'Quán ăn khuya',
      
      'vegan': 'Quán chay',
      'hidden-gem': 'Quán ẩn mình',
      'long-standing': 'Quán lâu đời',
      'student-friendly': 'Quán sinh viên',
      'late-night': 'Quán ăn khuya',
      'breakfast': 'Quán ăn sáng',
      'fancy': 'Quán sang trọng',
      'street-food': 'Quán vỉa hè',
      
      // Cuisine categories
      'vietnamese': 'Việt',
      'thai': 'Thái',
      'korean': 'Hàn',
      'american': 'Âu-Mỹ',
      'western': 'Âu-Mỹ',
      'japanese': 'Nhật',
      'chinese': 'Trung',
      'italian': 'Ý',
      'mexican': 'Mexico',
      'indian': 'Ấn',
      'other': 'Khác'
    };

    const mappedValue = categoryMap[slug] || slug;

    const query = supabase
      .from('restaurants')
      .select('id, name, address, cover_image, rating, categories, food_types, cuisine, price_range, verified, landmark_notes, top_rank_this_week, photos', { count: 'exact' })
      .or(`categories.cs.{${mappedValue}},food_types.cs.{${mappedValue}}`)
      .order('rating', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await queryWithTimeout(query);

    if (error) throw error;

    const results = (data || []).map(restaurant => ({
      ...restaurant,
      cuisine: restaurant.food_types || restaurant.cuisine || []
    }));

    res.json({ 
      data: results,
      pagination: { total: count || 0, page, limit }
    });

  } catch (error) {
    res.status(error.message === 'Query timeout' ? 504 : 500).json({ error: error.message });
  }
});

router.get('/:restaurantId/landmark-notes', async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const { data, error } = await supabase
      .from('landmark_notes')
      .select(`
        id,
        text,
        helpful_count,
        verified,
        created_at,
        user:users (
          id,
          username,
          avatar_url
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('helpful_count', { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json({ data: data || [] });
  } catch (error) {
    console.error('[API Error] Get landmark notes:', error.message);
    res.status(500).json({ error: error.message, data: [] });
  }
});

router.post('/:restaurantId/save', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('saved_restaurants')
      .upsert({ 
        restaurant_id: req.params.restaurantId, 
        user_id: req.user.id,
        created_at: new Date().toISOString()
      });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { 
    res.status(500).json({ error: error.message }); 
  }
});

router.post('/:restaurantId/unsave', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('saved_restaurants')
      .delete()
      .match({ restaurant_id: req.params.restaurantId, user_id: req.user.id });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { 
    res.status(500).json({ error: error.message }); 
  }
});

router.get('/:restaurantId/is-saved', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('saved_restaurants')
      .select('id')
      .match({ restaurant_id: req.params.restaurantId, user_id: req.user.id })
      .single();
    res.json({ saved: !!data });
  } catch (error) { 
    res.json({ saved: false }); 
  }
});

router.get('/', async (req, res) => {
  try {
    const { type, price, cuisine, rating } = req.query;
    const { page, limit, offset } = getPaginationParams(req.query);

    let query = supabase
      .from('restaurants')
      .select('id, name, address, cover_image, food_types, cuisine, rating, rating_count, price_range, categories, verified, latitude, longitude, landmark_notes, photos', { count: 'exact' });

    if (type) {
      const types = type.split(',').map(t => t.trim());
      query = query.overlaps('categories', types);
    }

    if (price) {
      const prices = price.split(',').map(p => p.trim());
      query = query.in('price_range', prices);
    }

    if (cuisine) {
      const cuisines = cuisine.split(',').map(c => c.trim());
      query = query.overlaps('food_types', cuisines);
    }

    if (rating && !isNaN(parseFloat(rating))) {
      query = query.gte('rating', parseFloat(rating));
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await queryWithTimeout(query);

    if (error) throw error;

    const results = (data || []).map(restaurant => ({
      ...restaurant,
      cuisine: restaurant.food_types || restaurant.cuisine || []
    }));

    res.json({ 
      data: results,
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: count ? (offset + limit) < count : false
      }
    });

  } catch (error) {
    console.error('[API Error] Fetching restaurants:', error.message);
    const statusCode = error.message === 'Query timeout' ? 504 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    let userId = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.sub; // Supabase uses 'sub' for user ID
      } catch (e) {
        console.log('[Restaurant Detail] Guest mode: Invalid/expired token');
      }
    }

    const detailQuery = supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();
      
    const { data: restaurant, error } = await queryWithTimeout(detailQuery, 8000);

    if (error) return res.status(404).json({ error: 'Quán không tồn tại' });

    // 2. Check if saved (only if user is logged in)
    let is_saved = false;
    if (userId) {
      const { data: savedData } = await supabase
        .from('saved_restaurants')
        .select('id')
        .match({ restaurant_id: id, user_id: userId })
        .single();
      is_saved = !!savedData;
    }

    const reviewQuery = supabase
      .from('reviews')
      .select(`
        id, 
        rating, 
        content, 
        created_at,
        user:users (
          username, 
          avatar_url
        )
      `)
      .eq('restaurant_id', id)
      .order('created_at', { ascending: false })
      .limit(10);
      
    const { data: reviews } = await queryWithTimeout(reviewQuery, 5000).catch(() => ({ data: [] }));

    res.json({ 
      data: {
        ...restaurant,
        cuisine: restaurant.food_types || restaurant.cuisine || [], // Map for frontend
        top_reviews: reviews || [],
        is_saved: is_saved
      } 
    });
    
  } catch (error) {
    console.error('[API Error] Get restaurant detail:', error.message);
    res.status(error.message === 'Query timeout' ? 504 : 500).json({ error: error.message });
  }
});

router.get('/health/check', (req, res) => {
  res.json({ status: 'ok', service: 'restaurants-api' });
});

module.exports = router;
