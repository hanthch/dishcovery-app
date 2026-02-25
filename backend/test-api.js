require('dotenv').config();
const axios = require('axios');
const os = require('os');

// ============================================================
// CONFIG
// ============================================================

function getIPv4Address() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }

  return null;
}

const PORT = process.env.PORT || 3000;
const IPV4 = getIPv4Address();
const HOST = IPV4 || 'localhost';
const BASE_URL = `http://${HOST}:${PORT}/api/v1`;

// ============================================================
// COLORS
// ============================================================

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

// ============================================================
// AXIOS
// ============================================================

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
});

// ============================================================
// TESTS
// ============================================================

const endpoints = [
  { name: 'Health', path: '/health' },
  { name: 'Restaurants', path: '/restaurants' },
  { name: 'Top Rated', path: '/restaurants/top-rated' },
  { name: 'Category VN', path: '/restaurants/category/mon-viet' },
  { name: 'Category JP', path: '/restaurants/category/mon-nhat' },
  { name: 'Places Search', path: '/places/search?q=phở' },
  { name: 'Search', path: '/search?q=sushi' },
  { name: 'Posts', path: '/posts' },
];

// ============================================================
// HELPERS
// ============================================================

function printHeader() {
  console.log('\n' + '═'.repeat(65));
  console.log(`${c.bold} DishCovery API Test${c.reset}`);
  console.log('═'.repeat(65) + '\n');
  console.log(`${c.cyan}IP:${c.reset} ${IPV4 || 'Not found (using localhost)'}`);
  console.log(`${c.cyan}Base URL:${c.reset} ${BASE_URL}\n`);
}

function formatError(error) {
  if (error.code === 'ECONNREFUSED') {
    return 'Connection refused — is server running?';
  }
  if (error.code === 'ETIMEDOUT') {
    return 'Timeout — backend unreachable';
  }
  if (error.response) {
    return `HTTP ${error.response.status}`;
  }
  return error.message;
}

// ============================================================
// RUNNER
// ============================================================

async function run() {
  printHeader();

  let passed = 0;
  let failed = 0;

  for (const ep of endpoints) {
    process.stdout.write(`${c.yellow}→${c.reset} ${ep.name}... `);

    try {
      const res = await client.get(ep.path);
      console.log(`${c.green}✓ ${res.status}${c.reset}`);
      passed++;
    } catch (err) {
      console.log(`${c.red}✗ ${formatError(err)}${c.reset}`);
      failed++;
    }
  }

  console.log('\n' + '═'.repeat(65));
  console.log(
    `Result: ${c.green}${passed} passed${c.reset} | ${c.red}${failed} failed${c.reset}`
  );
  console.log('═'.repeat(65));

  if (failed === 0) {
    console.log(
      `\n${c.green}Backend reachable at:${c.reset} http://${HOST}:${PORT}/api/v1`
    );
    console.log(
      `${c.cyan}Expo config:${c.reset} EXPO_PUBLIC_API_URL=http://${HOST}:${PORT}/api/v1\n`
    );
  }

  process.exit(failed ? 1 : 0);
}

run();