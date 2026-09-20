const http = require('http');

const endpoints = [
  '/',
  '/index.html',
  '/admin.html',
  '/driver.html',
  '/favicon.svg',
  '/img/logo-reframed.png',
  '/css/style.css',
  '/js/api.js',
  '/js/app.js',
  '/js/calculator.js',
  '/js/booking.js',
  '/data/cities.json',
  '/data/locations.json',
  '/data/popular_routes.json',
  '/api/health'
];

let allOk = true;

async function check(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:8080${path}`, (res) => {
      const ok = res.statusCode === 200;
      if (!ok) allOk = false;
      const statusIcon = ok ? '✓' : '❌';
      console.log(`${statusIcon} ${path} -> ${res.statusCode} (${res.headers['content-type']})`);
      res.resume();
      resolve();
    }).on('error', (err) => {
      console.error(`❌ ${path} -> ERROR:`, err.message);
      allOk = false;
      resolve();
    });
  });
}

async function run() {
  console.log('=== VERIFYING ALL CORE ENDPOINTS & ASSETS ===\n');
  for (const ep of endpoints) {
    await check(ep);
  }
  if (allOk) {
    console.log('\n🎉 ALL CORE ENDPOINTS ARE 100% HEALTHY (200 OK)!');
  } else {
    console.error('\n❌ Some endpoints failed!');
    process.exit(1);
  }
}

run();
