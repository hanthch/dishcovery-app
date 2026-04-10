import { useState, useEffect, useRef } from 'react';
import apiService from '../services/Api.service';
import {
  FOOD_TABS as LOCAL_FOOD_TABS,
  DRINK_TABS as LOCAL_DRINK_TABS,
  CUISINE_TABS as LOCAL_CUISINE_TABS,
  HOME_SECTIONS as LOCAL_HOME_SECTIONS,
  PRICE_OPTIONS as LOCAL_PRICE_OPTIONS,
  PRICE_CATEGORY_OPTIONS as LOCAL_PRICE_CATEGORY_OPTIONS,
  RATING_WORDS as LOCAL_RATING_WORDS,
  NON_PAGINATED_SLUGS as LOCAL_NON_PAGINATED_SLUGS,
  CategoryTab,
  PriceOption,
  CategorySection,
} from '../constants/categoryConfig';

export interface AppConfig {
  foodTabs:             CategoryTab[];
  drinkTabs:            CategoryTab[];
  cuisineTabs:          CategoryTab[];
  homeSections:         CategorySection[];
  priceOptions:         PriceOption[];
  priceCategoryOptions: PriceOption[];
  nonPaginatedSlugs:    Set<string>;
  ratingWords:          Record<number, string>;
  loading:              boolean;
}

const LOCAL_CONFIG: AppConfig = {
  foodTabs:             LOCAL_FOOD_TABS,
  drinkTabs:            LOCAL_DRINK_TABS,
  cuisineTabs:          LOCAL_CUISINE_TABS,
  homeSections:         LOCAL_HOME_SECTIONS,
  priceOptions:         LOCAL_PRICE_OPTIONS,
  priceCategoryOptions: LOCAL_PRICE_CATEGORY_OPTIONS,
  nonPaginatedSlugs:    LOCAL_NON_PAGINATED_SLUGS,
  ratingWords:          LOCAL_RATING_WORDS,
  loading:              false,
};

let cachedConfig: AppConfig | null = null;
let fetchPromise: Promise<AppConfig> | null = null;

async function fetchConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;
  if (fetchPromise)  return fetchPromise;

  fetchPromise = (async () => {
    try {
      const remote = await apiService.getAppConfig();

      const remotePriceCategories: PriceOption[] =
        remote.priceCategoryOptions ?? LOCAL_PRICE_CATEGORY_OPTIONS;

      const nonPaginatedSlugs = new Set([
        'top-rated',
        'moi-nhat',
        ...remotePriceCategories.map((p: PriceOption) => p.slug),
      ]);

      const remoteFoodTabs    = remote.foodTabs    ?? LOCAL_FOOD_TABS;
      const remoteDrinkTabs   = remote.drinkTabs   ?? LOCAL_DRINK_TABS;
      const remoteCuisineTabs = remote.cuisineTabs ?? LOCAL_CUISINE_TABS;
      
      const remoteHomeSections = (remote.homeSections ?? LOCAL_HOME_SECTIONS).map(
        (s: any) => {
          if (Array.isArray(s.tabs)) return s as CategorySection;

          const resolvedTabs =
            s.tabsKey === 'foodTabs'    ? remoteFoodTabs    :
            s.tabsKey === 'drinkTabs'   ? remoteDrinkTabs   :
            s.tabsKey === 'cuisineTabs' ? remoteCuisineTabs :
            LOCAL_FOOD_TABS;

          return {
            key:   s.key   ?? s.tabsKey,
            title: s.title,
            tabs:  resolvedTabs,
          } as CategorySection;
        }
      );

      const config: AppConfig = {
        foodTabs:             remoteFoodTabs,
        drinkTabs:            remoteDrinkTabs,
        cuisineTabs:          remoteCuisineTabs,
        priceOptions:         remote.priceOptions         ?? LOCAL_PRICE_OPTIONS,
        priceCategoryOptions: remotePriceCategories,
        ratingWords:          remote.ratingWords          ?? LOCAL_RATING_WORDS,
        nonPaginatedSlugs,
        homeSections:         remoteHomeSections,
        loading:              false,
      };

      cachedConfig = config;
      return config;
    } catch (err) {
      console.warn('[useAppConfig] Remote fetch failed, using local fallback:', err);
      cachedConfig = LOCAL_CONFIG;
      return LOCAL_CONFIG;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export function useAppConfig(): AppConfig {
  const [config, setConfig] = useState<AppConfig>(
    cachedConfig ?? { ...LOCAL_CONFIG, loading: true }
  );
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (cachedConfig) {
      setConfig(cachedConfig);
      return;
    }
    fetchConfig().then(cfg => {
      if (mounted.current) setConfig(cfg);
    });
    return () => { mounted.current = false; };
  }, []);

  return config;
}

export function invalidateAppConfig() {
  cachedConfig  = null;
  fetchPromise  = null;
}