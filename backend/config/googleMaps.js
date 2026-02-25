/**
 * Google Maps URL helpers (FREE - no API key required)
 * These use google.com/maps public URLs that work on all devices
 * and open the native Maps app on mobile when installed.
 */

/**
 * Generate a Google Maps search URL for a restaurant
 * Opens the native Google Maps app on mobile (free, no API key)
 */
function buildGoogleMapsUrl(options = {}) {
  const { name, address, lat, lng } = options;

  if (lat && lng) {
    // Coordinate-based link — most precise
    const query = encodeURIComponent(name || `${lat},${lng}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=&center=${lat},${lng}`;
  }

  if (name || address) {
    const query = encodeURIComponent([name, address].filter(Boolean).join(', '));
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  return null;
}

/**
 * Generate a Google Maps directions URL
 * Destination can be lat/lng or a place name
 */
function buildDirectionsUrl(options = {}) {
  const { name, address, lat, lng } = options;

  let destination;
  if (lat && lng) {
    destination = `${lat},${lng}`;
  } else {
    destination = encodeURIComponent([name, address].filter(Boolean).join(', '));
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

/**
 * Ensure a restaurant has a google_maps_url
 * If not set, auto-generate from available fields
 */
function ensureGoogleMapsUrl(restaurant) {
  if (!restaurant) return restaurant;

  if (restaurant.google_maps_url) return restaurant;

  const url = buildGoogleMapsUrl({
    name: restaurant.name,
    address: restaurant.address,
    lat: restaurant.latitude,
    lng: restaurant.longitude,
  });

  return { ...restaurant, google_maps_url: url };
}

module.exports = {
  buildGoogleMapsUrl,
  buildDirectionsUrl,
  ensureGoogleMapsUrl,
};