#!/usr/bin/env node
/** Optional real-browser experiment; Playwright is installed separately. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { startServer } from './serve.mjs';
import { makeDemoFleet } from '../src/core.mjs';
import { CATALOG } from '../src/catalog.mjs';

const require = createRequire(import.meta.url);
const playwrightPath = process.env.PLAYWRIGHT_MODULE_PATH || 'playwright';
let chromium;
try { ({ chromium } = require(playwrightPath)); }
catch { console.error('Install Playwright separately and set PLAYWRIGHT_MODULE_PATH.'); process.exit(1); }
const output = process.argv[2] || 'docs/evidence/browser-capacity.json';
const fixedTime = new Date(Date.parse(CATALOG.reviewedAt) + 24 * 3600000);
const sizes = [10, 100, 1000];
const trials = 3;
const budgets = { 10: 2000, 100: 2000, 1000: 5000, filter: 1000 };
const seed = makeDemoFleet(fixedTime).assets;
const server = await startServer({ port: 0 });
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const result = {
  schemaVersion: 1,
  experiment: 'real-browser-fleet-capacity-v1',
  generatedAt: new Date().toISOString(),
  protocolDate: '2026-10-21 America/Chicago',
  assessmentDate: fixedTime.toISOString(),
  fictionalData: true,
  criteria: { trialsPerSize: trials, importMilliseconds: { 10: 2000, 100: 2000, 1000: 5000 }, filterMilliseconds: budgets.filter },
  environment: { node: process.version, platform: process.platform, architecture: process.arch, cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, memoryGiB: Math.round(os.totalmem() / 2 ** 30), viewport: { width: 1440, height: 1000 } },
  samples: [],
};

try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  result.environment.chromium = browser.version();
  for (const size of sizes) {
    const fleet = { schemaVersion: 1, organization: `Capacity experiment ${size} — fictional`, demo: true, assets: Array.from({ length: size }, (_, index) => ({ ...structuredClone(seed[index % seed.length]), id: `capacity-${size}-${index}`, name: `Synthetic application ${index + 1}`, client: `Fictional customer ${String(index % 10 + 1).padStart(2, '0')}` })) };
    const buffer = Buffer.from(JSON.stringify(fleet));
    for (let trial = 1; trial <= trials; trial++) {
      const context = await browser.newContext({ viewport: result.environment.viewport, timezoneId: 'UTC' });
      const page = await context.newPage();
      const errors = [];
      const external = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('request', request => { if (!request.url().startsWith(origin)) external.push(request.url()); });
      await page.clock.setFixedTime(fixedTime);
      await page.goto(origin);
      await page.waitForFunction(() => document.querySelectorAll('#fleetRows tr').length === 8);
      await page.locator('#importFile').setInputFiles({ name: `capacity-${size}.json`, mimeType: 'application/json', buffer });
      await page.waitForFunction(expected => document.querySelector('#importDialog').open && document.querySelector('#importDescription').textContent.includes(expected), fleet.organization);
      await page.evaluate(expected => {
        window.capacityTiming = {};
        document.querySelector('#importForm').addEventListener('submit', () => {
          const start = performance.now();
          requestAnimationFrame(() => requestAnimationFrame(() => {
            window.capacityTiming.importMs = performance.now() - start;
            window.capacityTiming.importRows = document.querySelectorAll('#fleetRows tr').length;
            window.capacityTiming.expected = expected;
          }));
        }, { capture: true, once: true });
      }, size);
      await page.locator('#importForm button[type="submit"]').click();
      await page.waitForFunction(() => Number.isFinite(window.capacityTiming.importMs));
      await page.evaluate(() => {
        document.querySelector('#clientFilter').addEventListener('change', () => {
          const start = performance.now();
          requestAnimationFrame(() => requestAnimationFrame(() => {
            window.capacityTiming.filterMs = performance.now() - start;
            window.capacityTiming.filterRows = document.querySelectorAll('#fleetRows tr').length;
          }));
        }, { capture: true, once: true });
      });
      await page.locator('#clientFilter').selectOption('Fictional customer 01');
      await page.waitForFunction(() => Number.isFinite(window.capacityTiming.filterMs));
      const timing = await page.evaluate(() => ({ ...window.capacityTiming, storedRows: JSON.parse(localStorage.getItem('php-response-desk.fleet.v1')).assets.length }));
      const sample = { assets: size, trial, inputBytes: buffer.length, importMs: Number(timing.importMs.toFixed(2)), filterMs: Number(timing.filterMs.toFixed(2)), importRows: timing.importRows, filterRows: timing.filterRows, storedRows: timing.storedRows, browserErrors: errors, externalRequests: external };
      sample.passed = sample.importRows === size && sample.storedRows === size && sample.filterRows === Math.ceil(size / 10) && sample.importMs <= budgets[size] && sample.filterMs <= budgets.filter && !errors.length && !external.length;
      result.samples.push(sample);
      console.log(JSON.stringify(sample));
      await context.close();
    }
  }
  result.passed = result.samples.length === sizes.length * trials && result.samples.every(sample => sample.passed);
} catch (error) {
  result.passed = false;
  result.executionError = String(error.stack || error);
  console.error(error.message);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Results saved to ${output}`);
}
assert.equal(result.passed, true, 'Capacity experiment did not meet its declared criteria; inspect raw results.');
