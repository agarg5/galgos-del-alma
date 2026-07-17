// Local dev server for the Vercel serverless function in api/chat.js.
// Run with: ANTHROPIC_API_KEY=... node dev-api.js   (or source your shell env)
// vite.config.js proxies /api/* here so `npm run dev` exercises the same
// proxy path the deployed site uses.
import http from 'node:http';
import handler from './api/chat.js';

const PORT = process.env.DEV_API_PORT || 8787;

http.createServer(async (req, res) => {
  if (req.url !== '/api/chat') {
    res.statusCode = 404;
    return res.end('not found');
  }

  let raw = '';
  for await (const chunk of req) raw += chunk;
  try {
    req.body = raw ? JSON.parse(raw) : {};
  } catch {
    req.body = null;
  }

  // Minimal shim for the Vercel response helpers the handler uses
  res.status = code => { res.statusCode = code; return res; };
  res.json = obj => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); return res; };

  try {
    await handler(req, res);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: { message: err.message } });
    else res.end();
  }
}).listen(PORT, () => {
  console.log(`dev API proxy listening on http://localhost:${PORT}`);
});
