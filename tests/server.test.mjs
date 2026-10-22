import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { startServer } from '../scripts/serve.mjs';

let server;
let port;
before(async () => { server = await startServer({ port: 0 }); port = server.address().port; });
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); });

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method: options.method || 'GET', headers: options.headers || {} }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('does not expose repository files or escaped paths', async () => {
  for (const path of ['/.git/config', '/README.md', '/package.json', '/collectors/collect.py', '/reports/client.html', '/private/inventory.json', '/%2e%2e/package.json', '/src/../package.json', '/src/%2e%2e/%2e%2e/.env']) {
    const result = await request(path);
    assert.equal(result.status, 404, path);
  }
});

test('rejects untrusted Host header and mutation requests', async () => {
  assert.equal((await request('/', { headers: { Host: 'evil.example' } })).status, 403);
  assert.equal((await request('/', { headers: { Host: 'user@localhost' } })).status, 403);
  assert.equal((await request('/', { method: 'POST' })).status, 405);
});

test('malformed escaped path is rejected and errors have privacy headers', async () => {
  const result = await request('/%ZZ');
  assert.equal(result.status, 400);
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.equal(result.headers['x-content-type-options'], 'nosniff');
  assert.match(result.headers['content-security-policy'], /frame-ancestors 'none'/);
});
