const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '../..');
const root = process.env.STATIC_SITE_ROOT
  ? path.resolve(projectRoot, process.env.STATIC_SITE_ROOT)
  : projectRoot;
if (root !== projectRoot && !root.startsWith(`${projectRoot}${path.sep}`)) {
  throw new Error(`STATIC_SITE_ROOT must stay inside the project: ${root}`);
}
const port = 4173;
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Bad Request');
    return;
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.resolve(root, relativePath);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      fs.readFile(path.join(root, '404.html'), (notFoundError, notFoundPage) => {
        response.writeHead(404, {
          'Cache-Control': 'no-store',
          'Content-Type': 'text/html; charset=utf-8'
        });
        response.end(notFoundError ? 'Not Found' : notFoundPage);
      });
      return;
    }

    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream'
    });
    response.end(contents);
  });
});

server.listen(port, '127.0.0.1');

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
