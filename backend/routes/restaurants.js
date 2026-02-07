const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const supabase = require('../config/supabase');

/* ======================================================
   CONFIGURATION
====================================================== */
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
// Tăng lên 15 giây để đảm bảo Supabase có đủ thời gian xử lý các query phức tạp (overlaps/or)
const QUERY_TIMEOUT = 15000; 

/* ======================================================
   HELPER FUNCTIONS
====================================================== */

/**
 * Cải tiến hàm timeout: Đảm bảo clearTimer để tránh rò rỉ bộ nhớ
 */
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

/* ======================================================
   RESTAURANTS HOME with FILTERS
====================================================== */
router.get('/', async (req, res) => {
  try {
    const { type, price, cuisine, rating } = req.query;
    const { page, limit, offset } = getPaginationParams(req.query);

    // Tối ưu: Chỉ select các field cần thiết cho màn hình danh sách
    let query = supabase
      .from('restaurants')
      .select('id, name, address, cover_image, image_url, cuisine, rating, rating_count, price_range, categories, food_types, verified, latitude, longitude', { count: 'exact' });

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
    console.error('[API Error] Fetching restaurants:', error.message);
    const statusCode = error.message === 'Query timeout' ? 504 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

/* ======================================================
   CATEGORY BROWSING
====================================================== */
router.get('/category/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { page, limit, offset } = getPaginationParams(req.query);

    const categoryMap = {
      'via-he': 'street-food',
      'nup-hem': 'hidden-gem',
      'chay': 'vegetarian',
      'sang-trong': 'luxury',
      'binh-dan': 'student-friendly',
      'an-khuya': 'late-night',
      'fancy': 'luxury',
      'vegan': 'vegetarian',
      'breakfast': 'breakfast'
    };

    const mappedValue = categoryMap[slug] || slug;

    const query = supabase
      .from('restaurants')
      .select('id, name, address, image_url, cover_image, rating, categories, food_types', { count: 'exact' })
      .or(`categories.cs.{${mappedValue}},food_types.cs.{${mappedValue}}`)
      .order('rating', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await queryWithTimeout(query);

    if (error) throw error;

    res.json({ 
      data: data || [],
      pagination: { total: count || 0, page, limit }
    });

  } catch (error) {
    res.status(error.message === 'Query timeout' ? 504 : 500).json({ error: error.message });
  }
});

/* ======================================================
   TOP 10 RESTAURANTS
====================================================== */
router.get('/top10', async (req, res) => {
  try {
    const query = supabase
      .from('restaurants')
      .select('id, name, image_url, cover_image, rating, posts_count, cuisine')
      .order('posts_count', { ascending: false })
      .limit(10);

    // Top 10 thường nhanh nên để 5s là đủ
    const { data, error } = await queryWithTimeout(query, 5000);

    if (error) throw error;

    const rankedData = (data || []).map((item, index) => ({
      ...item,
      rank: index + 1,
      top_rank_this_week: index + 1
    }));

    res.json({ data: rankedData });
  } catch (error) {
    res.status(error.message === 'Query timeout' ? 504 : 500).json({ error: error.message, data: [] });
  }
});

/* ======================================================
   RESTAURANT DETAIL
====================================================== */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // DETAIL cần đầy đủ thông tin nên dùng select('*') nhưng vẫn bọc timeout
    const detailQuery = supabase.from('restaurants').select('*').eq('id', id).single();
    const { data: restaurant, error } = await queryWithTimeout(detailQuery, 8000);

    if (error) return res.status(404).json({ error: 'Quán không tồn tại' });

    // Review query
    const reviewQuery = supabase
      .from('reviews')
      .select(`id, rating, content, created_at, user:users (username, avatar_url)`)
      .eq('restaurant_id', id)
      .order('created_at', { ascending: false })
      .limit(10);
      
    const { data: reviews } = await queryWithTimeout(reviewQuery, 5000).catch(() => ({ data: [] }));

    res.json({ 
      data: {
        ...restaurant,
        top_reviews: reviews || []
      } 
    });
  } catch (error) {
    res.status(error.message === 'Query timeout' ? 504 : 500).json({ error: error.message });
  }
});

/* ======================================================
   RESTAURANT SEARCH
====================================================== */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ data: [] });

    const searchQuery = supabase
      .from('restaurants')
      .select('id, name, address, image_url, rating, cuisine')
      .ilike('name', `%${q}%`)
      .limit(15);

    const { data, error } = await queryWithTimeout(searchQuery, 7000);

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    res.status(error.message === 'Query timeout' ? 504 : 500).json({ error: error.message });
  }
});

/* ======================================================
   SAVE/UNSAVE & LANDMARK NOTES (Giữ nguyên logic của bạn)
====================================================== */
router.post('/:restaurantId/save', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('saved_restaurants')
      .upsert({ restaurant_id: req.params.restaurantId, user_id: req.user.id });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/:restaurantId/unsave', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('saved_restaurants')
      .delete()
      .match({ restaurant_id: req.params.restaurantId, user_id: req.user.id });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:restaurantId/is-saved', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('saved_restaurants')
      .select('id')
      .match({ restaurant_id: req.params.restaurantId, user_id: req.user.id })
      .single();
    res.json({ saved: !!data });
  } catch (error) { res.json({ saved: false }); }
});

router.get('/health/check', (req, res) => {
  res.json({ status: 'ok', service: 'restaurants-api' });
});

module.exports = router;

module.exports = router;
