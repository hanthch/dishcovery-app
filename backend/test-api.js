require('dotenv').config();
const axios = require('axios');
const os = require('os');

// ============================================================
// CONFIG
// ============================================================

function getIPv4Address() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    if (name.toLowerCase().includes('vmware')) continue;
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

const PORT     = process.env.PORT || 3000;
const IPV4     = getIPv4Address();
const HOST     = IPV4 || 'localhost';
const BASE_URL = `http://${HOST}:${PORT}/api/v1`;

// ============================================================
// COLORS
// ============================================================

const c = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  blue:   '\x1b[34m',
  purple: '\x1b[35m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
};

// ============================================================
// AXIOS CLIENT
// ============================================================

const client = axios.create({ baseURL: BASE_URL, timeout: 8000 });

// ============================================================
// ALL CATEGORY SLUGS
// Must match FOOD_TYPE_SLUG_MAP + PRICE_SLUG_MAP in restaurants.js
// ============================================================

const FOOD_SLUGS = [
  { slug: 'bun-pho',     label: 'Bún & Phở'   },
  { slug: 'banh-mi',     label: 'Bánh mì'      },
  { slug: 'com-chien',   label: 'Cơm & Cháo'   },
  { slug: 'lau-nuong',   label: 'Lẩu & Nướng'  },
  { slug: 'hai-san',     label: 'Hải sản'       },
  { slug: 'an-vat',      label: 'Ăn vặt'        },
  { slug: 'trang-mieng', label: 'Tráng miệng'   },
  { slug: 'chay',        label: 'Món chay'      },
];

const DRINK_SLUGS = [
  { slug: 'tra-sua',  label: 'Trà sữa' },
  { slug: 'cafe',     label: 'Cà phê'  },
  { slug: 'nuoc-ep',  label: 'Nước ép' },
  { slug: 'sinh-to',  label: 'Sinh tố' },
  { slug: 'do-uong',  label: 'Đồ uống' },
];

const CUISINE_SLUGS = [
  { slug: 'mon-viet',  label: 'Món Việt'  },
  { slug: 'mon-han',   label: 'Món Hàn'   },
  { slug: 'mon-nhat',  label: 'Món Nhật'  },
  { slug: 'mon-thai',  label: 'Món Thái'  },
  { slug: 'mon-trung', label: 'Món Trung' },
  { slug: 'mon-au-my', label: 'Món Tây'   },
  { slug: 'mon-an',    label: 'Món Ấn'    },
  { slug: 'khac',      label: 'Khác'      },
];

const PRICE_SLUGS = [
  { slug: 'binh-dan',   label: 'Dưới 30k'    },
  { slug: 'gia-hop-ly', label: '30k – 80k'   },
  { slug: 'tam-trung',  label: '80k – 150k'  },
  { slug: 'cao-cap',    label: 'Trên 150k'   },
];

const VIBE_SLUGS = [
  { slug: 'top-rated', label: 'Top Rated'  },
  { slug: 'moi-nhat',  label: 'Mới nhất'   },
];

// ============================================================
// BASIC ENDPOINTS (non-category)
// ============================================================

const BASIC_ENDPOINTS = [
  { name: 'Health Check',         path: '/health'                      },
  { name: 'Restaurants (list)',    path: '/restaurants'                 },
  { name: 'Config',                path: '/restaurants/config'          },
  { name: 'Top Rated',             path: '/restaurants/top-rated'       },
  { name: 'Markets List',          path: '/restaurants/markets/list'    },
  { name: 'Search (q=phở)',        path: '/restaurants/search?q=phở'   },
  { name: 'Search (price filter)', path: '/restaurants/search?price=binh-dan' },
  { name: 'Search (type filter)',  path: '/restaurants/search?type=bun-pho'   },
  { name: 'Places Search',         path: '/places/search?q=phở'        },
  { name: 'Universal Search',      path: '/search?q=sushi'              },
  { name: 'Posts',                 path: '/posts'                       },
];

// ============================================================
// HELPERS
// ============================================================

function printHeader() {
  console.log('\n' + '═'.repeat(68));
  console.log(`${c.bold}  DishCovery API Test — Full Category Coverage${c.reset}`);
  console.log('═'.repeat(68) + '\n');
  console.log(`${c.cyan}IP:${c.reset}       ${IPV4 || 'Not found (using localhost)'}`);
  console.log(`${c.cyan}Base URL:${c.reset} ${BASE_URL}\n`);
}

function printSection(title, color = c.blue) {
  console.log(`\n${color}${c.bold}── ${title} ${'─'.repeat(Math.max(0, 52 - title.length))}${c.reset}`);
}

function formatError(error) {
  if (error.code === 'ECONNREFUSED') return 'Connection refused — is server running?';
  if (error.code === 'ETIMEDOUT')    return 'Timeout — backend unreachable';
  if (error.response)                return `HTTP ${error.response.status}`;
  return error.message;
}

/**
 * Format the count badge next to a passing category test.
 * Shows how many restaurants that tab would display.
 */
function countBadge(count) {
  if (count === 0)  return `${c.red}(0 results — tab will be empty!)${c.reset}`;
  if (count < 3)    return `${c.yellow}(${count} result${count > 1 ? 's' : ''})${c.reset}`;
  return `${c.dim}(${count} results)${c.reset}`;
}

// ============================================================
// TEST RUNNERS
// ============================================================

async function runBasic(stats) {
  printSection('Basic Endpoints', c.blue);

  for (const ep of BASIC_ENDPOINTS) {
    process.stdout.write(`  ${c.yellow}→${c.reset} ${ep.name.padEnd(28)}`);
    try {
      const res = await client.get(ep.path);
      const count = Array.isArray(res.data?.data) ? res.data.data.length : null;
      const badge = count !== null ? ` ${c.dim}(${count} items)${c.reset}` : '';
      console.log(`${c.green}✓ ${res.status}${c.reset}${badge}`);
      stats.passed++;
    } catch (err) {
      console.log(`${c.red}✗ ${formatError(err)}${c.reset}`);
      stats.failed++;
    }
  }
}

/**
 * Run all slugs in a category group.
 * Reports count per slug and flags any that return 0 results.
 */
async function runCategoryGroup(groupName, slugs, stats, emptyWarnings) {
  printSection(groupName, c.purple);

  for (const { slug, label } of slugs) {
    const tag = `${label} (${slug})`;
    process.stdout.write(`  ${c.yellow}→${c.reset} ${tag.padEnd(34)}`);

    try {
      const res   = await client.get(`/restaurants/category/${slug}`, {
        params: { page: 1, limit: 20 },
      });
      const data  = res.data?.data ?? [];
      const count = data.length;

      console.log(`${c.green}✓ ${res.status}${c.reset} ${countBadge(count)}`);

      if (count === 0) {
        emptyWarnings.push({ group: groupName, slug, label });
        stats.empty++;
      } else {
        // Spot-check: make sure food_types is present on first result
        const first = data[0];
        if (!first?.food_types && !first?.cuisine) {
          console.log(`    ${c.yellow}⚠ first result has no food_types field${c.reset}`);
        }
      }

      stats.passed++;
    } catch (err) {
      console.log(`${c.red}✗ ${formatError(err)}${c.reset}`);
      stats.failed++;
    }
  }
}

/**
 * Verify pagination works correctly on a paginated slug.
 */
async function runPaginationCheck(stats) {
  printSection('Pagination Check', c.cyan);

  const paginatedSlug = 'bun-pho';
  process.stdout.write(`  ${c.yellow}→${c.reset} ${'Page 1 (limit=3)'.padEnd(34)}`);
  try {
    const r1    = await client.get(`/restaurants/category/${paginatedSlug}`, { params: { page: 1, limit: 3 } });
    const ids1  = (r1.data?.data ?? []).map(r => r.id);
    const count = r1.data?.data?.length ?? 0;
    console.log(`${c.green}✓ ${r1.status}${c.reset} ${c.dim}(${count} items)${c.reset}`);
    stats.passed++;

    process.stdout.write(`  ${c.yellow}→${c.reset} ${'Page 2 (limit=3)'.padEnd(34)}`);
    const r2   = await client.get(`/restaurants/category/${paginatedSlug}`, { params: { page: 2, limit: 3 } });
    const ids2 = (r2.data?.data ?? []).map(r => r.id);

    // Pages must not overlap
    const overlap = ids1.filter(id => ids2.includes(id));
    if (overlap.length > 0) {
      console.log(`${c.red}✗ Pages overlap! Duplicate IDs: ${overlap.join(', ')}${c.reset}`);
      stats.failed++;
    } else {
      const c2 = r2.data?.data?.length ?? 0;
      console.log(`${c.green}✓ ${r2.status}${c.reset} ${c.dim}(${c2} items, no overlap)${c.reset}`);
      stats.passed++;
    }

    // hasMore flag
    process.stdout.write(`  ${c.yellow}→${c.reset} ${'hasMore flag'.padEnd(34)}`);
    const hasMore = r1.data?.hasMore;
    if (typeof hasMore === 'boolean') {
      console.log(`${c.green}✓${c.reset} ${c.dim}hasMore=${hasMore}${c.reset}`);
      stats.passed++;
    } else {
      console.log(`${c.yellow}⚠ hasMore not present in response${c.reset}`);
      stats.passed++; // non-fatal
    }
  } catch (err) {
    console.log(`${c.red}✗ ${formatError(err)}${c.reset}`);
    stats.failed++;
  }
}

/**
 * Verify top-rated returns ≤10 results sorted by rank ASC.
 */
async function runTopRatedCheck(stats) {
  printSection('Top Rated Integrity', c.cyan);

  process.stdout.write(`  ${c.yellow}→${c.reset} ${'Returns ≤10 results'.padEnd(34)}`);
  try {
    const res  = await client.get('/restaurants/top-rated');
    const data = res.data?.data ?? [];
    const ok   = data.length <= 10;
    console.log(ok
      ? `${c.green}✓${c.reset} ${c.dim}(${data.length} results)${c.reset}`
      : `${c.red}✗ Got ${data.length} results (expected ≤10)${c.reset}`
    );
    ok ? stats.passed++ : stats.failed++;

    process.stdout.write(`  ${c.yellow}→${c.reset} ${'Ordered by rank ASC'.padEnd(34)}`);
    const ranks = data.map(r => r.top_rank_this_week ?? r.topRankThisWeek);
    const sorted = [...ranks].sort((a, b) => a - b);
    const inOrder = JSON.stringify(ranks) === JSON.stringify(sorted);
    console.log(inOrder
      ? `${c.green}✓${c.reset} ${c.dim}[${ranks.join(', ')}]${c.reset}`
      : `${c.red}✗ Not sorted: [${ranks.join(', ')}]${c.reset}`
    );
    inOrder ? stats.passed++ : stats.failed++;

    process.stdout.write(`  ${c.yellow}→${c.reset} ${'All have top_rank field'.padEnd(34)}`);
    const allHaveRank = data.every(r => r.top_rank_this_week != null || r.topRankThisWeek != null);
    console.log(allHaveRank
      ? `${c.green}✓${c.reset}`
      : `${c.red}✗ Some results missing top_rank_this_week${c.reset}`
    );
    allHaveRank ? stats.passed++ : stats.failed++;
  } catch (err) {
    console.log(`${c.red}✗ ${formatError(err)}${c.reset}`);
    stats.failed++;
  }
}

/**
 * Verify the /config endpoint returns all expected keys.
 */
async function runConfigCheck(stats) {
  printSection('Config Endpoint', c.cyan);

  process.stdout.write(`  ${c.yellow}→${c.reset} ${'Has foodTabs'.padEnd(34)}`);
  try {
    const res    = await client.get('/restaurants/config');
    const config = res.data?.data ?? {};

    const requiredKeys = ['foodTabs', 'drinkTabs', 'cuisineTabs', 'priceOptions', 'priceCategoryOptions', 'homeSections'];
    for (const key of requiredKeys) {
      const ok = Array.isArray(config[key]);
      process.stdout.write(ok
        ? `${c.green}✓${c.reset} `
        : `${c.red}✗ missing ${key}${c.reset} `
      );
      ok ? stats.passed++ : stats.failed++;
      if (key !== requiredKeys[requiredKeys.length - 1]) {
        process.stdout.write(`  ${c.yellow}→${c.reset} ${'Has ' + key.replace('Tabs','Tabs').replace('Options','Options').padEnd(34)}`);
      }
    }
    console.log();

    // Check tab counts add up
    const foodCount    = config.foodTabs?.length    ?? 0;
    const drinkCount   = config.drinkTabs?.length   ?? 0;
    const cuisineCount = config.cuisineTabs?.length ?? 0;
    console.log(`  ${c.dim}foodTabs: ${foodCount}  drinkTabs: ${drinkCount}  cuisineTabs: ${cuisineCount}${c.reset}`);
  } catch (err) {
    console.log(`${c.red}✗ ${formatError(err)}${c.reset}`);
    stats.failed++;
  }
}

/**
 * Verify normalizer fields are present on a restaurant response.
 */
async function runNormalizerCheck(stats) {
  printSection('Normalizer Field Check', c.cyan);

  process.stdout.write(`  ${c.yellow}→${c.reset} ${'Fetch first restaurant'.padEnd(34)}`);
  try {
    const listRes = await client.get('/restaurants', { params: { limit: 1 } });
    const first   = listRes.data?.data?.[0];
    if (!first) {
      console.log(`${c.red}✗ No restaurants in DB${c.reset}`);
      stats.failed++;
      return;
    }
    console.log(`${c.green}✓${c.reset} ${c.dim}id=${first.id}${c.reset}`);
    stats.passed++;

    const requiredFields = [
      'id', 'name', 'food_types', 'cuisine', 'categories',
      'cover_image', 'photos', 'images',
      'rating', 'price_range', 'priceRange',
      'verified', 'status',
    ];

    for (const field of requiredFields) {
      process.stdout.write(`  ${c.yellow}→${c.reset} ${'Has ' + field.padEnd(31)}`);
      const present = field in first;
      console.log(present
        ? `${c.green}✓${c.reset} ${c.dim}${JSON.stringify(first[field])?.slice(0, 50)}${c.reset}`
        : `${c.red}✗ MISSING${c.reset}`
      );
      present ? stats.passed++ : stats.failed++;
    }

    // Verify food_types alias consistency
    process.stdout.write(`  ${c.yellow}→${c.reset} ${'food_types === cuisine'.padEnd(34)}`);
    const eq = JSON.stringify(first.food_types) === JSON.stringify(first.cuisine);
    console.log(eq ? `${c.green}✓${c.reset}` : `${c.red}✗ mismatch${c.reset}`);
    eq ? stats.passed++ : stats.failed++;

    process.stdout.write(`  ${c.yellow}→${c.reset} ${'photos === images'.padEnd(34)}`);
    const eq2 = JSON.stringify(first.photos) === JSON.stringify(first.images);
    console.log(eq2 ? `${c.green}✓${c.reset}` : `${c.red}✗ mismatch${c.reset}`);
    eq2 ? stats.passed++ : stats.failed++;
  } catch (err) {
    console.log(`${c.red}✗ ${formatError(err)}${c.reset}`);
    stats.failed++;
  }
}

// ============================================================
// MAIN RUNNER
// ============================================================

async function run() {
  printHeader();

  const stats = { passed: 0, failed: 0, empty: 0 };
  const emptyWarnings = [];

  // Basic endpoints
  await runBasic(stats);

  // All category slug groups
  await runCategoryGroup('Food Tabs',    FOOD_SLUGS,    stats, emptyWarnings);
  await runCategoryGroup('Drink Tabs',   DRINK_SLUGS,   stats, emptyWarnings);
  await runCategoryGroup('Cuisine Tabs', CUISINE_SLUGS, stats, emptyWarnings);
  await runCategoryGroup('Price Tiers',  PRICE_SLUGS,   stats, emptyWarnings);
  await runCategoryGroup('Vibe Slugs',   VIBE_SLUGS,    stats, emptyWarnings);

  // Integrity checks
  await runTopRatedCheck(stats);
  await runPaginationCheck(stats);
  await runConfigCheck(stats);
  await runNormalizerCheck(stats);

  // ── Summary ───────────────────────────────────────────────
  console.log('\n' + '═'.repeat(68));
  console.log(
    `  Result: ${c.green}${stats.passed} passed${c.reset}  ${c.red}${stats.failed} failed${c.reset}  ${stats.empty > 0 ? c.yellow : c.dim}${stats.empty} empty tabs${c.reset}`
  );
  console.log('═'.repeat(68));

  if (emptyWarnings.length > 0) {
    console.log(`\n${c.yellow}${c.bold}⚠  Empty category tabs (seed data missing):${c.reset}`);
    for (const w of emptyWarnings) {
      console.log(`   ${c.yellow}•${c.reset} [${w.group}] ${w.label} (${w.slug})`);
    }
    console.log(`\n   ${c.dim}Fix: add restaurants with the matching food_type to seed.sql${c.reset}`);
  }

  if (stats.failed === 0) {
    console.log(`\n${c.green}${c.bold}✓ All endpoints healthy${c.reset}`);
    console.log(`${c.cyan}Expo config:${c.reset} EXPO_PUBLIC_API_URL=http://${HOST}:${PORT}/api/v1\n`);
  } else {
    console.log(`\n${c.red}${c.bold}✗ ${stats.failed} test(s) failed — check server logs${c.reset}\n`);
  }

  process.exit(stats.failed ? 1 : 0);
}

run();