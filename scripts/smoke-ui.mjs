#!/usr/bin/env node
/**
 * Optional browser verification, deliberately outside the zero-dependency runtime.
 * Install Playwright separately, then:
 * PLAYWRIGHT_MODULE_PATH=/absolute/path/to/playwright \
 * CHROMIUM_EXECUTABLE_PATH=/absolute/path/to/chromium node scripts/smoke-ui.mjs
 * Omit CHROMIUM_EXECUTABLE_PATH to use Playwright's installed Chromium.
 * Screenshots default to a temporary directory; set UI_SCREENSHOT_DIR to retain them.
 * The browser clock uses a date inside the checked-in catalog's review window.
 */
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { startServer } from './serve.mjs';
import { CATALOG } from '../src/catalog.mjs';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright'));
} catch {
  console.error('This optional check needs Playwright. Set PLAYWRIGHT_MODULE_PATH to an installed Playwright module.');
  process.exit(1);
}
const screenshotDirectory = process.env.UI_SCREENSHOT_DIR || await mkdtemp(path.join(os.tmpdir(), 'php-response-ui-'));
await mkdir(screenshotDirectory, { recursive: true });
const fixedTime = new Date(Date.parse(CATALOG.reviewedAt) + 24 * 3600000);
const storageKey = 'php-response-desk.fleet.v1';
const server = await startServer({ port: 0 });
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
let activePage;
const errors = [];
const requests = [];
let checks = 0;
const passed = (message) => { checks++; console.log(`PASS ${message}`); };

try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, timezoneId: 'UTC', acceptDownloads: true });
  const page = await context.newPage();
  activePage = page;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', (request) => requests.push(request.url()));
  await page.clock.install({ time: fixedTime });
  await page.goto(origin);
  const rows = async (count) => page.waitForFunction((expected) => document.querySelectorAll('#fleetRows tr').length === expected, count);
  const saved = async () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
  const closeEditor = async () => page.locator('#editorDialog [data-close="editorDialog"]').first().click();
  const confirm = async () => { await page.locator('#confirmAction').click(); await page.locator('#confirmDialog').waitFor({ state: 'hidden' }); };
  const downloadText = async (trigger) => {
    const waiting = page.waitForEvent('download');
    await trigger();
    const download = await waiting;
    assert.equal(await download.failure(), null);
    return readFile(await download.path(), 'utf8');
  };
  const importFile = async (data, filename = 'inventory.json') => {
    await page.locator('#importFile').setInputFiles({ name: filename, mimeType: 'application/json', buffer: Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)) });
    if (typeof data !== 'string' && new Set(data.assets.map((asset) => asset.id)).size === data.assets.length) {
      await page.waitForFunction(({ organization, count }) => document.querySelector('#importDialog').open
        && document.querySelector('#importDescription').textContent.startsWith(`${count} site record`)
        && document.querySelector('#importDescription').textContent.includes(`“${organization}”`), { organization: data.organization, count: data.assets.length });
    }
  };
  const submitImport = async () => {
    await page.locator('#importForm button[type="submit"]').click();
    await page.locator('#importDialog').waitFor({ state: 'hidden' });
  };

  await rows(8);
  assert.equal(await page.locator('#demoBanner').isVisible(), true);
  assert.deepEqual(await page.locator('.metric-number').allTextContents(), ['2', '3', '2', '1']);
  assert.equal((await saved()).demo, true);
  assert.equal(await page.evaluate(() => document.body.scrollWidth <= innerWidth), true);
  passed('Initial demo: eight sites, all four evidence outcomes, persistent local state, no desktop overflow');

  await page.locator('#searchInput').fill('Legacy');
  await rows(1);
  assert.match(await page.locator('#fleetRows').textContent(), /Legacy catalog/);
  await page.locator('#searchInput').fill('');
  await page.locator('#clientFilter').selectOption('Atlas Workshop');
  await rows(2);
  await page.locator('#navReports').click();
  assert.equal(await page.locator('#reportClient').inputValue(), 'Atlas Workshop');
  const report = await downloadText(() => page.locator('#reportForm button[type="submit"]').click());
  assert.match(report, /Atlas Workshop/);
  assert.doesNotMatch(report, /Fern &amp; Field|Harbor Goods|Juniper Studio/);
  const csv = await downloadText(() => page.locator('#exportCsvButton').click());
  assert.match(csv, /Atlas Workshop/);
  assert.doesNotMatch(csv, /Harbor Goods|Juniper Studio/);
  const workspaceExport = JSON.parse(await downloadText(() => page.locator('#exportJsonButton').click()));
  assert.equal(workspaceExport.assets.length, 8);
  assert.equal(workspaceExport.assets.some((asset) => Object.hasOwn(asset, 'assessment')), false);
  passed('Search, client filter, scoped HTML/CSV downloads, complete raw JSON export');

  await page.locator('#clientFilter').selectOption('');
  await page.locator('.metric[data-status="action-required"]').click();
  await rows(2);
  await page.locator('.metric[data-status="action-required"]').click();
  await rows(8);
  await page.locator('[data-view="queue"]').click();
  await rows(5);
  await page.locator('.metric[data-status="evidence-complete"]').click();
  await rows(2);
  assert.match(await page.locator('#pageTitle').textContent(), /clear answer/);
  await page.locator('[data-view="overview"]').click();
  await rows(8);
  passed('Status filters, filter toggle, evidence queue, completed-record navigation');

  const original = await saved();
  await page.getByRole('button', { name: 'Legacy catalog', exact: true }).click();
  await page.locator('#siteName').fill('Unsaved name');
  await closeEditor();
  assert.deepEqual(await saved(), original);
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Legacy catalog');
  await page.getByRole('button', { name: 'Legacy catalog', exact: true }).click();
  await page.locator('#assetForm [name="owner"]').fill('Edited operations');
  await page.locator('#assetForm button[type="submit"]').click();
  await page.locator('#editorDialog').waitFor({ state: 'hidden' });
  const edited = (await saved()).assets.find((asset) => asset.name === 'Legacy catalog');
  assert.equal(edited.owner, 'Edited operations');
  assert.equal(edited.observedAt, original.assets.find((asset) => asset.name === 'Legacy catalog').observedAt);
  passed('Cancel preserves stored evidence and restores focus; saving preserves untouched timestamp precision');

  await page.locator('#demoEmptyButton').click();
  await page.locator('#confirmDialog [value="cancel"]').click();
  await rows(8);
  await page.locator('#demoEmptyButton').click();
  await confirm();
  await rows(0);
  assert.equal((await saved()).demo, false);
  assert.equal(await page.locator('#demoBanner').isVisible(), false);
  await page.locator('#addButton').click();
  await page.locator('#siteName').fill('Meridian storefront');
  await page.locator('#assetForm [name="client"]').fill('Meridian client');
  await page.locator('#assetForm [name="owner"]').fill('Test operator');
  await page.locator('#assetForm [name="phpVersion"]').fill(CATALOG.fixedVersions['8.4']);
  await page.locator('#assetForm [name="distribution"]').selectOption('upstream');
  await page.locator('#assetForm [name="observation"]').selectOption('web-runtime');
  await page.locator('#assetForm [name="reviewer"]').fill('Test reviewer');
  await page.locator('#assetForm [name="evidenceNote"]').fill('Synthetic smoke-test evidence: active web runtime and all workers checked.');
  const dateInput = (hoursAgo) => new Date(fixedTime.getTime() - hoursAgo * 3600000).toISOString().slice(0, 16);
  await page.locator('#assetForm [name="restartConfirmedAt"]').fill(dateInput(2));
  await page.locator('#assetForm [name="observedAt"]').fill(dateInput(1));
  await page.locator('#assetForm [name="smokeTestAt"]').fill(dateInput(0.5));
  await page.locator('#assetForm button[type="submit"]').click();
  await rows(1);
  assert.equal(await page.locator('#completeCount').textContent(), '1');
  await page.reload();
  await rows(1);
  assert.equal((await saved()).assets[0].name, 'Meridian storefront');
  await page.getByRole('button', { name: 'Meridian storefront', exact: true }).click();
  await page.locator('#deleteButton').click();
  await page.locator('#confirmDialog [value="cancel"]').click();
  assert.equal((await saved()).assets.length, 1);
  await page.locator('#deleteButton').click();
  await confirm();
  await rows(0);
  passed('Reset confirmation, add evidence, correct completed outcome, reload persistence, delete/cancel');

  const importFleet = { schemaVersion: 1, organization: 'Import laboratory', demo: false, assets: [
    { id: 'one', name: '<img src=x onerror=window.attack=true>', client: 'Client A', evidenceUrl: 'javascript:alert(1)' },
    { id: 'two', name: 'Second application', client: 'Client B', observedAt: '2026-02-30T12:00:00Z' },
  ] };
  await importFile(importFleet);
  await page.locator('#importDialog').waitFor({ state: 'visible' });
  await page.locator('#importDialog [data-close="importDialog"]').first().click();
  assert.equal((await saved()).assets.length, 0);
  await importFile(importFleet);
  await submitImport();
  await rows(2);
  assert.equal(await page.locator('#fleetRows img').count(), 0);
  assert.equal(await page.locator('a[href^="javascript:"]').count(), 0);
  assert.equal(await page.evaluate(() => window.attack), undefined);
  assert.match(await page.locator('#fleetRows').textContent(), /<img src=x/);
  await page.getByRole('button', { name: 'Second application', exact: true }).click();
  await page.locator('#assetForm [name="owner"]').fill('New owner');
  await page.locator('#assetForm button[type="submit"]').click();
  await page.locator('#editorDialog').waitFor({ state: 'hidden' });
  assert.equal((await saved()).assets.find((asset) => asset.id === 'two').observedAt, '2026-02-30T12:00:00Z');
  const beforeInvalid = await saved();
  await importFile('{ broken JSON');
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('Import failed:'));
  assert.deepEqual(await saved(), beforeInvalid);
  await importFile(' '.repeat(5 * 1024 * 1024 + 1));
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('5 MiB'));
  assert.deepEqual(await saved(), beforeInvalid);
  await importFile({ ...importFleet, assets: [importFleet.assets[0], importFleet.assets[0]] });
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('Duplicate asset id'));
  assert.deepEqual(await saved(), beforeInvalid);
  passed('Import preview/cancel, literal untrusted text, dangerous links absent, invalid dates preserved, malformed/oversize/duplicate imports retained previous state');

  await importFile({ schemaVersion: 1, organization: 'Merged name ignored', demo: false, assets: [
    { id: 'one', name: 'Updated first application', client: 'Client A' },
    { id: 'three', name: 'Third application', client: 'Client C' },
  ] });
  await page.locator('#importMode').selectOption('merge');
  await submitImport();
  await rows(3);
  const merged = await saved();
  assert.equal(merged.organization, 'Import laboratory');
  assert.equal(merged.assets.find((asset) => asset.id === 'one').name, 'Updated first application');
  assert.equal(merged.assets.find((asset) => asset.id === 'two').name, 'Second application');
  await importFile({ schemaVersion: 1, organization: 'Replacement workspace', demo: false, assets: [{ id: 'only', name: 'Replacement site', client: 'Only client' }] });
  await submitImport();
  await rows(1);
  assert.equal((await saved()).organization, 'Replacement workspace');
  await importFile(workspaceExport);
  await page.locator('#importDialog').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#importMode option[value="merge"]').evaluate((option) => option.disabled), true);
  await page.locator('#importDialog [data-close="importDialog"]').first().click();
  assert.equal((await saved()).assets.length, 1);
  passed('Merge replaces matching IDs and retains other sites; replace changes workspace; demo/real merge blocked');

  await page.locator('#demoButton').click();
  await confirm();
  await rows(8);
  await page.locator('#navSources').click();
  assert.ok(await page.locator('#sourceLinks a').count() >= 2);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.locator('#workspaceButton').click();
  await page.locator('#organizationInput').fill('Northstar Web · Demo');
  await page.locator('#workspaceForm button[type="submit"]').click();
  await page.locator('#workspaceDialog').waitFor({ state: 'hidden' });
  await page.locator('#toast').waitFor({ state: 'hidden' });
  await page.screenshot({ path: path.join(screenshotDirectory, 'dashboard.png'), fullPage: true });
  passed('Demo restoration, primary-source dialog, organization rename, desktop screenshot');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await rows(8);
  assert.equal(await page.evaluate(() => document.body.scrollWidth <= innerWidth), true);
  await page.locator('[data-view="queue"]').click();
  await rows(5);
  await page.locator('[data-view="overview"]').click();
  await page.locator('#addButton').click();
  const drawerBox = await page.locator('#editorDialog').boundingBox();
  assert.ok(drawerBox.x >= 0 && drawerBox.x + drawerBox.width <= 391);
  assert.equal(await page.locator('.drawer-body').evaluate((node) => node.scrollWidth <= node.clientWidth), true);
  assert.equal(await page.locator('#siteName').isVisible(), true);
  await page.locator('#siteName').fill('Mobile unsaved');
  await page.screenshot({ path: path.join(screenshotDirectory, 'mobile-editor.png'), fullPage: true });
  await page.keyboard.press('Escape');
  assert.equal((await saved()).assets.length, 8);
  await page.locator('#workspaceButton').click();
  await page.locator('#settingsResetButton').click();
  await confirm();
  await rows(0);
  await page.locator('#workspaceButton').click();
  await page.locator('#settingsDemoButton').click();
  await confirm();
  await rows(8);
  await page.locator('#toast').waitFor({ state: 'hidden' });
  await page.screenshot({ path: path.join(screenshotDirectory, 'mobile.png'), fullPage: true });
  passed('390 px responsive layout without page overflow, mobile navigation/editor, Escape cancel, mobile reset/demo');

  const recoveryContext = await browser.newContext({ timezoneId: 'UTC' });
  const recoveryPage = await recoveryContext.newPage();
  await recoveryPage.addInitScript((key) => localStorage.setItem(key, '{ corrupt saved data'), storageKey);
  await recoveryPage.clock.install({ time: fixedTime });
  await recoveryPage.goto(origin);
  await recoveryPage.locator('#recoveryWarning').waitFor({ state: 'visible' });
  assert.equal(await recoveryPage.evaluate((key) => localStorage.getItem(key), storageKey), '{ corrupt saved data');
  assert.match(await recoveryPage.locator('#saveState').textContent(), /recovery/);
  await recoveryContext.close();
  passed('Corrupt stored inventory is preserved for recovery without automatic overwrite');

  assert.deepEqual(errors, [], 'Browser JavaScript and CSP console errors');
  assert.equal(requests.every((url) => url.startsWith(origin)), true, 'Dashboard must not make external requests');
  passed('Zero JavaScript/CSP console errors and zero external requests during the workflow');
  console.log(`\n${checks} browser verification groups passed. Screenshots: ${screenshotDirectory}`);
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    console.error('UI failure context:', await activePage.evaluate(() => ({
      rows: document.querySelectorAll('#fleetRows tr').length,
      openDialogs: [...document.querySelectorAll('dialog[open]')].map((dialog) => dialog.id),
      importMode: document.querySelector('#importMode')?.value,
      mergeDisabled: document.querySelector('#importMode option[value="merge"]')?.disabled,
      importError: document.querySelector('#importError')?.textContent,
      importDescription: document.querySelector('#importDescription')?.textContent,
      demo: JSON.parse(localStorage.getItem('php-response-desk.fleet.v1') || '{}').demo,
      toast: document.querySelector('#toast')?.textContent,
    })).catch(() => ({})));
  }
  throw error;
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
