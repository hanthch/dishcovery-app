const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');

router.get('/dashboard', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [
      { count: totalUsers },
      { count: totalPosts },
      { count: totalRestaurants },
      { count: pendingRestaurants },
      { count: reportedPosts },
      { count: newUsersToday },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('restaurants').select('*', { count: 'exact', head: true }),
      supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [{ data: recentUsers }, { data: recentPosts }] = await Promise.all([
      supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true }),
      supabase
        .from('posts')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true }),
    ]);

    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      chartData.push({
        date:  dateStr,
        label: d.toLocaleDateString('vi-VN', { weekday: 'short' }),
        users: (recentUsers || []).filter(u => u.created_at.startsWith(dateStr)).length,
        posts: (recentPosts || []).filter(p => p.created_at.startsWith(dateStr)).length,
      });
    }

    res.json({
      data: {
        stats: {
          totalUsers:         totalUsers         || 0,
          totalPosts:         totalPosts         || 0,
          totalRestaurants:   totalRestaurants   || 0,
          pendingRestaurants: pendingRestaurants || 0,
          reportedPosts:      reportedPosts      || 0,
          newUsersToday:      newUsersToday      || 0,
        },
        chartData,
      },
    });
  } catch (error) {
    console.error('[Admin] GET /dashboard error:', error);
    next(error);
  }
});

router.get('/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const page    = parseInt(req.query.page)  || 1;
    const limit   = parseInt(req.query.limit) || 20;
    const offset  = (page - 1) * limit;
    const search  = req.query.search  || '';
    const roleFilter = req.query.role || '';

    let query = supabase
      .from('profiles')
      .select(
        'id, username, full_name, email, avatar_url, bio, role, is_banned, ban_reason, ' +
        'followers_count, following_count, posts_count, scout_points, contributions, badges, created_at, updated_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (roleFilter) {
      query = query.eq('role', roleFilter);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      data:       data || [],
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (error) {
    console.error('[Admin] GET /users error:', error);
    next(error);
  }
});

router.get('/users/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!profile) return res.status(404).json({ error: 'User not found' });

    const { count: postsCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id);

    res.json({ data: { ...profile, posts_count: postsCount || profile.posts_count || 0 } });
  } catch (error) {
    console.error('[Admin] GET /users/:id error:', error);
    next(error);
  }
});

router.patch('/users/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, is_banned, ban_reason } = req.body;

    if (id === req.userId) {
      return res.status(400).json({ error: 'Cannot modify your own account' });
    }

    const { data: targetProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!targetProfile) return res.status(404).json({ error: 'User not found' });

    if (targetProfile.role === 'admin') {
      return res.status(403).json({
        error:   'Forbidden',
        message: 'Cannot modify another admin account',
      });
    }

    const updates = {};
    if (role !== undefined) {
      if (!['user', 'admin', 'moderator'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be user, admin, or moderator' });
      }
      updates.role = role;
    }
    if (is_banned !== undefined) {
      updates.is_banned   = is_banned;
      updates.ban_reason  = is_banned ? (ban_reason || 'Violated community guidelines') : null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ data, message: 'User updated successfully' });
  } catch (error) {
    console.error('[Admin] PATCH /users/:id error:', error);
    next(error);
  }
});

router.delete('/users/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const { data: targetProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!targetProfile) return res.status(404).json({ error: 'User not found' });

    if (targetProfile.role === 'admin') {
      return res.status(403).json({
        error:   'Forbidden',
        message: 'Cannot delete another admin account',
      });
    }

    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) throw authError;

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('[Admin] DELETE /users/:id error:', error);
    next(error);
  }
});

router.get('/posts', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const page    = parseInt(req.query.page)  || 1;
    const limit   = parseInt(req.query.limit) || 20;
    const offset  = (page - 1) * limit;
    const search  = req.query.search  || '';
    const flagged = req.query.flagged === 'true';

    let query = supabase
      .from('posts')
      .select(`
        id, caption, images, likes_count, comments_count, saves_count,
        is_trending, is_flagged, flag_reason, created_at, updated_at,
        user:profiles(id, username, avatar_url),
        restaurant:restaurants(id, name, address)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search)  query = query.ilike('caption', `%${search}%`);
    if (flagged) query = query.eq('is_flagged', true);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      data:       data || [],
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (error) {
    console.error('[Admin] GET /posts error:', error);
    next(error);
  }
});

router.delete('/posts/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) throw error;

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('[Admin] DELETE /posts/:id error:', error);
    next(error);
  }
});

router.patch('/posts/:id/flag', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_flagged, flag_reason } = req.body;

    if (typeof is_flagged !== 'boolean') {
      return res.status(400).json({ error: 'is_flagged must be a boolean' });
    }

    const { data, error } = await supabase
      .from('posts')
      .update({ is_flagged, flag_reason: is_flagged ? (flag_reason || 'Admin flagged') : null })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ data, message: `Post ${is_flagged ? 'flagged' : 'unflagged'} successfully` });
  } catch (error) {
    console.error('[Admin] PATCH /posts/:id/flag error:', error);
    next(error);
  }
});

router.get('/restaurants', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const page    = parseInt(req.query.page)  || 1;
    const limit   = parseInt(req.query.limit) || 20;
    const offset  = (page - 1) * limit;
    const search  = req.query.search  || '';
    const status  = req.query.status  || '';

    let query = supabase
      .from('restaurants')
      .select(
        'id, name, address, status, verified, food_types, rating, rating_count, posts_count, ' +
        'cover_image, price_range, opening_hours, created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) query = query.ilike('name', `%${search}%`);
    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      data:       data || [],
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (error) {
    console.error('[Admin] GET /restaurants error:', error);
    next(error);
  }
});

router.patch('/restaurants/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, verified, name, address, food_types, price_range, opening_hours, cover_image } = req.body;

    const updates = {};
    if (status !== undefined) {
      if (!['pending', 'active', 'rejected', 'closed', 'unverified'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updates.status = status;
      if (status === 'active')   updates.verified = true;
      if (status === 'rejected') updates.verified = false;
      if (status === 'closed')   { /* keep existing verified value */ }
    }
    if (verified      !== undefined) updates.verified      = verified;
    if (name          !== undefined) updates.name          = name;
    if (address       !== undefined) updates.address       = address;
    if (food_types    !== undefined) updates.food_types    = food_types;
    if (price_range   !== undefined) updates.price_range   = price_range;
    if (opening_hours !== undefined) updates.opening_hours = opening_hours;
    if (cover_image   !== undefined) updates.cover_image   = cover_image;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { data, error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ data, message: 'Restaurant updated successfully' });
  } catch (error) {
    console.error('[Admin] PATCH /restaurants/:id error:', error);
    next(error);
  }
});

router.delete('/restaurants/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('restaurants').delete().eq('id', id);
    if (error) throw error;

    res.json({ message: 'Restaurant deleted successfully' });
  } catch (error) {
    console.error('[Admin] DELETE /restaurants/:id error:', error);
    next(error);
  }
});

router.get('/reports', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status || 'pending';

    if (!['pending', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }

    const { data, error, count } = await supabase
      .from('reports')
      .select(`
        id, type, reason, status, resolution_note, created_at,
        reporter_id, post_id, target_user_id, restaurant_id,
        reporter:profiles!reporter_id(id, username, avatar_url),
        post:posts(id, caption, images),
        target_user:profiles!target_user_id(id, username, avatar_url),
        restaurant:restaurants!restaurant_id(id, name, address)
      `, { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      if (error.code === '42P01') {
        return res.json({ data: [], pagination: { page, limit, total: 0, pages: 0 } });
      }
      throw error;
    }

    res.json({
      data:       data || [],
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (error) {
    console.error('[Admin] GET /reports error:', error);
    next(error);
  }
});

router.patch('/reports/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resolution_note } = req.body;

    if (!['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Status must be resolved or dismissed' });
    }

    const { data, error } = await supabase
      .from('reports')
      .update({
        status,
        resolution_note: resolution_note || null,
        resolved_by:     req.userId,
        resolved_at:     new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ data, message: `Report ${status} successfully` });
  } catch (error) {
    console.error('[Admin] PATCH /reports/:id error:', error);
    next(error);
  }
});

router.get('/me', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, role, scout_points, created_at')
      .eq('id', req.userId)
      .maybeSingle();

    if (error) throw error;

    res.json({ data: { ...profile, email: req.userEmail } });
  } catch (error) {
    console.error('[Admin] GET /me error:', error);
    next(error);
  }
});

module.exports = router;