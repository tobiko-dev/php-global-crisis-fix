import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const CLI = fileURLToPath(new URL('../bin/php-response.mjs', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', timeout: 15000 });
const workspace = () => mkdtempSync(path.join(os.tmpdir(), 'php-response-test-'));

test('CLI help and JSON demonstration work without installing dependencies', () => {
  const help = run('--help');
  assert.equal(help.status, 0);
  assert.match(help.stdout, /PHP Response Desk/);
  const demo = run('demo');
  assert.equal(demo.status, 0, demo.stderr);
  const data = JSON.parse(demo.stdout);
  assert.equal(data.demo, true);
  assert.equal(data.assets.length, 8);
});

test('CLI assessed JSON round-trips with computed statuses ignored', () => {
  const dir = workspace();
  try {
    const input = path.join(dir, 'input.json');
    const first = run('demo');
    const data = JSON.parse(first.stdout);
    data.assets[0].phpVersion = '8.4.26';
    data.assets[0].distribution = 'upstream';
    data.assets[0].observation = 'web-runtime';
    data.assets[0].assessment.status = 'evidence-complete';
    writeFileSync(input, JSON.stringify(data));
    const second = run('assess', input);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(JSON.parse(second.stdout).assets[0].assessment.status, 'action-required');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('CLI fail-on-open has a distinct exit code while preserving valid output', () => {
  const result = run('demo', '--fail-on-open');
  assert.equal(result.status, 2, result.stderr);
  assert.ok(JSON.parse(result.stdout).summary.actionRequired > 0);
});

test('CLI filters a single client in JSON, CSV and HTML without other-client leakage', () => {
  for (const format of ['json', 'csv', 'html']) {
    const result = run('demo', '--client', 'Fern & Field', '--format', format);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.includes('Harbor Goods'), false);
    assert.equal(result.stdout.includes('Juniper Studio'), false);
    assert.equal(result.stdout.includes('Atlas Workshop'), false);
    if (format === 'json') assert.equal(JSON.parse(result.stdout).assets.length, 2);
  }
  assert.equal(run('demo', '--client', 'Fern').status, 1);
});

test('CLI output refuses to overwrite existing reports or input files', () => {
  const dir = workspace();
  try {
    const output = path.join(dir, 'nested', 'report.html');
    const first = run('demo', '--format', 'html', '--out', output);
    assert.equal(first.status, 0, first.stderr);
    const saved = readFileSync(output, 'utf8');
    assert.match(saved, /DEMONSTRATION/);
    assert.equal(run('demo', '--out', output).status, 1);
    assert.equal(readFileSync(output, 'utf8'), saved);
    if (process.platform !== 'win32') assert.equal(statSync(output).mode & 0o777, 0o600);
    const input = path.join(dir, 'input.json');
    writeFileSync(input, run('demo').stdout);
    assert.equal(run('assess', input, '--out', input).status, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('CLI rejects malformed input and keeps stdout clean on failure', () => {
  const dir = workspace();
  try {
    const file = path.join(dir, 'bad.json');
    for (const invalid of ['{', '{"schemaVersion":2}', '[]']) {
      writeFileSync(file, invalid);
      const result = run('assess', file);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /Invalid fleet/);
    }
    assert.equal(run('demo', '--format', 'pdf').status, 1);
    assert.equal(run('demo', '--format').status, 1);
    assert.equal(run('demo', '--format', 'html', '--format', 'json').status, 1);
    assert.equal(run('assess').status, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('CLI empty inventory cannot pass fail-on-open', () => {
  const dir = workspace();
  try {
    const file = path.join(dir, 'empty.json');
    writeFileSync(file, JSON.stringify({ schemaVersion: 1, organization: 'Example', assets: [] }));
    assert.equal(run('assess', file, '--fail-on-open').status, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('CLI rejects an oversized file before JSON parsing', () => {
  const dir = workspace();
  try {
    const file = path.join(dir, 'large.json');
    writeFileSync(file, 'x'.repeat(5 * 1024 * 1024 + 1));
    const result = run('assess', file);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /5 MiB/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
