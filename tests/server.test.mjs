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

test('serves the dashboard and shared modules with appropriate content types', async () => {
  for (const [path, type, content] of [
    ['/', 'text/html', 'PHP Response Desk'],
    ['/styles.css', 'text/css', '.sidebar'],
    ['/app.mjs', 'text/javascript', 'normalizeFleet'],
    ['/src/core.mjs', 'text/javascript', 'assessFleet'],
    ['/src/catalog.mjs', 'text/javascript', 'CVE-2026-109618'],
  ]) {
    const result = await request(path);
    assert.equal(result.status, 200, path);
    assert.ok(result.headers['content-type'].startsWith(type), path);
    assert.ok(result.body.includes(content), path);
    assert.equal(result.headers['cache-control'], 'no-store');
  }
  const head = await request('/', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
  assert.ok(Number(head.headers['content-length']) > 0);
});

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
