#!/usr/bin/env node
/** Scripted product experiments. All customers, deployments, and assertions are fictional. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';
import { CATALOG, LIMITS, assessAsset, assessFleet, normalizeFleet, renderReport, fleetToCsv } from '../src/core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOW = '2026-10-22T12:00:00Z';
const OPTIONS = { now: NOW };
const CLIENT = 'Pine & Paper (fictional)';
const SAMPLES = 25;
const WARMUPS = 3;
const BUDGETS = { assessmentP95Ms: 2000, combinedExportP95Ms: 5000 };
const clone = (value) => JSON.parse(JSON.stringify(value));
const bytes = (value) => Buffer.byteLength(value, 'utf8');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const objectHash = (value) => hash(JSON.stringify(value));
const round = (value) => Math.round(value * 1000) / 1000;
const checks = [];
const artifacts = [];

function check(hypothesis, name, passed, detail = {}) {
  checks.push({ hypothesis, name, passed: Boolean(passed), detail });
}

function outputDirectory(args) {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    process.stdout.write('Run fictional PHP Response Desk product experiments.\nUsage: node scripts/test-hypotheses.mjs [--out NEW_DIRECTORY]\nNo dependencies, network calls, or deployment changes. Existing directories are never overwritten.\n');
    return null;
  }
  if (args.length && (args.length !== 2 || args[0] !== '--out' || !args[1] || args[1].startsWith('--'))) throw new Error('Use --out NEW_DIRECTORY, or no arguments.');
  const target = args[1] ?? path.join('reports', `experiments-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  const resolved = path.resolve(target);
  mkdirSync(path.dirname(resolved), { recursive: true });
  mkdirSync(resolved, { recursive: false });
  return resolved;
}

function save(output, name, content) {
  const text = typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`;
  writeFileSync(path.join(output, name), text, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  artifacts.push({ file: name, bytes: bytes(text), sha256: hash(text) });
}

function asset(changes = {}) {
  return {
    id: 'fictional-upstream', client: CLIENT, name: 'Fictional storefront', environment: 'production',
    provider: 'Fictional self-managed host', owner: 'Example operations team', phpVersion: '8.4.27',
    distribution: 'upstream', observation: 'web-runtime', observedAt: '2026-10-22T11:00:00Z',
    evidenceUrl: '', evidenceNote: 'FICTIONAL: Example operator recorded the active web runtime after restarting every relevant worker.\nNo live deployment was inspected.',
    reviewer: 'Example operator', restartConfirmedAt: '2026-10-22T10:50:00Z', smokeTestAt: '2026-10-22T11:05:00Z',
    providerConfirmation: { coversBothCves: false, confirmedAt: '', reference: '', reviewer: '' }, ...changes,
  };
}

function confirmation(confirmedAt = '2026-10-22T11:10:00Z') {
  return { coversBothCves: true, confirmedAt, reference: 'FICTIONAL-PROVIDER-42: both catalog CVEs covered for this customer, deployment, and exact observed package build.', reviewer: 'Example operator' };
}

function fleet(assets) {
  return { schemaVersion: 1, organization: 'Example Response Studio — experiment', demo: true, assets };
}

function workflow(output) {
  const upstreamInputs = [
    asset({ phpVersion: '8.4.26', observation: 'cli', restartConfirmedAt: '', smokeTestAt: '', evidenceNote: 'FICTIONAL: Local CLI output was supplied; the serving web runtime has not been checked.' }),
    asset({ phpVersion: '8.4.26', restartConfirmedAt: '', smokeTestAt: '', evidenceNote: 'FICTIONAL: The active web runtime was observed on the older upstream release.' }),
    asset({ observation: 'installed-package', restartConfirmedAt: '', smokeTestAt: '', evidenceNote: 'FICTIONAL: An updated package is installed. Existing web workers have not yet been verified.' }),
    asset({ smokeTestAt: '' }),
    asset(),
  ];
  const vendorBase = asset({ id: 'fictional-vendor', name: 'Fictional members portal', distribution: 'vendor', phpVersion: '8.4.26-vendor1', provider: 'Fictional managed host', restartConfirmedAt: '', smokeTestAt: '', evidenceNote: 'FICTIONAL: A vendor build was observed; its numeric version does not establish whether fixes were backported.' });
  const vendorInputs = [
    vendorBase,
    { ...clone(vendorBase), providerConfirmation: confirmation() },
    { ...clone(vendorBase), observedAt: '2026-10-22T11:30:00Z', providerConfirmation: confirmation() },
    { ...clone(vendorBase), observedAt: '2026-10-22T11:30:00Z', providerConfirmation: confirmation('2026-10-22T11:40:00Z') },
  ];
  const definitions = [
    { id: 'self-managed', inputs: upstreamInputs, actions: ['Record supplied CLI observation', 'Record an active web-runtime observation', 'Record the installed update', 'Record worker restart and fixed web-runtime evidence', 'Record the subsequent application check'], expected: ['verification-needed', 'action-required', 'verification-needed', 'verification-needed', 'evidence-complete'] },
    { id: 'managed-hosting', inputs: vendorInputs, actions: ['Record the ambiguous vendor build', 'Record a provider assertion covering both CVEs', 'Record a newer lower-prefix web observation', 'Renew the provider assertion for the observed build'], expected: ['verification-needed', 'provider-confirmed', 'verification-needed', 'provider-confirmed'] },
  ];
  const journeys = definitions.map(({ id, inputs, actions, expected }) => {
    const stages = inputs.map((input, index) => ({ step: index + 1, actor: 'Example operator', action: actions[index], expectedStatus: expected[index], input: clone(input), assessment: assessAsset(input, OPTIONS) }));
    check('H1', `${id} transitions`, stages.every((stage) => stage.assessment.status === stage.expectedStatus), { expected, actual: stages.map((stage) => stage.assessment.status) });
    return { id, stages };
  });
  const final = fleet([clone(upstreamInputs.at(-1)), clone(vendorInputs.at(-1))]);
  const assessed = assessFleet(final, OPTIONS);
  const roundTrip = normalizeFleet(JSON.parse(JSON.stringify(assessed)));
  const reassessed = assessFleet(roundTrip, OPTIONS);
  check('H1', 'handover JSON round-trip preserves raw records and outcomes', JSON.stringify(normalizeFleet(final)) === JSON.stringify(roundTrip) && JSON.stringify(reassessed) === JSON.stringify(assessed), { summary: reassessed.summary });
  save(output, 'workflow.json', { fictional: true, assessmentClock: NOW, journeys, roundTripSummary: reassessed.summary });
  return { upstreamInputs, vendorInputs, final, journeys };
}

// CSV parser used to count complete records, including quoted multiline evidence notes.
function csvRecords(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (!quoted && character === ',') { row.push(field); field = ''; }
    else if (!quoted && character === '\r' && text[index + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ''; index += 1; }
    else field += character;
  }
  if (quoted) throw new Error('Export has an unterminated CSV field.');
  if (row.length || field) { row.push(field); rows.push(row); }
  return rows;
}

function isolation(output, selectedFleet) {
  const markers = [];
  const foreign = ['A', 'B'].map((suffix) => {
    const marker = (field) => { const value = `FOREIGN_${suffix}_${field}`; markers.push(value); return value; };
    return asset({ id: `foreign-${suffix}`, client: marker('CLIENT'), name: marker('SITE'), provider: marker('PROVIDER'), owner: marker('OWNER'), evidenceNote: marker('EVIDENCE_NOTE'), reviewer: marker('REVIEWER'), evidenceUrl: `https://example.invalid/${marker('EVIDENCE_URL')}`, providerConfirmation: { coversBothCves: true, confirmedAt: '2026-10-22T11:30:00Z', reference: marker('PROVIDER_REFERENCE'), reviewer: marker('PROVIDER_REVIEWER') } });
  });
  const mixed = fleet([...clone(selectedFleet.assets), ...foreign]);
  const originalHash = objectHash(mixed);
  const assessedMixed = assessFleet(mixed, OPTIONS);
  const html = renderReport(assessedMixed, { ...OPTIONS, client: CLIENT });
  const csv = fleetToCsv(assessedMixed, { ...OPTIONS, client: CLIENT });
  const records = csvRecords(csv);
  const idColumn = records[0].indexOf('Asset ID');
  const clientColumn = records[0].indexOf('Client');
  const exportedIds = records.slice(1).map((record) => record[idColumn]).sort();
  const expectedIds = selectedFleet.assets.map((item) => item.id).sort();
  const leakedMarkers = markers.filter((marker) => html.includes(marker) || csv.includes(marker));
  const cards = (html.match(/<article>/g) || []).length;
  check('H2', 'selected customer has exactly its two environments', cards === 2 && records.length === 3 && JSON.stringify(exportedIds) === JSON.stringify(expectedIds) && records.slice(1).every((record) => record[clientColumn] === CLIENT) && selectedFleet.assets.every((item) => html.includes(item.name)), { htmlCards: cards, csvDataRows: records.length - 1, exportedIds });
  check('H2', 'no other-customer markers in either complete export', leakedMarkers.length === 0, { markersChecked: markers.length, leakedMarkers });
  check('H2', 'fictional label and source inventory survive handover', /DEMO/i.test(html) && csv.includes('DEMO') && objectHash(mixed) === originalHash, { sourceSha256: originalHash, sourceUnchanged: objectHash(mixed) === originalHash });
  save(output, 'final-inventory.json', mixed);
  save(output, 'customer-report.html', html);
  save(output, 'customer-report.csv', csv);
  return { sourceEnvironments: mixed.assets.length, selectedEnvironments: selectedFleet.assets.length, markersChecked: markers.length, leakedMarkers, htmlBytes: bytes(html), csvBytes: bytes(csv), htmlCards: cards, csvDataRows: records.length - 1 };
}

function shiftEvidence(input, milliseconds) {
  const shifted = clone(input);
  for (const item of shifted.assets) {
    for (const field of ['observedAt', 'restartConfirmedAt', 'smokeTestAt']) if (item[field]) item[field] = new Date(Date.parse(item[field]) + milliseconds).toISOString();
    if (item.providerConfirmation.confirmedAt) item.providerConfirmation.confirmedAt = new Date(Date.parse(item.providerConfirmation.confirmedAt) + milliseconds).toISOString();
  }
  return shifted;
}

function aging(selectedFleet) {
  const states = (input, now) => { const assessed = assessFleet(input, { now }); return { clock: now, catalogFresh: assessed.catalogFresh, summary: assessed.summary, statuses: assessed.assets.map((item) => ({ id: item.id, status: item.assessment.status, reasons: item.assessment.reasons })) }; };
  const first = states(selectedFleet, NOW);
  const stale = states(selectedFleet, '2026-10-25T13:00:00Z');
  const noPositive = (result) => result.summary.evidenceComplete === 0 && result.summary.providerConfirmed === 0;
  check('H3', 'unchanged evidence ages out while the catalog remains current', first.summary.evidenceComplete === 1 && first.summary.providerConfirmed === 1 && stale.catalogFresh && stale.summary.verificationNeeded === 2 && noPositive(stale), { fresh: first.summary, stale: stale.summary });
  const beforeClock = '2026-10-28T23:59:58Z';
  const boundaryFixture = shiftEvidence(selectedFleet, Date.parse(beforeClock) - Date.parse(NOW));
  const before = states(boundaryFixture, beforeClock);
  const after = states(boundaryFixture, '2026-10-29T00:00:00Z');
  check('H3', 'catalog expiry reopens both outcomes despite fresh unchanged evidence', before.catalogFresh && before.summary.evidenceComplete === 1 && before.summary.providerConfirmed === 1 && !after.catalogFresh && after.summary.verificationNeeded === 2 && noPositive(after), { before: before.summary, after: after.summary });
  return { evidenceAge: { unchangedInputSha256: objectHash(selectedFleet), fresh: first, stale }, catalogBoundary: { unchangedInputSha256: objectHash(boundaryFixture), before, after } };
}

function scaleSeeds(journey) {
  const unknownProvider = asset({ id: 'fictional-unknown', phpVersion: '', distribution: 'unknown', observation: 'unknown', observedAt: '', restartConfirmedAt: '', smokeTestAt: '', evidenceNote: '', reviewer: '', providerConfirmation: confirmation() });
  const stale = asset({ observedAt: '2026-10-18T11:00:00Z', restartConfirmedAt: '2026-10-18T10:50:00Z', smokeTestAt: '2026-10-18T11:05:00Z' });
  return [journey.upstreamInputs[1], asset({ observation: 'cli' }), journey.upstreamInputs[2], journey.upstreamInputs[3], journey.upstreamInputs[4], journey.vendorInputs[0], journey.vendorInputs[1], journey.vendorInputs[2], unknownProvider, stale];
}

function scaledFleet(count, seeds) {
  return fleet(Array.from({ length: count }, (_, index) => ({ ...clone(seeds[index % seeds.length]), id: `scale-${String(index + 1).padStart(4, '0')}`, client: `Fictional Account ${String(index % 20 + 1).padStart(2, '0')}`, name: `Fictional environment ${index + 1}` })));
}

function boundaries(representative) {
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'php-response-experiments-'));
  const observations = [];
  let earlierReportHash = null;
  const earlierReportPath = path.join(temporary, 'accepted.html');
  try {
    const extra = clone(representative);
    extra.assets.push({ ...clone(extra.assets[0]), id: 'scale-1001' });
    const oversize = clone(representative);
    for (const item of oversize.assets) {
      item.evidenceNote = 'FICTIONAL oversized import example. '.padEnd(4000, 'x');
      item.evidenceUrl = 'https://example.invalid/fictional-evidence/'.padEnd(2000, 'x');
    }
    const cases = [
      { id: 'accepted', input: representative, expected: 'accept', errorPattern: null },
      { id: 'too-many', input: extra, expected: 'reject', errorPattern: /1,000 asset limit/ },
      { id: 'too-large', input: oversize, expected: 'reject', errorPattern: /5 MiB import limit/ },
    ];
    for (const candidate of cases) {
      const inputText = JSON.stringify(candidate.input);
      const originalHash = hash(inputText);
      const inputPath = path.join(temporary, `${candidate.id}.json`);
      const outputPath = path.join(temporary, `${candidate.id}.html`);
      writeFileSync(inputPath, inputText, { flag: 'wx', mode: 0o600 });
      let apiError = '', apiAccepted = false;
      try { normalizeFleet(candidate.input); apiAccepted = true; } catch (error) { apiError = error.message; }
      const command = spawnSync(process.execPath, [path.join(ROOT, 'bin/php-response.mjs'), 'assess', inputPath, '--format', 'html', '--out', outputPath], { cwd: ROOT, encoding: 'utf8', timeout: 60000, maxBuffer: 2 * 1024 * 1024 });
      const outputExists = existsSync(outputPath);
      const memoryUnchanged = objectHash(candidate.input) === originalHash;
      const fileUnchanged = hash(readFileSync(inputPath)) === originalHash;
      if (candidate.expected === 'accept' && outputExists) earlierReportHash = hash(readFileSync(outputPath));
      const previousReportUnchanged = earlierReportHash !== null && hash(readFileSync(earlierReportPath)) === earlierReportHash;
      const observed = { id: candidate.id, assets: candidate.input.assets.length, inputBytes: bytes(inputText), expected: candidate.expected, apiAccepted, apiError, cliExitCode: command.status, cliError: command.error?.message ?? '', cliStderr: (command.stderr ?? '').replaceAll(temporary, '<temporary>').trim(), cliStdoutBytes: bytes(command.stdout ?? ''), outputExists, outputBytes: outputExists ? readFileSync(outputPath).length : 0, inputSha256: originalHash, memoryUnchanged, fileUnchanged, previousReportUnchanged };
      observations.push(observed);
      const accepted = candidate.expected === 'accept';
      const correctDecision = accepted ? apiAccepted && command.status === 0 && !command.error && outputExists && bytes(inputText) < LIMITS.bytes : !apiAccepted && command.status === 1 && !command.error && !outputExists && candidate.errorPattern.test(apiError) && candidate.errorPattern.test(command.stderr ?? '');
      check('H4', `${candidate.id} API and CLI outcome preserves data`, correctDecision && memoryUnchanged && fileUnchanged && previousReportUnchanged, observed);
    }
  } finally { rmSync(temporary, { recursive: true, force: true }); }
  return { cliClock: 'Actual process clock; statuses are not evaluated by this import-limit experiment.', cases: observations };
}

function distribution(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (fraction) => sorted[Math.max(0, Math.ceil(fraction * sorted.length) - 1)];
  return { min: round(sorted[0]), median: round(percentile(0.5)), p95: round(percentile(0.95)), max: round(sorted.at(-1)) };
}

function scale(output, seeds) {
  const measurements = [];
  for (const count of [10, 100, 1000]) {
    const input = scaledFleet(count, seeds);
    const inputText = JSON.stringify(input);
    const beforeHash = hash(inputText);
    const expected = { total: count, actionRequired: count / 10, verificationNeeded: count * 6 / 10, evidenceComplete: count / 10, providerConfirmed: count * 2 / 10 };
    let signature = null, stable = true, firstOutputSizes = null, actualSummary = null;
    const samples = [];
    for (let iteration = -WARMUPS; iteration < SAMPLES; iteration += 1) {
      const start = performance.now();
      const report = assessFleet(input, OPTIONS);
      const assessedAt = performance.now();
      const html = renderReport(report, OPTIONS);
      const htmlAt = performance.now();
      const csv = fleetToCsv(report, OPTIONS);
      const csvAt = performance.now();
      const assessmentMs = assessedAt - start;
      const htmlMs = htmlAt - assessedAt;
      const csvMs = csvAt - htmlAt;
      const current = { htmlSha256: hash(html), csvSha256: hash(csv), summary: report.summary };
      if (signature === null) {
        signature = current;
        firstOutputSizes = { assessedJsonBytes: bytes(JSON.stringify(report)), htmlBytes: bytes(html), csvBytes: bytes(csv) };
        actualSummary = report.summary;
      } else stable &&= JSON.stringify(current) === JSON.stringify(signature);
      if (iteration >= 0) samples.push({ iteration: iteration + 1, assessmentMs, htmlMs, csvMs, combinedExportMs: htmlMs + csvMs, totalMs: csvAt - start });
    }
    const timingsMs = Object.fromEntries(['assessmentMs', 'htmlMs', 'csvMs', 'combinedExportMs', 'totalMs'].map((field) => [field, distribution(samples.map((sample) => sample[field]))]));
    const unchanged = objectHash(input) === beforeHash;
    const measured = { assets: count, inputBytes: bytes(inputText), inputSha256: beforeHash, outputBytes: firstOutputSizes, expectedSummary: expected, actualSummary, stableOutputs: stable, sourceUnchanged: unchanged, outputHashes: { html: signature.htmlSha256, csv: signature.csvSha256 }, timingsMs, samples };
    measurements.push(measured);
    check('H5', `${count} environments meet declared engine/export budgets`, timingsMs.assessmentMs.p95 <= BUDGETS.assessmentP95Ms && timingsMs.combinedExportMs.p95 <= BUDGETS.combinedExportP95Ms && bytes(inputText) < LIMITS.bytes && stable && unchanged && JSON.stringify(actualSummary) === JSON.stringify(expected), { assets: count, inputBytes: bytes(inputText), assessmentP95Ms: timingsMs.assessmentMs.p95, combinedExportP95Ms: timingsMs.combinedExportMs.p95, stableOutputs: stable, sourceUnchanged: unchanged, expectedSummary: expected, actualSummary });
    if (count === 1000) save(output, 'scale-1000.fleet.json', inputText + '\n');
  }
  return { warmupsPerSize: WARMUPS, measuredSamplesPerSize: SAMPLES, percentileMethod: 'nearest rank', budgetsMs: BUDGETS, measurements };
}

// Deliberately naive arithmetic baseline; this is not a model of human performance.
function versionOnlyBaseline(item) {
  const parts = /^(\d+)\.(\d+)\.(\d+)/.exec(item.phpVersion);
  if (!parts) return 'unknown';
  const minimum = CATALOG.fixedVersions[`${Number(parts[1])}.${Number(parts[2])}`];
  if (!minimum) return 'unknown';
  return Number(parts[3]) >= Number(minimum.split('.')[2]) ? 'close item' : 'update';
}

function compareBaseline(output, journey) {
  const cases = [
    ['complete-upstream', 'Complete, fresh upstream web evidence', asset()],
    ['old-upstream', 'Old upstream web runtime', journey.upstreamInputs[1]],
    ['fixed-cli', 'Fixed version observed only in CLI', asset({ observation: 'cli' })],
    ['fixed-package', 'Fixed installed package without running-worker evidence', journey.upstreamInputs[2]],
    ['no-restart', 'Fixed web version with no restart confirmation', asset({ restartConfirmedAt: '' })],
    ['no-check', 'Fixed web version with no application check', journey.upstreamInputs[3]],
    ['no-reviewer', 'Fixed web version with no reviewer', asset({ reviewer: '' })],
    ['stale-evidence', 'Fixed web version with stale observations', scaleSeeds(journey)[9]],
    ['vendor-unknown', 'Older vendor version with unknown backport status', journey.vendorInputs[0]],
    ['vendor-confirmed', 'Older vendor version with a fresh provider assertion', journey.vendorInputs[1]],
    ['vendor-new-observation', 'A lower-prefix vendor observation after the assertion', journey.vendorInputs[2]],
    ['future-branch', 'Future branch outside the reviewed catalog', asset({ phpVersion: '8.6.0' })],
    ['prerelease', 'Prerelease at the numeric minimum', asset({ phpVersion: '8.4.27RC1' })],
    ['vendor-modern', 'Modern vendor version without build confirmation', asset({ distribution: 'vendor', phpVersion: '8.4.27-vendor1' })],
    ['provider-no-runtime', 'Provider assertion without a runtime observation', scaleSeeds(journey)[8]],
  ];
  const decisionMap = { 'evidence-complete': 'close item', 'provider-confirmed': 'close item', 'action-required': 'update', 'verification-needed': 'unknown' };
  const rows = cases.map(([id, description, input]) => {
    const assessment = assessAsset(input, OPTIONS);
    const baselineDecision = versionOnlyBaseline(input);
    const productDecision = decisionMap[assessment.status];
    return { id, description, input: clone(input), baselineDecision, productStatus: assessment.status, productDecision, disagrees: baselineDecision !== productDecision, reasons: assessment.reasons };
  });
  const prematureClosure = rows.filter((row) => row.baselineDecision === 'close item' && row.productDecision === 'unknown');
  const unsupportedUpdate = rows.filter((row) => row.baselineDecision === 'update' && row.productDecision === 'unknown');
  const summary = { curatedCases: rows.length, policyDisagreements: rows.filter((row) => row.disagrees).length, baselineClosesUnresolved: prematureClosure.map((row) => row.id), baselineUpdatesUnresolvedVendor: unsupportedUpdate.map((row) => row.id) };
  check('H6', 'curated examples expose both specified baseline limitations', prematureClosure.length >= 1 && unsupportedUpdate.length >= 1, summary);
  save(output, 'baseline-comparison.json', { fictional: true, assessmentClock: NOW, warning: 'Deliberately selected cases and a deliberately naive rule. Not a human benchmark, accuracy estimate, market test, or proof of time savings.', baselineRule: 'Extract leading numeric version; compare its patch number with the known branch minimum. Ignore all other evidence. At/above = close item, below = update, unknown branch/version = unknown.', productDecisionMap: decisionMap, summary, cases: rows });
  return summary;
}

function machine() {
  const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
  return { node: process.version, v8: process.versions.v8, platform: process.platform, architecture: process.arch, osRelease: os.release(), cpuModel: os.cpus()[0]?.model ?? 'not reported', logicalCpusReported: os.cpus().length, availableParallelismReported: os.availableParallelism?.() ?? null, totalMemoryBytesReported: os.totalmem(), gitRevisionBeforeRun: revision.status === 0 ? revision.stdout.trim() : 'unavailable', executionNotes: 'Shared container; reported resources are not exclusive allocations. CPU scheduling and concurrent load are uncontrolled. No hostname or customer data is recorded.' };
}

function main() {
  const output = outputDirectory(process.argv.slice(2));
  if (output === null) return;
  const protocol = readFileSync(path.join(ROOT, 'docs/EXPERIMENTS.md'), 'utf8').split('## First-run results')[0];
  const results = { schemaVersion: 1, fictional: true, startedAt: new Date().toISOString(), assessmentClock: NOW, protocolPath: 'docs/EXPERIMENTS.md', protocolSha256: hash(protocol), sourceSha256: Object.fromEntries(['src/core.mjs', 'src/catalog.mjs', 'scripts/test-hypotheses.mjs'].map((name) => [name, hash(readFileSync(path.join(ROOT, name)))])), machine: machine(), catalog: { id: CATALOG.id, reviewedAt: CATALOG.reviewedAt, expiresAt: CATALOG.expiresAt }, experiments: {}, checks, artifacts, limitations: ['No human participants or live deployments.', 'Scripted engine/export workflow, not browser usability measurement.', 'Shared-machine timings, not a production service-level guarantee.', 'Version-only comparison is constructed and intentionally naive.', 'Operator and provider statements are not independently authenticated.', 'The saved report generation time is simulated for reproducibility.'] };
  try {
    const journey = workflow(output);
    results.experiments.H1 = { journeys: journey.journeys.map(({ id, stages }) => ({ id, statuses: stages.map((stage) => stage.assessment.status) })), finalSummary: assessFleet(journey.final, OPTIONS).summary };
    results.experiments.H2 = isolation(output, journey.final);
    results.experiments.H3 = aging(journey.final);
    const seeds = scaleSeeds(journey);
    results.experiments.H4 = boundaries(scaledFleet(1000, seeds));
    results.experiments.H5 = scale(output, seeds);
    results.experiments.H6 = compareBaseline(output, journey);
  } catch (error) {
    results.fatalError = { message: error.message, stack: error.stack };
    check('RUNNER', 'experiments finish without an unexpected error', false, { message: error.message });
  }
  results.finishedAt = new Date().toISOString();
  results.outcome = { passedChecks: checks.filter((item) => item.passed).length, failedChecks: checks.filter((item) => !item.passed).length, passedHypotheses: ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].filter((id) => checks.some((item) => item.hypothesis === id) && checks.filter((item) => item.hypothesis === id).every((item) => item.passed)) };
  results.outcome.passed = results.outcome.failedChecks === 0 && results.outcome.passedHypotheses.length === 6;
  writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  process.stdout.write(JSON.stringify({ output, outcome: results.outcome, measurements: results.experiments.H5?.measurements.map((item) => ({ assets: item.assets, inputBytes: item.inputBytes, htmlBytes: item.outputBytes.htmlBytes, csvBytes: item.outputBytes.csvBytes, assessmentP95Ms: item.timingsMs.assessmentMs.p95, exportP95Ms: item.timingsMs.combinedExportMs.p95 })), comparison: results.experiments.H6, failures: checks.filter((item) => !item.passed) }, null, 2) + '\n');
  if (!results.outcome.passed) process.exitCode = 1;
}

try { main(); } catch (error) { process.stderr.write(`Product experiments: ${error.message}\n`); process.exitCode = 1; }
