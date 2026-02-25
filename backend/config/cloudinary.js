const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dishcovery';

const TRANSFORMATIONS = {
  thumbnail:  'w_200,h_150,c_fill,q_auto,f_auto',
  card:       'w_400,h_300,c_fill,q_auto,f_auto',
  detail:     'w_800,h_600,c_fill,q_auto:good,f_auto',
  fullscreen: 'w_1200,h_900,c_fit,q_auto:best,f_auto',
};

/**
 * Build a Cloudinary delivery URL from a public_id.
 * If publicId is already a full URL, returns it unchanged.
 *
 * @param {string} publicId  - Cloudinary public_id OR an existing http URL
 * @param {'thumbnail'|'card'|'detail'|'fullscreen'} size
 * @returns {string|null}
 */
function buildCloudinaryUrl(publicId, size = 'card') {
  if (!publicId) return null;
  if (publicId.startsWith('http')) return publicId;

  const transformation = TRANSFORMATIONS[size] || TRANSFORMATIONS.card;
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformation}/${publicId}`;
}

/**
 * Extract a Cloudinary public_id from a full Cloudinary URL.
 * Returns null for non-Cloudinary URLs or invalid input.
 *
 * @param {string} cloudinaryUrl
 * @returns {string|null}
 */
function extractPublicId(cloudinaryUrl) {
  if (!cloudinaryUrl) return null;
  try {
    const url  = new URL(cloudinaryUrl);
    const parts = url.pathname.split('/');
    const uploadIndex = parts.findIndex(p => p === 'upload');
    if (uploadIndex === -1) return null;
    const afterUpload = parts.slice(uploadIndex + 1);
    const publicIdParts = afterUpload.filter(p => !p.includes(','));
    return publicIdParts.join('/').replace(/\.[^.]+$/, '');
  } catch {
    return null;
  }
}

/**
 * Normalize a restaurant object's image fields.
 * Ensures cover_image, image_url (alias), photos, images (alias)
 * and has_images are all present and consistent.
 *
 * Called by restaurants.js on every outbound restaurant row so the
 * frontend always receives a stable image shape regardless of what
 * is stored in the DB.
 *
 * @param {object} restaurant  - raw Supabase row or partial object
 * @returns {object}
 */
function normalizeRestaurantImages(restaurant) {
  if (!restaurant) return restaurant;

  const photos = Array.isArray(restaurant.photos) ? restaurant.photos : [];

  return {
    ...restaurant,
    cover_image: restaurant.cover_image || null,
    image_url:   restaurant.cover_image || null,   // frontend alias
    photos,
    images:      photos,                            // frontend alias
    has_images:  !!(restaurant.cover_image || photos.length > 0),
  };
}

module.exports = {
  buildCloudinaryUrl,
  extractPublicId,
  normalizeRestaurantImages,
  TRANSFORMATIONS,
};