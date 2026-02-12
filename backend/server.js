require('dotenv').config();
const app = require('./app');
const os = require('os');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  const localIP = getLocalIP();

  console.log('Server started');
  console.log(`Local:    http://localhost:${PORT}`);
  console.log(`Network:  http://${localIP}:${PORT}`);
  console.log(`Health:   http://localhost:${PORT}/health`);
  console.log(
    `Expo env:EXPO_PUBLIC_API_URL=http://${localIP}:${PORT}/api/v1`
  );
});

function getLocalIP() {
  const nets = os.networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}
