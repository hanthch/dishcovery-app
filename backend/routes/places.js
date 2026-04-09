const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { buildGoogleMapsUrl } = require('../config/googleMaps');

// ============================================================
// GET /places/search
// Used by create-post-modal.tsx to power the location-tag picker.
//
// LOGIC:
//   1. Search our restaurant DB for name/address matches
//   2. Return matches as { type: 'restaurant', ... } — user can
//      tap to tag an EXISTING restaurant (no new DB row needed)
//   3. Always append { type: 'new_place', name: searchTerm } as
//      the LAST item — tapping it opens NewPlaceFormModal so the
//      user can create a brand-new restaurant entry.
//
// This means:
//   - If DB has matches  → existing options first, "Add new" at bottom
//   - If DB has NO match → only the "Add new" option is shown
//   - User always has a path forward regardless of what's in the DB
//
// Response shape:
//   { data: Array<RestaurantResult | NewPlaceResult> }
//
//   RestaurantResult: { type:'restaurant', id, name, address, lat, lng,
//                       google_maps_url, image, food_types, rating, verified }
//   NewPlaceResult:   { type:'new_place', name, address:'', lat:null, lng:null }
// ============================================================
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.json({ data: [] });
    }

    const searchTerm = q.trim();

    // ---- Search existing restaurants in DB ----
    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        id, name, address,
        latitude, longitude, google_maps_url,
        cover_image, food_types, rating, verified
      `)
      .or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
      .order('rating', { ascending: false })
      .limit(10);

    if (error) throw error;

    // ---- Map DB rows to RestaurantResult shape ----
    const dbResults = (data || []).map(r => {
      const lat = r.latitude ? parseFloat(r.latitude) : null;
      const lng = r.longitude ? parseFloat(r.longitude) : null;

      return {
        type: 'restaurant',
        id: r.id,
        name: r.name,
        address: r.address || '',
        lat,
        lng,
        google_maps_url: r.google_maps_url || buildGoogleMapsUrl({
          name: r.name,
          address: r.address,
          lat,
          lng,
        }),
        image: r.cover_image || null,
        food_types: r.food_types || [],
        rating: r.rating ? parseFloat(r.rating) : null,
        verified: r.verified || false,
      };
    });

    // ---- Always append "Add new place" sentinel at the bottom ----
    // Frontend checks type === 'new_place' and opens NewPlaceFormModal
    // with `name` pre-filled from what the user typed.
    const newPlaceSentinel = {
      type: 'new_place',
      name: searchTerm,   // pre-fills the name field in NewPlaceFormModal
      address: '',
      lat: null,
      lng: null,
    };

    res.json({ data: [...dbResults, newPlaceSentinel] });
  } catch (error) {
    console.error('[Places] GET /search error:', error);
    next(error);
  }
});

// ============================================================
// GET /places/check-duplicate
// Called by NewPlaceFormModal on name field blur to warn the user
// if a near-identical restaurant already exists in the DB.
//
// Query params: name (required), address (optional)
//
// Response: { hasDuplicates: boolean, suggestions: PlaceSearchResult[] }
//   hasDuplicates=true  → UI shows warning banner with suggestion rows
//   hasDuplicates=false → no banner, form proceeds normally
//
// Non-fatal: frontend falls back to { hasDuplicates: false } on error.
// ============================================================
router.get('/check-duplicate', async (req, res, next) => {
  try {
    const { name, address } = req.query;

    if (!name || !name.trim()) {
      return res.json({ hasDuplicates: false, suggestions: [] });
    }

    const searchTerm = name.trim();

    // Fuzzy name match — ilike gives partial match
    let query = supabase
      .from('restaurants')
      .select(`
        id, name, address,
        latitude, longitude, google_maps_url,
        cover_image, food_types, rating, verified,
        status, top_rank_this_week, posts_count
      `)
      .ilike('name', `%${searchTerm}%`)
      .order('rating', { ascending: false })
      .limit(3);

    // Narrow further by address if provided
    if (address && address.trim()) {
      query = query.ilike('address', `%${address.trim()}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const suggestions = (data || []).map(r => {
      const lat = r.latitude ? parseFloat(r.latitude) : null;
      const lng = r.longitude ? parseFloat(r.longitude) : null;
      return {
        type: 'restaurant',
        id: r.id,
        name: r.name,
        address: r.address || '',
        lat,
        lng,
        google_maps_url: r.google_maps_url || buildGoogleMapsUrl({ name: r.name, address: r.address, lat, lng }),
        image: r.cover_image || null,
        food_types: r.food_types || [],
        rating: r.rating ? parseFloat(r.rating) : null,
        verified: r.verified || false,
        status: r.status || 'unverified',
        top_rank_this_week: r.top_rank_this_week || null,
        posts_count: r.posts_count || 0,
      };
    });

    res.json({
      hasDuplicates: suggestions.length > 0,
      suggestions,
    });
  } catch (error) {
    console.error('[Places] GET /check-duplicate error:', error);
    next(error);
  }
});

module.exports = router;