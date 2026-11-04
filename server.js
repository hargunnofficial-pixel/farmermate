// Local dev server: `npm start` then open http://localhost:3000
// Serves the app from /public and the same API routes Vercel runs from /api.
// No packages needed.

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');

// Load .env (GEMINI_API_KEY=...) without needing the dotenv package.
const envFile = path.join(ROOT, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    // Also accept a bare Gemini key on its own line (they start with "AIza").
    const bare = line.trim().replace(/^["']|["']$/g, '');
    if (!m && /^AIza[0-9A-Za-z_-]{20,}$/.test(bare) && !process.env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = bare;
  }
}
if (process.env.GEMINI_API_KEY && !/^AIza/.test(process.env.GEMINI_API_KEY)) {
  console.log('  ⚠  GEMINI_API_KEY does not look like a Gemini key (they start with "AIza"). Check your .env file.');
}

const { default: chat } = await import('./api/chat.js');
const { default: scan } = await import('./api/scan.js');
const { default: login } = await import('./api/login.js');
const ROUTES = { '/api/chat': chat, '/api/scan': scan, '/api/login': login };

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};
const MAX_BODY = 6 * 1024 * 1024;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const route = ROUTES[url.pathname];
  if (route) {
    if (req.method === 'GET') {
      req.body = {};
      return route(req, res);
    }
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) req.destroy();
      else chunks.push(c);
    });
    req.on('end', async () => {
      try {
        req.body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
      } catch {
        req.body = {};
      }
      await route(req, res);
    });
    return;
  }
  // Static files
  let file = path.normalize(path.join(PUBLIC, decodeURIComponent(url.pathname)));
  if (!file.startsWith(PUBLIC)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const data = await readFile(file);
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
});

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => {
  console.log(`\n  FarmerMate running at http://localhost:${PORT}\n`);
  if (!process.env.GEMINI_API_KEY) console.log('  ⚠  No GEMINI_API_KEY found. Copy .env.example to .env and add your key.\n');
});
