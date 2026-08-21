const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(path.join(__dirname, '.env'));

const rootDir = __dirname;
const handlers = {
  '/api/config': require(path.join(rootDir, 'api', 'config.js')),
  '/api/bosta-create-label': require(path.join(rootDir, 'api', 'bosta-create-label.js')),
  '/api/bosta-webhook': require(path.join(rootDir, 'api', 'bosta-webhook.js')),
  '/api/order-tracking': require(path.join(rootDir, 'api', 'order-tracking.js'))
};

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = contentTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  fs.createReadStream(filePath).pipe(res);
}

function serveStatic(req, res, pathname) {
  let filePath = path.join(rootDir, pathname);
  if (pathname === '/' || pathname === '') {
    filePath = path.join(rootDir, 'index.html');
  } else if (pathname === '/Admin') {
    filePath = path.join(rootDir, 'Admin', 'index.html');
  }

  if (!path.extname(filePath)) {
    const candidates = [
      path.join(filePath, 'index.html'),
      `${filePath}.html`
    ];
    filePath = candidates.find((candidate) => fs.existsSync(candidate)) || filePath;
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  sendFile(res, filePath);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = '';
    req.on('data', (chunk) => { chunks += chunk; });
    req.on('end', () => {
      if (!chunks) return resolve(null);
      try {
        resolve(JSON.parse(chunks));
      } catch {
        resolve(chunks);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '/';

  if (pathname.startsWith('/api/')) {
    const handler = handlers[pathname];
    if (!handler) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Unknown API route' }));
      return;
    }

    const body = await parseBody(req);
    req.body = body;
    req.query = parsed.query;
    req.headers = req.headers || {};

    const originalJson = res.json?.bind(res);
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (payload) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(payload));
    };

    try {
      await handler(req, res);
    } catch (error) {
      console.error(error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: error.message }));
    }
    if (originalJson) res.json = originalJson;
    return;
  }

  serveStatic(req, res, pathname);
});

const port = Number(process.env.PORT || 3000);
server.listen(port, () => {
  console.log(`Local server running at http://localhost:${port}`);
});
