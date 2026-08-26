const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '../..');
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function resolveRoot() {
  const root = process.env.STATIC_SITE_ROOT
    ? path.resolve(projectRoot, process.env.STATIC_SITE_ROOT)
    : projectRoot;
  if (root !== projectRoot && !root.startsWith(`${projectRoot}${path.sep}`)) {
    throw new Error(`STATIC_SITE_ROOT must stay inside the project: ${root}`);
  }
  return root;
}

function resolvePort() {
  const port = Number.parseInt(process.env.PLAYWRIGHT_PORT || '4173', 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PLAYWRIGHT_PORT must be an integer between 1 and 65535.');
  }
  return port;
}

async function startStaticServer() {
  const root = resolveRoot();
  const port = resolvePort();
  const sockets = new Set();
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

  server.on('connection', socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  let closed = false;
  return {
    async close() {
      if (closed) return;
      closed = true;
      await new Promise(resolve => {
        const timeout = setTimeout(resolve, 1_000);
        server.close(() => {
          clearTimeout(timeout);
          resolve();
        });
        for (const socket of sockets) socket.destroy();
      });
    }
  };
}

module.exports = { startStaticServer };

if (require.main === module) {
  let runningServer;
  startStaticServer()
    .then(server => {
      runningServer = server;
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });

  async function shutdown() {
    if (runningServer) await runningServer.close();
    process.exit(0);
  }

  for (const signal of ['SIGHUP', 'SIGINT', 'SIGTERM']) process.on(signal, shutdown);
}
