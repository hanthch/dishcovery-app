
export const IMAGE_CONFIG = {
  // Cloudinary base URL (if you're using Cloudinary)
  CLOUDINARY_BASE_URL: 'https://res.cloudinary.com/YOUR_CLOUD_NAME',
  
  // Image transformation presets for different use cases
  TRANSFORMATIONS: {
    thumbnail: 'w_200,h_150,c_fill,q_auto,f_auto',
    card: 'w_400,h_300,c_fill,q_auto,f_auto',
    detail: 'w_800,h_600,c_fill,q_auto:good,f_auto',
    fullscreen: 'w_1200,h_900,c_fit,q_auto:best,f_auto',
  },
  
  // Fallback images for different scenarios
  FALLBACK: {
    restaurant: 'https://via.placeholder.com/400x300/FFE5E5/FF8C42?text=No+Image',
    profile: 'https://via.placeholder.com/100x100/E5E5E5/666666?text=User',
    food: 'https://via.placeholder.com/400x300/FFF5E5/FF8C42?text=No+Photo',
  },
  
  // Maximum file sizes (in bytes)
  MAX_UPLOAD_SIZE: 5 * 1024 * 1024, // 5MB
  
  // Allowed image formats
  ALLOWED_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
};

// ============================================
// IMAGE URL PROCESSING
// ============================================

/**
 * Get optimized image URL based on usage context
 * 
 * @param {string | string[] | null | undefined} imageSource - Image URL(s) from database
 * @param {'thumbnail' | 'card' | 'detail' | 'fullscreen'} size - Image size preset
 * @returns {string} Optimized image URL
 */
export function getOptimizedImageUrl(
  imageSource: string | string[] | null | undefined,
  size: 'thumbnail' | 'card' | 'detail' | 'fullscreen' = 'card'
): string {
  // Handle null/undefined
  if (!imageSource) {
    return IMAGE_CONFIG.FALLBACK.restaurant;
  }

  // Handle array of images (take first one)
  const imageUrl = Array.isArray(imageSource) ? imageSource[0] : imageSource;

  // Handle empty string
  if (!imageUrl || imageUrl.trim() === '') {
    return IMAGE_CONFIG.FALLBACK.restaurant;
  }

  // If it's already a Cloudinary URL, apply transformations
  if (imageUrl.includes('cloudinary.com')) {
    return applyCloudinaryTransformation(imageUrl, size);
  }

  // If it's a Picsum URL (for testing), return as-is
  if (imageUrl.includes('picsum.photos')) {
    return imageUrl;
  }

  // If it's a placeholder, return as-is
  if (imageUrl.includes('placeholder.com')) {
    return imageUrl;
  }

  // If it's a relative path, construct full URL
  if (imageUrl.startsWith('/')) {
    // This would be your CDN or server URL
    const BASE_MEDIA_URL = process.env.EXPO_PUBLIC_MEDIA_URL || 'https://your-cdn.com';
    return `${BASE_MEDIA_URL}${imageUrl}`;
  }

  // Return as-is if it's a full valid URL
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Fallback for any other case
  return IMAGE_CONFIG.FALLBACK.restaurant;
}

/**
 * Apply Cloudinary transformations to optimize images
 */
function applyCloudinaryTransformation(
  cloudinaryUrl: string,
  size: 'thumbnail' | 'card' | 'detail' | 'fullscreen'
): string {
  try {
    const url = new URL(cloudinaryUrl);
    const pathParts = url.pathname.split('/');
    
    // Find where to insert transformation
    const uploadIndex = pathParts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1) {
      return cloudinaryUrl; // Not a standard Cloudinary URL
    }

    // Insert transformation after 'upload'
    const transformation = IMAGE_CONFIG.TRANSFORMATIONS[size];
    pathParts.splice(uploadIndex + 1, 0, transformation);
    
    url.pathname = pathParts.join('/');
    return url.toString();
  } catch (error) {
    console.error('[ImageUtil] Failed to transform Cloudinary URL:', error);
    return cloudinaryUrl; // Return original if transformation fails
  }
}

/**
 * Get multiple image URLs from array
 * 
 * @param {string[] | null | undefined} images - Array of image URLs
 * @param {number} limit - Maximum number of images to return
 * @param {'thumbnail' | 'card' | 'detail' | 'fullscreen'} size - Image size preset
 * @returns {string[]} Array of optimized image URLs
 */
export function getImageArray(
  images: string[] | null | undefined,
  limit: number = 10,
  size: 'thumbnail' | 'card' | 'detail' | 'fullscreen' = 'card'
): string[] {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return [IMAGE_CONFIG.FALLBACK.restaurant];
  }

  return images
    .filter(img => img && img.trim() !== '')
    .slice(0, limit)
    .map(img => getOptimizedImageUrl(img, size));
}

/**
 * Get restaurant cover image with proper fallback
 */
export function getRestaurantCoverImage(restaurant: {
  cover_image?: string;
  image_url?: string;
  photos?: string[];
  images?: string[];
}): string {
  // Priority order: cover_image > image_url > first photo > first image > fallback
  const sources = [
    restaurant.cover_image,
    restaurant.image_url,
    Array.isArray(restaurant.photos) ? restaurant.photos[0] : null,
    Array.isArray(restaurant.images) ? restaurant.images[0] : null,
  ];

  for (const source of sources) {
    if (source && source.trim() !== '') {
      return getOptimizedImageUrl(source, 'card');
    }
  }

  return IMAGE_CONFIG.FALLBACK.restaurant;
}

/**
 * Get restaurant detail image (higher quality)
 */
export function getRestaurantDetailImage(restaurant: {
  cover_image?: string;
  image_url?: string;
  photos?: string[];
  images?: string[];
}): string {
  const sources = [
    restaurant.cover_image,
    restaurant.image_url,
    Array.isArray(restaurant.photos) ? restaurant.photos[0] : null,
    Array.isArray(restaurant.images) ? restaurant.images[0] : null,
  ];

  for (const source of sources) {
    if (source && source.trim() !== '') {
      return getOptimizedImageUrl(source, 'detail');
    }
  }

  return IMAGE_CONFIG.FALLBACK.restaurant;
}

/**
 * Get all restaurant photos for gallery
 */
export function getRestaurantGallery(restaurant: {
  cover_image?: string;
  photos?: string[];
  images?: string[];
}): string[] {
  const allImages = [
    restaurant.cover_image,
    ...(restaurant.photos || []),
    ...(restaurant.images || []),
  ].filter(img => img && img.trim() !== '');

  // Remove duplicates
  const uniqueImages = [...new Set(allImages)];

  if (uniqueImages.length === 0) {
    return [IMAGE_CONFIG.FALLBACK.restaurant];
  }

  return uniqueImages.map(img => getOptimizedImageUrl(img, 'detail'));
}

/**
 * Validate if URL is a valid image
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || url.trim() === '') return false;
  
  try {
    const parsedUrl = new URL(url);
    const extension = parsedUrl.pathname.split('.').pop()?.toLowerCase();
    
    return (
      (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') &&
      (IMAGE_CONFIG.ALLOWED_FORMATS.includes(extension || '') || 
       url.includes('cloudinary.com') || 
       url.includes('picsum.photos'))
    );
  } catch {
    return false;
  }
}

/**
 * Preload images for better performance
 */
export async function preloadImages(urls: string[]): Promise<void> {
  const validUrls = urls.filter(isValidImageUrl);
  
  await Promise.all(
    validUrls.map(url => 
      new Promise<void>((resolve) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => resolve(); // Still resolve on error
        image.src = url;
      })
    )
  );
}

// ============================================
// REACT NATIVE SPECIFIC UTILITIES
// ============================================

/**
 * Get Image component props with proper error handling
 */
export function getImageProps(
  imageSource: string | string[] | null | undefined,
  size: 'thumbnail' | 'card' | 'detail' | 'fullscreen' = 'card'
) {
  const url = getOptimizedImageUrl(imageSource, size);
  
  return {
    source: { uri: url },
    defaultSource: { uri: IMAGE_CONFIG.FALLBACK.restaurant },
    onError: (error: any) => {
      console.error('[Image] Failed to load:', url, error);
    },
  };
}

/**
 * Image cache configuration for React Native
 */
export const IMAGE_CACHE_CONFIG = {
  // Enable disk caching
  cachePolicy: 'memory-disk' as const,
  
  // Cache priority
  priority: 'normal' as const,
  
  // Retry on failure
  maxRetries: 3,
  
  // Timeout
  timeout: 15000,
};

// ============================================
// EXPORTS
// ============================================

export default {
  getOptimizedImageUrl,
  getImageArray,
  getRestaurantCoverImage,
  getRestaurantDetailImage,
  getRestaurantGallery,
  isValidImageUrl,
  preloadImages,
  getImageProps,
  IMAGE_CONFIG,
  IMAGE_CACHE_CONFIG,
};