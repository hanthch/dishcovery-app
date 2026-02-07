
export const VIETNAMESE_CUISINES = [
  'Phở',
  'Bánh Mì',
  'Cơm Tấm',
  'Bánh Canh',
  'Bún',
  'Cơm Tay Cầm',
  'Mì Quảng',
  'Ăn Vặt',
  'Bún Riêu',
  'Bún Bò',
];

export const INTERNATIONAL_CUISINES = [
  'Japanese',
  'Korean',
  'Chinese',
  'Thai',
  'Indian',
  'Singaporean',
  'Hong Kong',
  'Western',
  'Vietnamese-French',
  'Southeast Asian',
];

export const PRICE_RANGES = [
  { label: '₫ (Under 50k)', value: '₫' },
  { label: '₫₫ (50k - 150k)', value: '₫₫' },
  { label: '₫₫₫ (Over 150k)', value: '₫₫₫' },
  { label: '₫₫₫₫ (Premium)', value: '₫₫₫₫' },
];

export const RATING_OPTIONS = [
  { label: '4.5★ & up', value: 4.5 },
  { label: '4.0★ & up', value: 4.0 },
  { label: '3.5★ & up', value: 3.5 },
  { label: '3.0★ & up', value: 3.0 },
];

// Navigation Types
export type RestaurantStackParamList = {
  RestaurantsHome: undefined;
  RestaurantDetail: {
    restaurantId: string;
    restaurantName: string;
  };
  TopTen: undefined;
  Category: {
    categoryName: string;
    cuisineType: 'vietnamese' | 'international';
  };
  Search: undefined;
  Filter: undefined;
  };

export interface RestaurantFilters {
  cuisine?: string[];
  cuisineType?: 'vietnamese' | 'international';
  priceRange?: string;
  minRating?: number;
  status?: 'verified' | 'community' | 'all';
  searchQuery?: string;
  searchType?: 'name' | 'food' | 'cuisine';
}
