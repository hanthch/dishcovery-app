const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');


router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.json({ data: [] });
    }

    const searchTerm = q.trim();
    const results = [];

    try {
      const { data: dbRestaurants, error: dbError } = await supabase
        .from('restaurants')
        .select(`
          id,
          name,
          address,
          lat,
          lng,
          google_maps_url,
          food_types,
          categories,
          price_range,
          rating,
          verified
        `)
        .or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
        .limit(5);

      if (!dbError && dbRestaurants) {
        // Add database restaurants to results
        dbRestaurants.forEach(restaurant => {
          results.push({
            type: 'restaurant',
            id: restaurant.id,
            name: restaurant.name,
            address: restaurant.address,
            lat: restaurant.lat,
            lng: restaurant.lng,
            google_maps_url: restaurant.google_maps_url,
            verified: restaurant.verified,
            // Additional metadata
            food_types: restaurant.food_types,
            price_range: restaurant.price_range,
            rating: restaurant.rating,
          });
        });
      }
    } catch (dbError) {
      console.error('[PlaceSearch] Database search error:', dbError);
    }

    // 2️⃣ SEARCH OPENSTREETMAP FOR NEW LOCATIONS
    // This allows users to tag places that aren't in the database yet
    try {
      const osmResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: searchTerm,
          format: 'json',
          limit: 5,
          // Bias towards restaurants, cafes, etc.
          'accept-language': 'vi,en',
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'DishcoveryApp/1.0', // Required by OSM
        },
        timeout: 5000,
      });

      if (osmResponse.data && Array.isArray(osmResponse.data)) {
        osmResponse.data.forEach(place => {
          // Only add if not already in database
          const existsInDb = results.some(r => 
            r.type === 'restaurant' && 
            r.name.toLowerCase() === place.display_name.toLowerCase()
          );

          if (!existsInDb) {
            results.push({
              type: 'location', // Not a verified restaurant
              place_id: place.place_id,
              name: place.display_name,
              address: place.display_name,
              lat: parseFloat(place.lat),
              lng: parseFloat(place.lon),
              osm_type: place.type,
              osm_class: place.class,
            });
          }
        });
      }
    } catch (osmError) {
      console.error('[PlaceSearch] OpenStreetMap search error:', osmError);
      // Don't fail the entire request if OSM is down
    }

    // Sort: Database restaurants first, then OSM locations
    results.sort((a, b) => {
      if (a.type === 'restaurant' && b.type !== 'restaurant') return -1;
      if (a.type !== 'restaurant' && b.type === 'restaurant') return 1;
      return 0;
    });

    res.json({ data: results });
  } catch (error) {
    console.error('[PlaceSearch] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Place not found' });
    }

    res.json({ data });
  } catch (error) {
    console.error('[PlaceSearch] Get place error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { q, filter = 'newest', type = 'all' } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const searchTerm = q.trim();
    const results = [];

    if (type === 'all' || type === 'post') {
      try {
        // Determine sort order based on filter
        let postQuery = supabase
          .from('posts')
          .select(`
            id,
            caption,
            images,
            created_at,
            user:users(id, username, avatar_url),
            restaurant:restaurants(id, name, address, google_maps_url),
            likes_count:post_likes(count),
            comments_count:post_comments(count)
          `)
          .or(`caption.ilike.%${searchTerm}%,restaurant.name.ilike.%${searchTerm}%`);

        // Apply sorting
        if (filter === 'popular') {
          postQuery = postQuery.order('likes_count', { 
            ascending: false,
            foreignTable: 'post_likes' 
          });
        } else {
          postQuery = postQuery.order('created_at', { ascending: false });
        }

        const { data: posts, error: postsError } = await postQuery.limit(20);

        if (!postsError && posts) {
          posts.forEach((p) => {
            results.push({
              type: 'post',
              id: p.id,
              title: p.caption || 'Bài viết',
              subtitle: p.restaurant?.name || 'Local Spot',
              image: p.images?.[0] || null,
              data: p,
            });
          });
        }
      } catch (error) {
        console.error('[Search] Posts error:', error);
      }
    }

    if (type === 'all' || type === 'restaurant') {
      try {
        const { data: restaurants, error: restaurantsError } = await supabase
          .from('restaurants')
          .select('*')
          .or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,landmark_notes.ilike.%${searchTerm}%,food_types.cs.{${searchTerm}}`)
          .order('posts_count', { ascending: false })
          .limit(15);

        if (!restaurantsError && restaurants) {
          restaurants.forEach((r) => {
            results.push({
              type: 'restaurant',
              id: r.id,
              title: r.name,
              subtitle: r.address,
              image: r.cover_image || r.photos?.[0] || null,
              landmark: r.landmark_notes,
              data: r,
            });
          });
        }
      } catch (error) {
        console.error('[Search] Restaurants error:', error);
      }
    }

   
    if (type === 'all' || type === 'user') {
      try {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, username, avatar_url, bio, followers_count, posts_count')
          .or(`username.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`)
          .order('followers_count', { ascending: false })
          .limit(10);

        if (!usersError && users) {
          users.forEach((u) => {
            results.push({
              type: 'user',
              id: u.id,
              title: u.username,
              subtitle: `${u.followers_count || 0} followers`,
              image: u.avatar_url,
              data: u,
            });
          });
        }
      } catch (error) {
        console.error('[Search] Users error:', error);
      }
    }

    if (type === 'all') {
      // Interleave results for better UX
      // Show mix of posts, restaurants, and users
      results.sort((a, b) => {
        // Posts first if popular filter
        if (filter === 'popular') {
          if (a.type === 'post' && b.type !== 'post') return -1;
          if (a.type !== 'post' && b.type === 'post') return 1;
        }
        
        return 0;
      });
    }

    res.json({ 
      data: results,
      count: results.length,
      query: searchTerm,
      filter,
      type,
    });
  } catch (error) {
    console.error('[Search] Error:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/hashtag/:tag', async (req, res) => {
  try {
    const { tag } = req.params;
    const { page = 1, limit = 20, filter = 'newest' } = req.query;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('posts')
      .select(`
        id,
        caption,
        images,
        created_at,
        user:users(id, username, avatar_url),
        restaurant:restaurants(id, name, address),
        likes_count:post_likes(count),
        comments_count:post_comments(count)
      `)
      .ilike('caption', `%#${tag}%`);

    if (filter === 'popular') {
      query = query.order('likes_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      data,
      hashtag: tag,
      page: Number(page),
      hasMore: data.length === Number(limit),
    });
  } catch (error) {
    console.error('[Search] Hashtag error:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/trending-hashtags', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    res.json({
      data: [],
      message: 'Trending hashtags coming soon',
    });
  } catch (error) {
    console.error('[Search] Trending hashtags error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;