export default function(eleventyConfig) {
  // Copy CSS files to output
  eleventyConfig.addPassthroughCopy("src/css");

  // Proxy API requests to the backend server
  eleventyConfig.setServerOptions({
    middleware: [
      async (req, res, next) => {
        if (req.url.startsWith('/api/')) {
          // Proxy to backend server
          const targetUrl = `http://localhost:3001${req.url}`;
          try {
            // Collect request body if present
            let body = '';
            if (req.method !== 'GET' && req.method !== 'HEAD') {
              await new Promise((resolve) => {
                req.on('data', chunk => body += chunk);
                req.on('end', resolve);
              });
            }

            const response = await fetch(targetUrl, {
              method: req.method,
              headers: {
                'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
              },
              body: body || undefined
            });

            const data = await response.text();
            res.writeHead(response.status, {
              'Content-Type': response.headers.get('content-type') || 'text/html'
            });
            res.end(data);
          } catch (error) {
            res.writeHead(502);
            res.end('Proxy error: ' + error.message);
          }
        } else {
          next();
        }
      }
    ]
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes"
    }
  };
}
