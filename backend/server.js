require('dotenv').config();
const app = require('./app');
const os  = require('os');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

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
  if (process.env.EXPO_IP) {
    const found = allIPs.find(ip => ip.address === process.env.EXPO_IP);
    if (found) return process.env.EXPO_IP;
    console.warn(`  couldn't find EXPO_IP=${process.env.EXPO_IP} — will pick one for you instead\n`);
  }

  const VIRTUAL = /vmnet|vethernet|vboxnet|docker|virbr|tap|tun|wsl/i;
  const WIFI    = /wlan|wi-fi|wifi|wireless|en0|wlp/i;

  const scored = allIPs.map(ip => ({
    ...ip,
    score:
      (ip.address.startsWith('192.168.') ? 30 : ip.address.startsWith('10.') ? 20 : ip.address.startsWith('172.') ? 10 : 0) +
      (WIFI.test(ip.name)    ?  10 : 0) +
      (VIRTUAL.test(ip.name) ? -10 : 0),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.address || 'localhost';
}

const server = app.listen(PORT, HOST, () => {
  const allIPs = getAllLocalIPs();
  const bestIP = getBestIP(allIPs);

  console.log('');
  console.log('  🍽️  hey! dishcovery backend is ready');
  console.log('');
  console.log(`  running at  →  http://localhost:${PORT}/api/v1`);
  console.log('');

  if (allIPs.length === 0) {
    console.log("  looks like you're not connected to Wi-Fi?");
    console.log('  connect and restart for Expo to reach the server.');
  } else {
    if (allIPs.length > 1) {
      console.log('');
      allIPs.forEach(({ name, address }) => {
        const pick = address === bestIP;
        console.log(`    ${pick ? ' ' : '  '} ${address}   ${pick ? ' ' : `(${name})`}`);
      });
      console.log('');
    }

    console.log('');
    console.log(`  EXPO_PUBLIC_API_URL=http://${bestIP}:${PORT}/api/v1`);
    console.log('');
  }

  console.log('');
  console.log('  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('');
    console.error(`  something's already running on port ${PORT}.`);
    console.error('  kill it and try again:');
    console.error('');
    console.error('    mac / linux   →   lsof -ti:' + PORT + ' | xargs kill -9');
    console.error('    windows       →   netstat -ano | findstr :' + PORT);
    console.error('                      taskkill /PID <pid> /F');
    console.error('');
    console.error(`  or just use a different port:  PORT=3001 npm start`);
    console.error('');
    process.exit(1);
  } else {
    console.error('  oh no, something went wrong:', err.message);
    process.exit(1);
  }
});

function shutdown(signal) {
  console.log('\n  wrapping up...');
  server.close(() => {
    console.log('  all done, see you next time! 👋\n');
    process.exit(0);
  });
  setTimeout(() => {
    console.error("  took too long, forcing it.");
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));