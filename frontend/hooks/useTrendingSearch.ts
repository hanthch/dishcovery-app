/* =========================
   SEARCH POSTS / RESTAURANTS
========================= */
router.get('/search', async (req, res) => {
  const {
    q,
    hashtag,
    sort = 'new',
    page = 1,
    limit = 10,
  } = req.query;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let queryBuilder = supabase
    .from('posts')
    .select(`
      id,
      caption,
      images,
      created_at,
      location,
      user:users(id, username, avatar_url),
      restaurant:restaurants(
        id,
        name,
        address,
        google_maps_url,
        food_types,
        price_range,
        landmark_notes
      ),
      likes_count:post_likes(count),
      comments_count:post_comments(count)
    `);

  // 🔍 TEXT SEARCH
  if (q) {
    queryBuilder = queryBuilder.ilike('caption', `%${q}%`);
  }

  // #️⃣ HASHTAG SEARCH
  if (hashtag) {
    queryBuilder = queryBuilder.ilike('caption', `%#${hashtag}%`);
  }

  // 🔥 SORT
  if (sort === 'popular') {
    queryBuilder = queryBuilder.order('likes_count', {
      ascending: false,
      foreignTable: 'post_likes',
    });
  } else {
    queryBuilder = queryBuilder.order('created_at', {
      ascending: false,
    });
  }

  const { data, error } = await queryBuilder.range(from, to);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({
    data,
    page: Number(page),
    hasMore: data.length === Number(limit),
  });
});
