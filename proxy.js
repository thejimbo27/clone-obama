// Reverse proxy — single entry point for tunnel
// Routes /admin/* → admin panel (3000), everything else → Expo (8082)

import { createServer } from 'http';
import { request as httpRequest } from 'http';

const EXPO_PORT = process.env.EXPO_PORT || 8082;
const ADMIN_PORT = process.env.ADMIN_PORT || 3000;
const PROXY_PORT = process.env.PROXY_PORT || 4000;
const MAX_BODY = 10 * 1024 * 1024; // 10MB max request body

// Headers we never forward upstream
const HOP_HEADERS = new Set([
  'transfer-encoding', 'connection', 'keep-alive', 'upgrade',
  'proxy-authorization', 'proxy-authenticate', 'te', 'trailer',
]);

function sanitizeHeaders(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!HOP_HEADERS.has(k.toLowerCase())) out[k] = v;
  }
  return out;
}

function proxy(req, res, targetPort, rewritePath) {
  // Reject oversized bodies
  const cl = parseInt(req.headers['content-length'] || '0', 10);
  if (cl > MAX_BODY) {
    res.writeHead(413);
    res.end('Payload too large');
    return;
  }

  const opts = {
    hostname: '127.0.0.1',
    port: targetPort,
    path: rewritePath ?? req.url,
    method: req.method,
    headers: sanitizeHeaders(req.headers),
  };

  const proxyReq = httpRequest(opts, (proxyRes) => {
    const headers = { ...proxyRes.headers };
    // Security headers on every response
    headers['X-Content-Type-Options'] = 'nosniff';
    headers['X-Frame-Options'] = 'SAMEORIGIN';
    headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (e) => {
    res.writeHead(502);
    res.end('Upstream unavailable');
  });

  req.pipe(proxyReq, { end: true });
}

createServer((req, res) => {
  if (req.url.startsWith('/admin')) {
    const rewritten = req.url.replace(/^\/admin/, '') || '/';
    proxy(req, res, ADMIN_PORT, rewritten);
  } else {
    proxy(req, res, EXPO_PORT);
  }
}).listen(PROXY_PORT, () => {
  console.log(`\n  PROXY → http://localhost:${PROXY_PORT}`);
  console.log(`    /admin/*  → localhost:${ADMIN_PORT}`);
  console.log(`    /*        → localhost:${EXPO_PORT}\n`);
});
