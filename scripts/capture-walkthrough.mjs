#!/usr/bin/env node
/**
 * Reproduce the documented, fictional browser walkthrough from actual interactions.
 * No screenshots are generated or retouched. No production application clock changes.
 * Optional development dependency: Playwright, installed outside this repository.
 *
 * PLAYWRIGHT_MODULE_PATH=/absolute/path/to/playwright \
 * CHROMIUM_EXECUTABLE_PATH=/absolute/path/to/chromium \
 * node scripts/capture-walkthrough.mjs
 *
 * WALKTHROUGH_OUTPUT_DIR and WALKTHROUGH_EXAMPLE_DIR optionally override the
 * default docs/assets/walkthrough and examples/walkthrough directories.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startServer } from './serve.mjs';
import { assessAsset, assessFleet, CATALOG } from '../src/core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.resolve(process.env.WALKTHROUGH_OUTPUT_DIR || path.join(root, 'docs/assets/walkthrough'));
const exampleDirectory = path.resolve(process.env.WALKTHROUGH_EXAMPLE_DIR || path.join(root, 'examples/walkthrough'));
await mkdir(outputDirectory, { recursive: true });
await mkdir(exampleDirectory, { recursive: true });
const require = createRequire(import.meta.url);
const modulePath = process.env.PLAYWRIGHT_MODULE_PATH || 'playwright';
let chromium;
try { ({ chromium } = require(modulePath)); }
catch {
  console.error('Install Playwright separately and set PLAYWRIGHT_MODULE_PATH. See docs/WALKTHROUGH.md.');
  process.exit(1);
}
const fixedTime = new Date(Date.parse(CATALOG.reviewedAt) + 24 * 3600000);
const expiredTime = new Date(Date.parse(CATALOG.expiresAt) + 3600000);
const storageKey = 'php-response-desk.fleet.v1';
const server = await startServer({ port: 0 });
const origin = `http://127.0.0.1:${server.address().port}`;
const screenshots = [];
const browserErrors = [];
const requests = [];
const startedAt = new Date().toISOString();
let browser;
let activePage;

function observe(page) {
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('request', (request) => requests.push(request.url()));
}

async function capture(page, filename, title, assertions, selector) {
  await page.mouse.move(3, 3);
  const location = path.join(outputDirectory, filename);
  if (selector) await page.locator(selector).screenshot({ path: location });
  else await page.screenshot({ path: location, fullPage: false });
  const bytes = await readFile(location);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  screenshots.push({ number: screenshots.length + 1, file: filename, title, width, height,
    crop: selector || 'browser viewport', assertions, sha256: createHash('sha256').update(bytes).digest('hex') });
  console.log(`PASS ${filename} (${width}×${height}) — ${title}`);
}

try {
  browser = await chromium.launch({ headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  console.log(`Chromium ${browser.version()} · fixed demonstration clock ${fixedTime.toISOString()}`);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'UTC', acceptDownloads: true });
  const page = await context.newPage();
  activePage = page;
  observe(page);
  // Fix only Date: native timers and user interaction continue normally.
  await page.clock.setFixedTime(fixedTime);
  await page.goto(origin);

  const rows = async (count) => page.waitForFunction((expected) => document.querySelectorAll('#fleetRows tr').length === expected, count);
  const saved = async () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
  const closeEditor = async () => {
    await page.locator('#editorDialog [data-close="editorDialog"]').first().click();
    await page.locator('#editorDialog').waitFor({ state: 'hidden' });
  };
  const saveEditor = async () => {
    await page.locator('#assetForm button[type="submit"]').click();
    await page.locator('#editorDialog').waitFor({ state: 'hidden' });
  };
  const previewStatus = async (status) => page.locator(`#assessmentPreview .status-${status}`).waitFor({ state: 'visible' });
  const confirm = async () => {
    await page.locator('#confirmAction').click();
    await page.locator('#confirmDialog').waitFor({ state: 'hidden' });
  };
  const hideToastByWaiting = async () => page.locator('#toast').waitFor({ state: 'hidden' });
  const scrollTop = async () => page.evaluate(() => scrollTo(0, 0));

  await rows(8);
  assert.equal((await saved()).demo, true);
  assert.equal(await page.locator('#demoBanner').isVisible(), true);
  assert.deepEqual(await page.locator('.metric-number').allTextContents(), ['2', '3', '2', '1']);
  await capture(page, '01-fleet-overview.png', 'Fictional fleet intake', [
    'Eight demo sites across four clients.', 'Status counts are 2 action, 3 verification, 2 complete, 1 provider.', 'Demo banner is visible.'
  ]);

  await page.locator('[data-view="queue"]').click();
  await rows(5);
  assert.equal(await page.locator('#fleetRows .status-evidence-complete, #fleetRows .status-provider-confirmed').count(), 0);
  await capture(page, '02-evidence-queue.png', 'Unresolved work stays in the queue', [
    'Queue contains five unresolved records.', 'Neither completed evidence nor provider-confirmed records appears in the queue.'
  ]);

  await page.locator('[data-view="overview"]').click();
  await page.locator('#clientFilter').selectOption('Fern & Field');
  await rows(2);
  assert.doesNotMatch(await page.locator('#fleetRows').textContent(), /Harbor Goods|Atlas Workshop|Juniper Studio/);
  await capture(page, '03-customer-filter.png', 'One customer, two environments', [
    'Client filter returns only Fern & Field.', 'The storefront requires action while the booking portal has complete evidence.'
  ], '.inventory-panel');

  await page.getByRole('button', { name: 'Storefront', exact: true }).click();
  await previewStatus('action-required');
  assert.equal(await page.locator('#assetForm [name="phpVersion"]').inputValue(), '8.4.26');
  assert.match(await page.locator('#assessmentPreview').textContent(), /8\.4\.27/);
  await capture(page, '04-outdated-runtime-action.png', 'An outdated runtime has an explicit next action', [
    'The saved 8.4.26 storefront is action-required.', 'Its action plan references the 8.4.27 upstream minimum.'
  ], '#editorDialog');

  // Deliberately model a patch observation that is still only from CLI PHP.
  await page.locator('#assetForm [name="phpVersion"]').fill(CATALOG.fixedVersions['8.4']);
  await page.locator('#assetForm [name="observation"]').selectOption('cli');
  await page.locator('#assetForm [name="restartConfirmedAt"]').fill('');
  await page.locator('#assetForm [name="smokeTestAt"]').fill('');
  await page.locator('#assetForm [name="evidenceNote"]').fill('FICTIONAL WALKTHROUGH: the CLI reports 8.4.27. The active web runtime, worker restart, and application check have not yet been recorded.');
  await saveEditor();
  let storefront = (await saved()).assets.find((asset) => asset.id === 'demo-001');
  assert.equal(assessAsset(storefront, { now: fixedTime }).status, 'verification-needed');
  await page.getByRole('button', { name: 'Storefront', exact: true }).click();
  await previewStatus('verification-needed');
  await capture(page, '05-updated-version-missing-evidence.png', 'A patched CLI version is insufficient', [
    '8.4.27 was saved, but the observation is CLI-only.', 'Missing restart and application-check evidence leaves the record unresolved.'
  ], '#editorDialog');

  await page.locator('#assetForm [name="observation"]').selectOption('web-runtime');
  await page.locator('#assetForm [name="reviewer"]').fill('Demo operator — fictional walkthrough');
  await page.locator('#assetForm [name="evidenceNote"]').fill('FICTIONAL WALKTHROUGH ONLY: all relevant PHP workers were restarted, the active web runtime returned 8.4.27, and storefront browse, cart, and checkout smoke checks passed. These are illustrative records, not tests on a real server.');
  const timeInput = (minutesAgo) => new Date(fixedTime.getTime() - minutesAgo * 60000).toISOString().slice(0, 16);
  await page.locator('#assetForm [name="restartConfirmedAt"]').fill(timeInput(30));
  await page.locator('#assetForm [name="observedAt"]').fill(timeInput(20));
  await page.locator('#assetForm [name="smokeTestAt"]').fill(timeInput(10));
  await saveEditor();
  storefront = (await saved()).assets.find((asset) => asset.id === 'demo-001');
  assert.equal(assessAsset(storefront, { now: fixedTime }).status, 'evidence-complete');
  assert.equal(storefront.restartConfirmedAt, '2026-10-22T13:30:00.000Z');
  assert.equal(storefront.observedAt, '2026-10-22T13:40:00.000Z');
  assert.equal(storefront.smokeTestAt, '2026-10-22T13:50:00.000Z');
  await page.reload();
  await rows(8);
  await page.getByRole('button', { name: 'Storefront', exact: true }).click();
  await previewStatus('evidence-complete');
  assert.equal((await saved()).demo, true);
  await capture(page, '06-complete-evidence-record.png', 'Complete recorded evidence survives reload', [
    'Active web runtime, reviewer, evidence note, restart and application check are saved.',
    'Restart 13:30 UTC precedes observation 13:40 UTC and smoke check 13:50 UTC.',
    'The reloaded record is evidence-complete; the workspace is still explicitly a demo.'
  ], '#editorDialog');
  await closeEditor();

  await page.getByRole('button', { name: 'Customer website', exact: true }).click();
  await previewStatus('provider-confirmed');
  assert.equal(await page.locator('#assetForm [name="coversBothCves"]').isChecked(), true);
  assert.match(await page.locator('#assetForm [name="providerReference"]').inputValue(), /DEMO-482/);
  await page.locator('#providerDetails').scrollIntoViewIfNeeded();
  await capture(page, '07-provider-assertion.png', 'Provider confirmation retains its own evidence trail', [
    'A managed-hosting assertion is provider-confirmed, not upstream runtime evidence-complete.',
    'The reference, reviewer, timestamp and explicit coverage of both CVEs are recorded.'
  ], '#providerDetails');
  await closeEditor();

  const beforeMerge = await saved();
  const update = { schemaVersion: 1, organization: 'DEMO — imported hosting inventory', demo: true, assets: [
    { ...beforeMerge.assets.find((asset) => asset.id === 'demo-004'), owner: 'Demo hosting team' },
    { id: 'demo-009', name: 'DEMO — Seasonal microsite', client: 'Fern & Field', environment: 'staging',
      owner: 'Demo hosting team', provider: 'Fictional managed hosting', distribution: 'unknown', observation: 'unknown',
      evidenceNote: 'FICTIONAL WALKTHROUGH: newly discovered inventory, runtime evidence still missing.' }
  ] };
  const importExample = path.join(exampleDirectory, 'inventory-update.json');
  await writeFile(importExample, `${JSON.stringify(update, null, 2)}\n`);
  await page.locator('#importFile').setInputFiles(importExample);
  await page.waitForFunction(() => document.querySelector('#importDialog').open && document.querySelector('#importDescription').textContent.includes('DEMO — imported hosting inventory'));
  await page.locator('#importMode').selectOption('merge');
  await capture(page, '08-merge-import-preview.png', 'Review a merge before changing inventory', [
    'The preview identifies the imported file as fictional demo data.',
    'Merge by record ID is selected before submission; current inventory has not changed yet.'
  ], '#importDialog');
  assert.deepEqual(await saved(), beforeMerge);
  await page.locator('#importForm button[type="submit"]').click();
  await page.locator('#importDialog').waitFor({ state: 'hidden' });
  await rows(9);
  const afterMerge = await saved();
  assert.equal(afterMerge.assets.find((asset) => asset.id === 'demo-004').owner, 'Demo hosting team');
  assert.equal(afterMerge.assets.filter((asset) => asset.id === 'demo-004').length, 1);
  assert.equal(afterMerge.organization, beforeMerge.organization);
  assert.equal(afterMerge.assets.length, 9);

  const malformed = '{"schemaVersion":99,"organization":"Invalid example","assets":[]}';
  await page.locator('#importFile').setInputFiles({ name: 'invalid-schema.json', mimeType: 'application/json', buffer: Buffer.from(malformed) });
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('Unsupported schemaVersion'));
  assert.deepEqual(await saved(), afterMerge);
  await scrollTop();
  await capture(page, '09-rejected-import-preserved.png', 'A rejected import preserves the nine-site workspace', [
    'Unsupported schemaVersion is rejected visibly.', 'Parsed stored inventory is unchanged under deep comparison; all nine records remain.'
  ]);
  await hideToastByWaiting();

  await page.locator('#clientFilter').selectOption('Fern & Field');
  await rows(3);
  await page.locator('#navReports').click();
  assert.equal(await page.locator('#reportClient').inputValue(), 'Fern & Field');
  assert.match(await page.locator('#reportScope').textContent(), /3 sites · 1 unresolved · Fictional demo data/);
  await capture(page, '10-client-report-scope.png', 'Customer handover has an explicit scope', [
    'The report is scoped to Fern & Field: three sites, one unresolved.',
    'The dialog discloses fictional demo data before downloading.'
  ], '#reportDialog');
  const downloading = page.waitForEvent('download');
  await page.locator('#reportForm button[type="submit"]').click();
  const download = await downloading;
  assert.equal(await download.failure(), null);
  const reportPath = path.join(exampleDirectory, 'client-report.html');
  await download.saveAs(reportPath);
  const reportHtml = await readFile(reportPath, 'utf8');
  assert.match(reportHtml, /DEMONSTRATION — fictional customers and evidence/);
  assert.match(reportHtml, /Fern &amp; Field/);
  assert.doesNotMatch(reportHtml, /Harbor Goods|Atlas Workshop|Juniper Studio/);
  const reportPage = await context.newPage();
  observe(reportPage);
  await reportPage.setViewportSize({ width: 1120, height: 1100 });
  await reportPage.goto(pathToFileURL(reportPath).href);
  assert.equal(await reportPage.locator('article').count(), 3);
  assert.equal(await reportPage.locator('article .evidence-complete').count(), 2);
  assert.equal(await reportPage.locator('article .verification-needed').count(), 1);
  assert.equal(await reportPage.locator('.notice').isVisible(), true);
  await capture(reportPage, '11-downloaded-client-report.png', 'The actual downloaded HTML report renders independently', [
    'This is the file downloaded from the interface, rendered from disk in a new browser tab.',
    'Exactly three Fern & Field records: two complete, one unresolved.',
    'Other customers are absent from the exported HTML; the demonstration warning is visible.'
  ]);
  await reportPage.close();

  await hideToastByWaiting();
  await page.locator('#resetButton').click();
  await confirm();
  await rows(0);
  assert.equal((await saved()).demo, false);
  assert.deepEqual(await page.locator('.metric-number').allTextContents(), ['0', '0', '0', '0']);
  assert.equal(await page.locator('#emptyAction').textContent(), 'Add your first site');
  await hideToastByWaiting();
  await scrollTop();
  await capture(page, '12-empty-workspace.png', 'An explicit empty start removes fictional records', [
    'The user confirmed clearing the workspace.',
    'Zero sites and zero positive outcomes; the next action is to add or import inventory.',
    'No fictional record was silently converted into a real customer record.'
  ]);

  await page.locator('#navSources').click();
  assert.equal(await page.locator('#sourceLinks a').count(), CATALOG.sources.length);
  assert.match(await page.locator('#catalogDetails').textContent(), /72 hours/);
  assert.match(await page.locator('#sourceVersions').textContent(), /8\.4\.27/);
  await capture(page, '13-advisory-sources.png', 'The dated advisory baseline is inspectable', [
    'Catalog ID, review date, expiry, evidence window, CVE scope and upstream minimum versions are shown.',
    'Five primary reference links are present; this is identified as a dated snapshot.'
  ], '#sourcesDialog');
  await page.getByRole('button', { name: 'Done', exact: true }).click();

  await page.locator('#demoButton').click();
  await confirm();
  await rows(8);
  await hideToastByWaiting();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await rows(8);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.scrollingElement.scrollWidth <= innerWidth), true);
  await capture(page, '14-mobile-overview.png', 'The overview works in a 390-pixel viewport', [
    'The four status cards and demo banner are visible in the mobile layout.',
    'Document and scrolling-element widths do not exceed the viewport.'
  ]);
  await page.getByRole('button', { name: 'Storefront', exact: true }).click();
  await previewStatus('action-required');
  const mobileEditor = await page.locator('#editorDialog').boundingBox();
  assert.ok(mobileEditor.x >= 0 && mobileEditor.x + mobileEditor.width <= 390);
  assert.equal(await page.locator('.drawer-body').evaluate((node) => node.scrollWidth <= node.clientWidth), true);
  const mobileOriginal = await saved();
  await page.locator('#siteName').fill('Unsaved mobile demonstration');
  await capture(page, '15-mobile-evidence-editor.png', 'A mobile edit is contained and can be cancelled', [
    'The drawer and its fields fit the mobile viewport; Save and Cancel remain reachable.',
    'The visible name change is an unsaved draft.'
  ]);
  await page.keyboard.press('Escape');
  assert.deepEqual(await saved(), mobileOriginal);

  const expiredContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'UTC' });
  const expiredPage = await expiredContext.newPage();
  observe(expiredPage);
  await expiredPage.clock.setFixedTime(expiredTime);
  await expiredPage.goto(origin);
  await expiredPage.locator('#catalogWarning').waitFor({ state: 'visible' });
  const expiredFleet = await expiredPage.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
  const expiredAssessment = assessFleet(expiredFleet, { now: expiredTime });
  assert.equal(expiredAssessment.catalogFresh, false);
  assert.equal(expiredAssessment.summary.evidenceComplete, 0);
  assert.equal(expiredAssessment.summary.providerConfirmed, 0);
  assert.equal(await expiredPage.locator('#completeCount').textContent(), '0');
  assert.equal(await expiredPage.locator('#providerCount').textContent(), '0');
  await capture(expiredPage, '16-expired-catalog.png', 'An expired catalog prevents positive outcomes', [
    `Separate test browser clock: ${expiredTime.toISOString()}.`,
    'The review-required notice is visible.',
    'Even fresh demo evidence receives no complete or provider-confirmed outcome while the catalog is expired.'
  ]);
  await expiredContext.close();

  assert.deepEqual(browserErrors, [], 'JavaScript and CSP console errors');
  const reportUrl = pathToFileURL(path.join(exampleDirectory, 'client-report.html')).href;
  assert.equal(requests.every((url) => url.startsWith(origin) || url === reportUrl), true, 'Only the local app and downloaded local report may be requested');
  assert.equal(screenshots.length, 16);
  const manifest = {
    schemaVersion: 1,
    purpose: 'Reproducible browser evidence using fictional customers and illustrative evidence; not customer feedback or a real security assessment.',
    capturedAt: startedAt,
    catalogId: CATALOG.id,
    standardTestClock: fixedTime.toISOString(),
    expiredTestClock: expiredTime.toISOString(),
    productionClockModified: false,
    chromiumVersion: browser.version(),
    playwrightVersion: require(path.join(modulePath, 'package.json')).version,
    timezone: 'UTC',
    desktopViewport: { width: 1440, height: 1000 },
    mobileViewport: { width: 390, height: 844 },
    screenshotCount: screenshots.length,
    browserConsoleErrors: browserErrors,
    externalRequestCount: 0,
    reportFile: 'examples/walkthrough/client-report.html',
    reportSha256: createHash('sha256').update(reportHtml).digest('hex'),
    screenshots,
  };
  await writeFile(path.join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nPASS All 16 screenshot scenarios; zero browser console errors; zero external requests.\nManifest: ${path.join(outputDirectory, 'manifest.json')}\nReport: ${path.join(exampleDirectory, 'client-report.html')}`);
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    console.error('Walkthrough failure context:', await activePage.evaluate(() => ({
      openDialogs: [...document.querySelectorAll('dialog[open]')].map((dialog) => dialog.id),
      rows: document.querySelectorAll('#fleetRows tr').length,
      formError: document.querySelector('#formError')?.textContent,
      toast: document.querySelector('#toast')?.textContent,
    })).catch(() => ({})));
  }
  throw error;
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
