import test from 'node:test';
import assert from 'node:assert/strict';
import { assessAsset, assessFleet, normalizeFleet, makeDemoFleet, renderReport, fleetToCsv, safeReferenceUrl, parseEvidenceTime, CATALOG } from '../src/core.mjs';

const NOW = '2026-10-22T12:00:00Z';
const OPTIONS = { now: NOW };
function asset(changes = {}) {
  return { id: 'sample-1', client: 'Example Customer', name: 'Example website', environment: 'production', provider: 'Example VPS', owner: 'Operations',
    phpVersion: '8.4.27', distribution: 'upstream', observation: 'web-runtime', observedAt: '2026-10-22T11:00:00Z',
    evidenceUrl: '', evidenceNote: 'Runtime observed after all relevant workers restarted.', reviewer: 'Test operator',
    restartConfirmedAt: '2026-10-22T10:30:00Z', smokeTestAt: '2026-10-22T11:15:00Z', ...changes };
}
const fleet = (assets = [asset()]) => ({ schemaVersion: 1, organization: 'Example Agency', demo: false, assets });
const providerConfirmation = () => ({ coversBothCves: true, confirmedAt: '2026-10-22T11:30:00Z', reference: 'TICKET-4321: account and deployment confirmed patched for both CVEs.', reviewer: 'Example operator' });

test('complete status requires actual web evidence, restart, smoke check and reviewer', () => {
  assert.equal(assessAsset(asset(), OPTIONS).status, 'evidence-complete');
  for (const changes of [{ observation: 'cli' }, { observation: 'installed-package' }, { reviewer: '' }, { evidenceNote: '' }, { restartConfirmedAt: '' }, { smokeTestAt: '' }, { observedAt: '' }]) {
    assert.equal(assessAsset(asset(changes), OPTIONS).status, 'verification-needed', JSON.stringify(changes));
  }
});

for (const [version, expected] of [['8.2.34', 'action-required'], ['8.2.35', 'evidence-complete'], ['8.3.35', 'action-required'], ['8.3.36', 'evidence-complete'], ['8.4.26', 'action-required'], ['8.4.27', 'evidence-complete'], ['8.5.11', 'action-required'], ['8.5.12', 'evidence-complete'], ['8.4.100', 'evidence-complete'], ['8.4.9', 'action-required']]) {
  test(`version comparison is numeric and respects the branch minimum: ${version}`, () => {
    assert.equal(assessAsset(asset({ phpVersion: version }), OPTIONS).status, expected);
  });
}

test('legacy upstream web runtimes need action without claiming compromise', () => {
  for (const phpVersion of ['5.6.40', '7.4.33', '8.0.30', '8.1.34']) {
    const result = assessAsset(asset({ phpVersion }), OPTIONS);
    assert.equal(result.status, 'action-required');
    assert.equal(result.fixedVersion, null);
    assert.equal(result.reasons.some((reason) => /has been compromised/.test(reason)), false);
  }
});

test('a lower CLI version does not establish the web runtime', () => {
  const result = assessAsset(asset({ phpVersion: '8.4.26', observation: 'cli' }), OPTIONS);
  assert.equal(result.status, 'verification-needed');
  assert.ok(result.reasons.some((reason) => reason.includes('CLI PHP')));
});

test('vendor/backport versions stay unresolved until a specific provider assertion', () => {
  for (const phpVersion of ['8.2.29', '8.2.29-1+deb12u1', '8.4.27']) {
    const candidate = asset({ distribution: 'vendor', phpVersion });
    assert.equal(assessAsset(candidate, OPTIONS).status, 'verification-needed');
    assert.equal(assessAsset({ ...candidate, providerConfirmation: providerConfirmation() }, OPTIONS).status, 'provider-confirmed');
  }
});

test('a later lower-version vendor web observation requires a new backport confirmation with or without a suffix', () => {
  for (const phpVersion of ['8.4.26', '8.4.26-vendor1', '8.2.29-1+deb12u1', '7.4.33-vendor1']) {
    const candidate = asset({ distribution: 'vendor', phpVersion, observedAt: '2026-10-22T11:45:00Z', providerConfirmation: providerConfirmation() });
    const result = assessAsset(candidate, OPTIONS);
    assert.equal(result.status, 'verification-needed', phpVersion);
    assert.ok(result.reasons.some((reason) => reason.includes('predates a lower-version web-runtime observation')), phpVersion);
    assert.equal(result.reasons.some((reason) => /is vulnerable|below the .* fix/.test(reason)), false, phpVersion);
    assert.equal(assessAsset({ ...candidate, providerConfirmation: { ...providerConfirmation(), confirmedAt: '2026-10-22T11:50:00Z' } }, OPTIONS).status, 'provider-confirmed', phpVersion);
  }
  const candidate = asset({ distribution: 'vendor', phpVersion: '8.4.26-vendor1', observedAt: '2026-10-22T11:45:00Z', providerConfirmation: providerConfirmation() });
  assert.equal(assessAsset({ ...candidate, observation: 'cli' }, OPTIONS).status, 'provider-confirmed');
  assert.equal(assessAsset({ ...candidate, providerConfirmation: {} }, OPTIONS).status, 'verification-needed');
});

test('provider confirmation is distinguished from complete evidence and supports unknown runtime', () => {
  const candidate = asset({ distribution: 'unknown', phpVersion: '', observation: 'unknown', observedAt: '', reviewer: '', evidenceNote: '', restartConfirmedAt: '', smokeTestAt: '', providerConfirmation: providerConfirmation() });
  const result = assessAsset(candidate, OPTIONS);
  assert.equal(result.status, 'provider-confirmed');
  assert.ok(result.reasons.some((reason) => reason.includes('provider assertion')));
});

test('provider claim cannot override contradictory old upstream web evidence', () => {
  const result = assessAsset(asset({ phpVersion: '8.4.26', providerConfirmation: providerConfirmation() }), OPTIONS);
  assert.equal(result.status, 'action-required');
  assert.ok(result.reasons.some((reason) => reason.includes('contrary web-runtime')));
});

test('partial, empty, stale, and future provider records cannot close vendor assets', () => {
  for (const changes of [{ coversBothCves: false }, { reviewer: '' }, { reference: 'yes' }, { confirmedAt: '' }, { confirmedAt: '2026-10-01T12:00:00Z' }, { confirmedAt: '2026-10-22T12:00:01Z' }, { confirmedAt: '2026-02-30T00:00:00Z' }]) {
    assert.equal(assessAsset(asset({ distribution: 'vendor', providerConfirmation: { ...providerConfirmation(), ...changes } }), OPTIONS).status, 'verification-needed', JSON.stringify(changes));
  }
});

test('unknown/future branches and pre-release labels cannot inherit a known fix', () => {
  for (const phpVersion of ['8.6.0', '9.0.0', '8.5.12RC1', '8.5.12-rc.1', '8.4.27-dev', '8.4.27beta2', 'banana', '8.4', '08.4.27', '8.4.27-ubuntu1']) {
    assert.equal(assessAsset(asset({ phpVersion }), OPTIONS).status, 'verification-needed', phpVersion);
  }
  for (const phpVersion of ['8.6.0', '8.5.12RC1']) {
    assert.equal(assessAsset(asset({ phpVersion, providerConfirmation: providerConfirmation() }), OPTIONS).status, 'verification-needed', phpVersion);
  }
});

test('every evidence timestamp must be fresh and not in the future', () => {
  for (const field of ['observedAt', 'restartConfirmedAt', 'smokeTestAt']) {
    for (const value of ['2026-10-01T00:00:00Z', '2026-10-22T12:00:01Z', '2026-02-30T00:00:00Z', '2026-10-22T11:00:00']) {
      assert.equal(assessAsset(asset({ [field]: value }), OPTIONS).status, 'verification-needed', `${field}: ${value}`);
    }
  }
});

test('chronology must establish observation and checks after the worker restart', () => {
  assert.equal(assessAsset(asset({ restartConfirmedAt: '2026-10-22T11:05:00Z' }), OPTIONS).status, 'verification-needed');
  assert.equal(assessAsset(asset({ smokeTestAt: '2026-10-22T10:45:00Z' }), OPTIONS).status, 'verification-needed');
});

test('expired/future catalogs prevent both positive statuses', () => {
  for (const now of ['2026-10-29T00:00:00Z', '2026-10-20T00:00:00Z']) {
    assert.equal(assessAsset(asset(), { now }).status, 'verification-needed');
    assert.equal(assessAsset(asset({ distribution: 'vendor', providerConfirmation: providerConfirmation() }), { now }).status, 'verification-needed');
    assert.equal(assessFleet(fleet(), { now }).catalogFresh, false);
  }
  const catalog = { ...CATALOG, expiresAt: '2026-10-21T23:59:00Z' };
  assert.equal(assessAsset(asset(), { now: NOW, catalog }).status, 'verification-needed');
});

test('ISO parsing checks real calendar dates, time, timezone and milliseconds', () => {
  for (const invalid of ['2026-02-29T12:00:00Z', '2026-04-31T12:00:00Z', '2026-13-01T12:00:00Z', '2026-00-01T12:00:00Z', '2026-01-00T12:00:00Z', '2026-01-01T24:00:00Z', '2026-01-01T12:60:00Z', '2026-01-01T12:00:60Z', '2026-01-01T12:00:00+14:30', '2026-01-01', 'yesterday', 42]) assert.equal(parseEvidenceTime(invalid), null, String(invalid));
  assert.equal(parseEvidenceTime('2028-02-29T12:00:00Z'), Date.parse('2028-02-29T12:00:00Z'));
  assert.equal(parseEvidenceTime('2026-10-22T06:00:00-05:00'), Date.parse('2026-10-22T11:00:00Z'));
  assert.equal(parseEvidenceTime('2026-10-22T11:00:00.12Z'), Date.parse('2026-10-22T11:00:00.120Z'));
  assert.throws(() => assessFleet(fleet(), { now: 'not a date' }), /Assessment time/);
});

test('normalization strips untrusted computed results and preserves safe JSON round-trip', () => {
  const forged = fleet([asset({ phpVersion: '8.4.26', assessment: { status: 'evidence-complete' } })]);
  forged.summary = { evidenceComplete: 1 };
  const normal = normalizeFleet(forged);
  assert.equal('summary' in normal, false);
  assert.equal('assessment' in normal.assets[0], false);
  assert.equal(assessFleet(forged, OPTIONS).summary.actionRequired, 1);
  const report = assessFleet(normal, OPTIONS);
  assert.deepEqual(normalizeFleet(JSON.parse(JSON.stringify(report))), normal);
});

test('normalization does not mutate input or allow prototype-property injection', () => {
  const original = fleet();
  const before = JSON.stringify(original);
  normalizeFleet(original);
  assert.equal(JSON.stringify(original), before);
  const malicious = JSON.parse('{"schemaVersion":1,"organization":"Example","__proto__":{"polluted":true},"assets":[{"id":"x","client":"C","name":"N","__proto__":{"distribution":"upstream","observation":"web-runtime"}}]}');
  const normalized = normalizeFleet(malicious);
  assert.equal(normalized.assets[0].distribution, 'unknown');
  assert.equal({}.polluted, undefined);
  assert.equal(Object.hasOwn(normalized, '__proto__'), false);
});

test('invalid types, duplicates and unsupported schema are rejected explicitly', () => {
  for (const bad of [null, [], { ...fleet(), schemaVersion: 2 }, { ...fleet(), demo: 'false' }, { ...fleet(), assets: {} }, fleet([asset({ id: '../secret' })]), fleet([asset({ client: 3 })]), fleet([asset({ providerConfirmation: true })]), fleet([asset({ providerConfirmation: { coversBothCves: 'true' } })]), fleet([asset({ observation: 'banner' })]), fleet([asset(), asset()])]) {
    assert.throws(() => normalizeFleet(bad), Error);
  }
  assert.throws(() => normalizeFleet(fleet(new Array(1001).fill(null))), /1,000/);
  assert.throws(() => normalizeFleet({ ...fleet(), ignored: 'x'.repeat(5 * 1024 * 1024) }), /5 MiB/);
});

test('empty inventories remain empty and are not evidence of no exposure', () => {
  const report = assessFleet(fleet([]), OPTIONS);
  assert.equal(report.summary.total, 0);
  assert.equal(report.summary.evidenceComplete, 0);
  assert.match(renderReport(report, OPTIONS), /empty inventory does not establish/);
});

test('demo fleet has eight fictional environments and all four outcomes', () => {
  const demo = makeDemoFleet(NOW);
  assert.equal(demo.demo, true);
  assert.equal(demo.assets.length, 8);
  const report = assessFleet(demo, OPTIONS);
  assert.deepEqual(report.summary, { total: 8, actionRequired: 2, verificationNeeded: 3, evidenceComplete: 2, providerConfirmed: 1 });
  assert.match(renderReport(report, OPTIONS), /DEMONSTRATION — fictional customers/);
});

test('HTML reports escape imported content and disable executable documents', () => {
  const malicious = '<img src=x onerror=alert(1)><script>alert(2)</script>';
  const report = assessFleet({ ...fleet([asset({ client: malicious, name: malicious, evidenceNote: malicious, evidenceUrl: 'javascript:alert(3)' })]), organization: malicious }, OPTIONS);
  const html = renderReport(report, OPTIONS);
  assert.equal(html.includes('<script>'), false);
  assert.equal(html.includes('<img src=x'), false);
  assert.match(html, /&lt;script&gt;/);
  assert.equal(html.includes('href="javascript:'), false);
  assert.match(html, /default-src 'none'/);
});

test('report exports recompute forged statuses from raw evidence', () => {
  const report = assessFleet(fleet([asset({ phpVersion: '8.4.26' })]), OPTIONS);
  report.assets[0].assessment = { status: 'evidence-complete', label: 'Everything is fine', reasons: [], nextActions: [] };
  report.summary = { evidenceComplete: 1 };
  assert.match(renderReport(report, OPTIONS), /The recorded upstream web runtime 8\.4\.26 is below/);
  assert.equal(renderReport(report, OPTIONS).includes('Everything is fine'), false);
  assert.match(fleetToCsv(report, OPTIONS), /"Action required"/);
});

test('exact-client HTML filter does not disclose another client or its details', () => {
  const report = assessFleet(fleet([asset({ id: 'one', client: 'Client A' }), asset({ id: 'two', client: 'SECRET_CLIENT_B', name: 'SECRET_SYSTEM', evidenceNote: 'SECRET_CUSTOMER_EVIDENCE' })]), OPTIONS);
  const html = renderReport(report, { ...OPTIONS, client: 'Client A' });
  assert.equal(html.includes('SECRET_'), false);
  assert.match(html, /1 recorded environment/);
  assert.throws(() => renderReport(report, { ...OPTIONS, client: 'Client' }), /No assets match/);
});

test('CSV quotes multiline content and guards spreadsheet formulas after whitespace/controls', () => {
  const report = assessFleet(fleet([asset({ client: '=1+1', name: '\t@SUM(A1:A2)', evidenceNote: '\u0000 -2+3', owner: '+cmd', provider: '-1', reviewer: 'A "quoted"\noperator' })]), OPTIONS);
  const csv = fleetToCsv(report, OPTIONS);
  assert.ok(csv.includes('"\'=1+1"'));
  assert.ok(csv.includes('"\'@SUM(A1:A2)"'));
  assert.ok(csv.includes('"\'\u0000 -2+3"'));
  assert.ok(csv.includes('"\'+cmd"'));
  assert.ok(csv.includes('"\'-1"'));
  assert.ok(csv.includes('"A ""quoted""\noperator"'));
  assert.ok(csv.endsWith('\r\n'));
});

test('references allow only credential-free HTTP(S) URLs', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,hello', 'file:///etc/passwd', 'https://user:secret@example.com', 'https://example.com/\nattack', '//example.com']) assert.equal(safeReferenceUrl(url), null, url);
  assert.equal(safeReferenceUrl('https://example.com/ticket/42'), 'https://example.com/ticket/42');
});


test('exports do not trust an imported old generation time to resurrect a positive status', () => {
  const archived = assessFleet(fleet(), OPTIONS);
  assert.equal(archived.summary.evidenceComplete, 1);
  const later = { now: '2026-10-29T12:00:00Z' };
  const html = renderReport(archived, later);
  assert.match(html, /Catalog review required/);
  assert.match(html, /Verification needed/);
  assert.match(html, /Generated 2026-10-29/);
  const csv = fleetToCsv(archived, later);
  assert.match(csv, /"Verification needed"/);
  assert.equal(csv.includes('"Evidence complete"'), false);
});
