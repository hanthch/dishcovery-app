'use strict';

require('dotenv').config();

const app  = require('./app');
const os   = require('os');
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const ENV  = process.env.NODE_ENV || 'development';
const server = app.listen(PORT, HOST, () => {
  if (ENV === 'production') {
    console.log(`Server running on port ${PORT}`);
    return;
  }

  const localIP = getLocalIP();

  console.log('');
  console.log(`  App:     http://localhost:${PORT}`);
  if (localIP) {
    console.log(`  Network: http://${localIP}:${PORT}`);
    console.log('');
    console.log(`  EXPO_PUBLIC_API_URL=http://${localIP}:${PORT}/api/v1`);
  }
  console.log('');
});
function getLocalIP() {
  const VIRTUAL = [
    'vmware', 'vbox', 'virtualbox', 'vethernet',
    'wsl', 'hyper-v', 'loopback', 'bluetooth', 'tunnel',
  ];

  const candidates = [];

  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (VIRTUAL.some(v => name.toLowerCase().includes(v))) continue;

    for (const addr of addrs) {
      if (addr.family !== 'IPv4' || addr.internal) continue;
      candidates.push({ name, ip: addr.address });
    }
  }

  if (candidates.length === 0) return null;

  const preferred = candidates.find(c => {
    const n = c.name.toLowerCase();
    return (
      n.includes('wi-fi')    ||
      n.includes('wifi')     ||
      n.includes('wlan')     ||
      n.includes('ethernet') ||
      n.includes('en0')      ||
      n.includes('eth0')
    );
  });

  return (preferred ?? candidates[0]).ip;
}
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    console.error(`  Kill it:  npx kill-port ${PORT}`);
    console.error(`  Or use:   PORT=3001 npm start`);
  } else {
    console.error('Server error:', err.message);
  }
  process.exit(1);
});
function shutdown(signal) {
  console.log(`\n${signal} received — shutting down…`);

  server.close((err) => {
    if (err) {
      console.error('Error during shutdown:', err.message);
      process.exit(1);
    }
    console.log('Server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Shutdown timeout — forcing exit.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});