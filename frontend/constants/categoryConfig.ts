export interface CategoryTab {
  slug: string;
  label: string;
  icon: string;
  dbValue: string;
}

export interface PriceOption {
  slug: string;
  label: string;
  dbValue: string;
}

export interface CategorySection {
  key: string;
  title: string;
  tabs: CategoryTab[];
}
export const FOOD_TABS: CategoryTab[] = [
  { slug: 'bun-pho',     label: 'Bún & Phở',   icon: '🍜', dbValue: 'Bún & Phở'    },
  { slug: 'banh-mi',     label: 'Bánh mì',      icon: '🥖', dbValue: 'Bánh mì'      },
  { slug: 'com-chien',   label: 'Cơm & Cháo',   icon: '🍚', dbValue: 'Cơm & Cháo'  },
  { slug: 'lau-nuong',   label: 'Lẩu & Nướng',  icon: '🍲', dbValue: 'Lẩu & Nướng' },
  { slug: 'hai-san',     label: 'Hải sản',       icon: '🦐', dbValue: 'Hải sản'     },
  { slug: 'an-vat',      label: 'Ăn vặt',        icon: '🧆', dbValue: 'Ăn vặt'     },
  { slug: 'trang-mieng', label: 'Tráng miệng',   icon: '🍨', dbValue: 'Tráng miệng' },
  { slug: 'chay',        label: 'Món chay',      icon: '🥗', dbValue: 'Món chay'    },
];
export const DRINK_TABS: CategoryTab[] = [
  { slug: 'tra-sua',  label: 'Trà sữa', icon: '🧋', dbValue: 'Trà sữa'  },
  { slug: 'cafe',     label: 'Cà phê',  icon: '☕', dbValue: 'Café'     },
  { slug: 'nuoc-ep',  label: 'Nước ép', icon: '🥤', dbValue: 'Nước ép'  },
  { slug: 'sinh-to',  label: 'Sinh tố', icon: '🍹', dbValue: 'Sinh tố'  },
  { slug: 'do-uong',  label: 'Khác',    icon: '🧃', dbValue: 'Đồ uống'  },
];

export const CUISINE_TABS: CategoryTab[] = [
  { slug: 'mon-viet',  label: 'Món Việt',  icon: '🇻🇳', dbValue: 'Món Việt'  },
  { slug: 'mon-han',   label: 'Món Hàn',   icon: '🇰🇷', dbValue: 'Món Hàn'   },
  { slug: 'mon-nhat',  label: 'Món Nhật',  icon: '🇯🇵', dbValue: 'Món Nhật'  },
  { slug: 'mon-thai',  label: 'Món Thái',  icon: '🇹🇭', dbValue: 'Món Thái'  },
  { slug: 'mon-trung', label: 'Món Trung', icon: '🇨🇳', dbValue: 'Món Trung' },
  { slug: 'mon-au-my', label: 'Món Tây',   icon: '🇺🇸', dbValue: 'Món Âu-Mỹ' },
  { slug: 'mon-an',    label: 'Món Ấn',    icon: '🇮🇳', dbValue: 'Món Ấn'    },
  { slug: 'khac',      label: 'Khác',      icon: '🌍',  dbValue: 'Khác'      },
];

export const ALL_TABS: CategoryTab[] = [
  ...FOOD_TABS,
  ...DRINK_TABS,
  ...CUISINE_TABS,
];

export const HOME_SECTIONS: CategorySection[] = [
  { key: 'food',    title: 'Hôm nay ăn gì?',      tabs: FOOD_TABS    },
  { key: 'drinks',  title: 'Uống gì hôm nay?',     tabs: DRINK_TABS   },
  { key: 'cuisine', title: 'Ẩm thực thế giới 🌏',  tabs: CUISINE_TABS },
];

export const PRICE_OPTIONS: PriceOption[] = [
  { slug: 'under-30k',  label: 'Dưới 30k',          dbValue: 'Dưới 30k VND'   },
  { slug: '30k-80k',    label: 'Khoảng 30k – 80k',  dbValue: '30k - 80k VND'  },
  { slug: '80k-150k',   label: 'Khoảng 80k – 150k', dbValue: '80k - 150k VND' },
  { slug: 'over-150k',  label: 'Trên 150k',          dbValue: 'Trên 150k VND'  },
];

export const PRICE_CATEGORY_OPTIONS: PriceOption[] = [
  { slug: 'binh-dan',   label: 'Bình dân · Dưới 30k',    dbValue: 'Dưới 30k VND'   },
  { slug: 'gia-hop-ly', label: 'Hợp lý · 30k – 80k',     dbValue: '30k - 80k VND'  },
  { slug: 'tam-trung',  label: 'Tầm trung · 80k – 150k',  dbValue: '80k - 150k VND' },
  { slug: 'cao-cap',    label: 'Cao cấp · Trên 150k',     dbValue: 'Trên 150k VND'  },
];

export const ALL_PRICE_OPTIONS: PriceOption[] = [
  ...PRICE_OPTIONS,
  ...PRICE_CATEGORY_OPTIONS,
];

export const VIBE_SLUGS = new Set(['top-rated', 'moi-nhat']);

export const PRICE_CATEGORY_SLUGS = new Set(
  PRICE_CATEGORY_OPTIONS.map(p => p.slug)
);

export const NON_PAGINATED_SLUGS = new Set([
  ...VIBE_SLUGS,
  ...PRICE_CATEGORY_SLUGS,
]);

export const TAB_BY_SLUG = new Map(ALL_TABS.map(t => [t.slug, t]));

export const SLUG_TO_DB_FOOD_TYPE = new Map(ALL_TABS.map(t => [t.slug, t.dbValue]));

export const DB_FOOD_TYPE_TO_SLUG = new Map(ALL_TABS.map(t => [t.dbValue, t.slug]));

export const SLUG_TO_DB_PRICE = new Map(ALL_PRICE_OPTIONS.map(p => [p.slug, p.dbValue]));

export const DB_PRICE_TO_OPTION = new Map(ALL_PRICE_OPTIONS.map(p => [p.dbValue, p]));

export function slugsToDbFoodTypes(slugsCsv: string): string[] {
  return slugsCsv
    .split(',')
    .map(s => SLUG_TO_DB_FOOD_TYPE.get(s.trim()) ?? s.trim())
    .filter(Boolean);
}

export function slugsToDbPrices(slugsCsv: string): string[] {
  return slugsCsv
    .split(',')
    .map(s => SLUG_TO_DB_PRICE.get(s.trim()) ?? s.trim())
    .filter(Boolean);
}


export function slugToLabel(slug: string): string {
  return TAB_BY_SLUG.get(slug)?.label
    ?? ALL_PRICE_OPTIONS.find(p => p.slug === slug)?.label
    ?? slug;
}

export const RATING_WORDS: Record<number, string> = {
  1: 'Ăn không vô, tiếc tiền 🤢',
  2: 'Dưới kỳ vọng, hơi thất vọng 😞',
  3: 'Tạm ổn, không có gì nổi bật 😐',
  4: 'Khá ngon, chắc sẽ ghé lại 😋',
  5: 'Ngon xuất sắc, bắt buộc phải thử! 🤩',
};

export const RANK_BADGE_STYLE: Record<number, { bg: string; text: string }> = {
  1: { bg: '#FFD700', text: '#fff' },
  2: { bg: '#C0C0C0', text: '#fff' },
  3: { bg: '#CD7F32', text: '#fff' },
};
export const DEFAULT_RANK_BADGE_STYLE = { bg: '#F5F5F5', text: '#666' };

export function getRankBadgeStyle(rank: number) {
  return RANK_BADGE_STYLE[rank] ?? DEFAULT_RANK_BADGE_STYLE;
}