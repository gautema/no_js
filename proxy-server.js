import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Quote endpoint for HTMX demo
const quotes = [
  { text: 'HTML er kraftigere enn du tror.', author: 'Web-utvikler' },
  { text: 'Mindre JavaScript, bedre ytelse.', author: 'Performance Guru' },
  { text: 'HTMX gjør backend-utviklere lykkelige.', author: 'Full-stack Dev' },
  { text: 'Hypermedia er fremtiden.', author: 'Roy Fielding (kanskje)' },
  { text: 'SPAs er ikke alltid svaret.', author: 'Pragmatisk utvikler' }
];

app.get('/api/quote', (req, res) => {
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  res.send(`
    <div>
      <p style="font-size: 1.3rem; font-style: italic; margin-bottom: 0.5rem;">
        "${quote.text}"
      </p>
      <p style="color: #6b7280; text-align: right;">
        — ${quote.author}
      </p>
    </div>
  `);
});

// Track active connections to prevent rate limiting
let activeConnections = 0;
const MAX_CONNECTIONS = 2;

// Proxy endpoint for bad apple demo with connection limiting
app.use('/api/bad-apple', (req, res, next) => {
  if (activeConnections >= MAX_CONNECTIONS) {
    console.log(`Rate limit: ${activeConnections} active connections, rejecting request`);
    return res.status(429).send('Too many connections');
  }

  activeConnections++;
  console.log(`Active connections: ${activeConnections}`);

  // Clean up on close
  res.on('close', () => {
    activeConnections--;
    console.log(`Connection closed. Active connections: ${activeConnections}`);
  });

  next();
}, createProxyMiddleware({
  target: 'https://data-star.dev',
  changeOrigin: true,
  pathRewrite: {
    '^/api/bad-apple': '/examples/bad_apple/updates'
  },
  onProxyRes: (proxyRes, req, res) => {
    // Ensure proper SSE headers
    proxyRes.headers['cache-control'] = 'no-cache';
    proxyRes.headers['connection'] = 'keep-alive';
  }
}));

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
