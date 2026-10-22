#!/usr/bin/env node
import http from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

async function publicRoutes() {
  const routes = new Map();
  // Serve only intentional application assets. Inventory, reports, docs,
  // package metadata, dotfiles, and the repository itself stay inaccessible.
  async function addDirectory(directory, prefix, allowed) {
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const location = path.join(directory, entry.name);
      const route = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) await addDirectory(location, route, allowed);
      else if (entry.isFile() && allowed.has(path.extname(entry.name))) routes.set(route, location);
      // Symbolic links are deliberately not followed.
    }
  }
  await addDirectory(path.join(root, 'public'), '', new Set(Object.keys(contentTypes)));
  await addDirectory(path.join(root, 'src'), '/src', new Set(['.mjs', '.js']));
  if (routes.has('/index.html')) routes.set('/', routes.get('/index.html'));
  return routes;
}

export async function createDeskServer() {
  const routes = await publicRoutes();
  return http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    // Localhost binding plus Host validation blocks remote and DNS-rebinding use.
    if (!/^(?:127\.0\.0\.1|localhost)(?::[0-9]{1,5})?$/i.test(request.headers.host || '')) {
      response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('This workspace is available on localhost only.');
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Method not allowed.');
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (pathname.includes('\0') || pathname.includes('\\')) throw new Error('Invalid path');
    } catch {
      response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Invalid request path.');
      return;
    }
    const file = routes.get(pathname);
    if (!file) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found.');
      return;
    }
    try {
      const data = await readFile(file);
      response.writeHead(200, {
        'Content-Type': contentTypes[path.extname(file)],
        'Content-Length': data.length,
      });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Unable to read application asset.');
    }
  });
}

export async function startServer({ port = 4380 } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Port must be an integer from 0 to 65535.');
  const server = await createDeskServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const value = process.env.PORT || '4380';
  if (!/^\d+$/.test(value)) {
    console.error('PORT must be an integer from 1 to 65535.');
    process.exitCode = 1;
  } else {
    try {
      const port = Number(value);
      if (port < 1) throw new Error('PORT must be at least 1.');
      const server = await startServer({ port });
      console.log(`PHP Response Desk · http://127.0.0.1:${server.address().port}`);
      console.log('Local workspace. No accounts, uploads, or external requests. Press Ctrl+C to stop.');
    } catch (error) {
      console.error(`Could not start PHP Response Desk: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
