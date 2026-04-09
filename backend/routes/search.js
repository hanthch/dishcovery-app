const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { optionalAuth } = require('../middleware/auth');
const { ensureGoogleMapsUrl } = require('../config/googleMaps');

// ============================================================
// GET /search
// Universal federated search: restaurants + posts + users
//
// Returns: { data: SearchResult[] }
// SearchResult shape:
//   { type: 'post'|'restaurant'|'user', id, title, subtitle, image, landmark, data }
//
// Called by:
//   - apiService.universalSearch()    → TrendingSearchScreen (mixed results)
//   - apiService.searchRestaurants()  → RestaurantSearchScreen (restaurants only)
// ============================================================
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { q, limit = 30, sort = 'new' } = req.query;

    // BUG FIX #6: return consistent { data: [] } envelope, not bare []
    if (!q || !q.trim()) {
      return res.json({ data: [] });
    }

    const searchTerm = q.trim();
    const limitNum = Math.min(parseInt(limit) || 30, 60);
    const perType = Math.ceil(limitNum / 3);

    // Run all three searches in parallel
    const [restaurantRes, postRes, userRes] = await Promise.all([

      // --- RESTAURANTS ---
      supabase
        .from('restaurants')
        .select(`
          id, name, address, cover_image, photos, food_types,
          rating, price_range, verified, status, top_rank_this_week,
          latitude, longitude, google_maps_url,
          landmark_notes_data:landmark_notes(id, text, verified)
        `)
        .or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
        .order('rating', { ascending: false })
        .limit(perType),

      // --- POSTS ---
      supabase
        .from('posts')
        .select(`
          id, caption, images, likes_count, comments_count, created_at,
          user:profiles(id, username, avatar_url),
          restaurant:restaurants(id, name, address)
        `)
        .ilike('caption', `%${searchTerm}%`)
        .order(sort === 'popular' ? 'likes_count' : 'created_at', { ascending: false })
        .limit(perType),

      // --- USERS ---
      supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, followers_count, posts_count, bio')
        .ilike('username', `%${searchTerm}%`)
        .limit(perType),
    ]);

    const results = [];

    // ---- RESTAURANT RESULTS ----
    if (!restaurantRes.error && restaurantRes.data) {
      restaurantRes.data.forEach(r => {
        const landmarkNote = r.landmark_notes_data?.[0]?.text || null;
        const restaurantData = ensureGoogleMapsUrl({
          id: r.id,
          name: r.name,
          address: r.address || null,
          latitude: r.latitude ? parseFloat(r.latitude) : null,
          longitude: r.longitude ? parseFloat(r.longitude) : null,
          google_maps_url: r.google_maps_url || null,
          food_types: r.food_types || [],
          cuisine: r.food_types || [],
          cover_image: r.cover_image || null,
          image_url: r.cover_image || null,
          photos: r.photos || [],
          images: r.photos || [],
          rating: r.rating ? parseFloat(r.rating) : null,
          price_range: r.price_range || null,
          verified: r.verified || false,
          status: r.status || 'unverified',
          top_rank_this_week: r.top_rank_this_week || null,
          landmark_notes: r.landmark_notes_data?.length > 0 ? r.landmark_notes_data : null,
        });

        results.push({
          type: 'restaurant',
          id: r.id,
          title: r.name,
          subtitle: r.address || '',
          image: r.cover_image || r.photos?.[0] || null,
          landmark: landmarkNote,
          data: restaurantData,
        });
      });
    } else if (restaurantRes.error) {
      console.error('[Search] Restaurant query error:', restaurantRes.error);
    }

    // ---- POST RESULTS ----
    if (!postRes.error && postRes.data) {
      postRes.data.forEach(p => {
        const imageUrl = (Array.isArray(p.images) ? p.images[0] : null) || null;
        const postData = {
          id: p.id,
          caption: p.caption || '',
          image_url: imageUrl,
          images: p.images || [],
          likes_count: p.likes_count || 0,
          comments_count: p.comments_count || 0,
          created_at: p.created_at,
          user: p.user || { id: '', username: 'unknown', avatar_url: '' },
          restaurant: p.restaurant || null,
        };

        results.push({
          type: 'post',
          id: p.id,
          title: p.caption || 'Bài viết',
          subtitle: p.user?.username ? `@${p.user.username}` : '',
          image: imageUrl,
          data: postData,
        });
      });
    } else if (postRes.error) {
      console.error('[Search] Post query error:', postRes.error);
    }

    // ---- USER RESULTS ----
    if (!userRes.error && userRes.data) {
      userRes.data.forEach(u => {
        const userData = {
          id: u.id,
          username: u.username,
          full_name: u.full_name || '',
          avatar_url: u.avatar_url || null,
          followers_count: u.followers_count || 0,
          posts_count: u.posts_count || 0,
          bio: u.bio || null,
        };

        results.push({
          type: 'user',
          id: u.id,
          title: u.username,
          subtitle: `${u.followers_count || 0} followers`,
          image: u.avatar_url,
          data: userData,
        });
      });
    } else if (userRes.error) {
      console.error('[Search] User query error:', userRes.error);
    }

    // Sort: restaurants first, posts second, users third
    const typeOrder = { restaurant: 0, post: 1, user: 2 };
    results.sort((a, b) => (typeOrder[a.type] ?? 3) - (typeOrder[b.type] ?? 3));

    res.json({ data: results });
  } catch (error) {
    console.error('[Search] GET / error:', error);
    next(error);
  }
});

module.exports = router;