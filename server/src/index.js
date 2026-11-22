const os = require('os');
const app = require('./app');

const port = Number(process.env.PORT) || 3000;

app.initializeStorage().then(() => app.listen(port, '0.0.0.0', () => {
  console.log(`Campaign Keeper running at http://localhost:${port}`);

  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family === 'IPv4' && !address.internal) {
        console.log(`Local network: http://${address.address}:${port}`);
      }
    }
  }
})).catch(error => { console.error(error); process.exit(1); });
