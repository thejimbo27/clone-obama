// Reverse proxy — single entry point for ngrok
// Routes /admin/* → admin panel (3000), everything else → Expo (8082)

import { createServer } from 'http';
import { request as httpRequest } from 'http';

const EXPO_PORT = process.env.EXPO_PORT || 8082;
const ADMIN_PORT = process.env.ADMIN_PORT || 3000;
const PROXY_PORT = process.env.PROXY_PORT || 4000;

function proxy(req, res, targetPort, rewritePath) {
  const opts = {
    hostname: '127.0.0.1',
    port: targetPort,
    path: rewritePath ?? req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = httpRequest(opts, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (e) => {
    res.writeHead(502);
    res.end(`Upstream unavailable: ${e.message}`);
  });

  req.pipe(proxyReq, { end: true });
}

createServer((req, res) => {
  if (req.url.startsWith('/admin')) {
    // Strip /admin prefix for the admin app
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
