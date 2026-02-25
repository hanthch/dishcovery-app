require('dotenv').config();
const app = require('./app');
const os = require('os');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
// ============================================================
// HELPERS
// ============================================================

function getAllLocalIPs() {
  const nets = os.networkInterfaces();
  const results = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push({ name, address: net.address });
      }
    }
  }
  return results;
}

function getBestIP(allIPs) {
  // Manual override — set your machine's WiFi IP here
  const MY_IP = '192.168.52.104';
  const found = allIPs.find(ip => ip.address === MY_IP);
  if (found) return MY_IP;

  // Fallback: first non-virtual IP
  return allIPs[0]?.address || 'localhost';
}

// ============================================================
// START SERVER
// ============================================================

const server = app.listen(PORT, HOST, () => {
  const allIPs = getAllLocalIPs();
  const bestIP = getBestIP(allIPs);

  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║        DishCovery Backend — Running          ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`✓ Local:    http://localhost:${PORT}`);

  // Show ALL network IPs so you can pick the right one
  if (allIPs.length === 1) {
    console.log(`✓ Network:  http://${allIPs[0].address}:${PORT}`);
  } else {
    console.log('✓ Network interfaces:');
    allIPs.forEach(({ name, address }) => {
      const marker = address === bestIP ? ' ◄ use this' : '';
      console.log(`    ${address}:${PORT}  (${name})${marker}`);
    });
  }

  console.log(`✓ Health:   http://${bestIP}:${PORT}/api/v1/health`);
  console.log('');
  console.log('── Expo ──────────────────────────────────────');
  console.log(`  EXPO_PUBLIC_API_URL=http://${bestIP}:${PORT}/api/v1`);
  console.log('');
  console.log('── Test ──────────────────────────────────────');
  console.log(`  node test-api.js`);
  console.log('──────────────────────────────────────────────');
  console.log('');
});

// ============================================================
// ERROR HANDLING
// ============================================================

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('');
    console.error(`✗ Port ${PORT} is already in use.`);
    console.error('');
    console.error('  Fix options:');
    console.error(`  1. Kill the process on port ${PORT}:`);
    console.error(`     netstat -ano | findstr :${PORT}`);
    console.error(`     taskkill /PID <pid> /F`);
    console.error(`     Or kill all node: taskkill /IM node.exe /F`);
    console.error(`  2. Use a different port:`);
    console.error(`     set PORT=3001 && npm start`);
    console.error('');
    process.exit(1);
  } else {
    console.error('✗ Server error:', err.message);
    process.exit(1);
  }
});

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

function shutdown(signal) {
  console.log(`\n✓ ${signal} received — shutting down gracefully...`);
  server.close(() => {
    console.log('✓ Server closed. Bye!\n');
    process.exit(0);
  });

  // Force exit if not closed within 5s
  setTimeout(() => {
    console.error('✗ Forced shutdown after timeout');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
