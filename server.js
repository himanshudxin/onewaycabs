/**
 * OneWayTaxiBihar (onewaytaxibihar.com)
 * Cross-Platform Production Node.js Server
 * Serves static web assets and routes /api/* to api/index.js
 */

try { require('dotenv').config(); } catch (e) {}

const http = require('http');
const fs = require('fs');
const path = require('path');
const apiHandler = require('./api/index.js');

const PORT = parseInt(process.env.PORT || '8080', 10);
const WORKSPACE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  // CORS & Security Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // 1. API Route Handler
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return apiHandler(req, res);
  }

  // 2. Static File Serving
  let filePath = pathname === '/' ? '/index.html' : pathname;
  let safePath = path.normalize(path.join(WORKSPACE_DIR, filePath));

  // Security: Prevent directory traversal
  if (!safePath.startsWith(WORKSPACE_DIR)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }

  // If directory, try index.html
  if (fs.existsSync(safePath) && fs.statSync(safePath).isDirectory()) {
    safePath = path.join(safePath, 'index.html');
  } else if (!fs.existsSync(safePath) && fs.existsSync(safePath + '.html')) {
    safePath = safePath + '.html';
  }

  if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // Static asset caching
    if (ext === '.css' || ext === '.js') {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (['.svg', '.png', '.jpg', '.webp', '.ico'].includes(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    } else {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }

    const stream = fs.createReadStream(safePath);
    return stream.pipe(res);
  }

  // 3. 404 Fallback
  const custom404 = path.join(WORKSPACE_DIR, '404.html');
  if (fs.existsSync(custom404)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return fs.createReadStream(custom404).pipe(res);
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain');
  res.end('404 Not Found');
});

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[OneWayTaxiBihar] Universal Node.js server running on http://0.0.0.0:${PORT}`);
  });
}

module.exports = server;
