import { CATALOG } from './catalog.mjs';

export { CATALOG };
export const LIMITS = Object.freeze({ bytes: 5 * 1024 * 1024, assets: 1000 });
export const STATUS_LABELS = Object.freeze({
  'action-required': 'Action required',
  'verification-needed': 'Verification needed',
  'evidence-complete': 'Evidence complete',
  'provider-confirmed': 'Provider confirmed',
});

const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const HOURS = 3600000;

function textField(object, key, location, { required = false, max = 200, fallback = '' } = {}) {
  if (!own(object, key)) {
    if (required) throw new Error(`${location}.${key} is required.`);
    return fallback;
  }
  if (typeof object[key] !== 'string') throw new Error(`${location}.${key} must be a string.`);
  const value = object[key].trim();
  if (value.length > max) throw new Error(`${location}.${key} exceeds ${max} characters.`);
  if (required && !value) throw new Error(`${location}.${key} must not be empty.`);
  return value;
}

function enumField(object, key, choices, fallback, location) {
  const value = textField(object, key, location, { fallback });
  if (!choices.includes(value)) throw new Error(`${location}.${key} must be one of: ${choices.join(', ')}.`);
  return value;
}

function normalizeAsset(input, index = 0) {
  const location = `assets[${index}]`;
  if (!isRecord(input)) throw new Error(`${location} must be an object.`);
  const id = textField(input, 'id', location, { required: true, max: 80 });
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(id)) {
    throw new Error(`${location}.id must start with a letter or number and contain only letters, numbers, dots, underscores or hyphens.`);
  }
  let confirmation = {};
  if (own(input, 'providerConfirmation')) {
    if (!isRecord(input.providerConfirmation)) throw new Error(`${location}.providerConfirmation must be an object.`);
    confirmation = input.providerConfirmation;
  }
  if (own(confirmation, 'coversBothCves') && typeof confirmation.coversBothCves !== 'boolean') {
    throw new Error(`${location}.providerConfirmation.coversBothCves must be a boolean.`);
  }
  const providerLocation = `${location}.providerConfirmation`;
  return {
    id,
    client: textField(input, 'client', location, { required: true }),
    name: textField(input, 'name', location, { required: true }),
    environment: enumField(input, 'environment', ['production', 'staging', 'development'], 'production', location),
    provider: textField(input, 'provider', location),
    owner: textField(input, 'owner', location),
    phpVersion: textField(input, 'phpVersion', location, { max: 100 }),
    distribution: enumField(input, 'distribution', ['upstream', 'vendor', 'unknown'], 'unknown', location),
    observation: enumField(input, 'observation', ['web-runtime', 'installed-package', 'cli', 'unknown'], 'unknown', location),
    observedAt: textField(input, 'observedAt', location, { max: 64 }),
    evidenceUrl: textField(input, 'evidenceUrl', location, { max: 2000 }),
    evidenceNote: textField(input, 'evidenceNote', location, { max: 4000 }),
    reviewer: textField(input, 'reviewer', location),
    restartConfirmedAt: textField(input, 'restartConfirmedAt', location, { max: 64 }),
    smokeTestAt: textField(input, 'smokeTestAt', location, { max: 64 }),
    providerConfirmation: {
      coversBothCves: own(confirmation, 'coversBothCves') ? confirmation.coversBothCves : false,
      confirmedAt: textField(confirmation, 'confirmedAt', providerLocation, { max: 64 }),
      reference: textField(confirmation, 'reference', providerLocation, { max: 2000 }),
      reviewer: textField(confirmation, 'reviewer', providerLocation),
    },
  };
}

/** Normalize an untrusted import into a fresh, deliberately small schema. */
export function normalizeFleet(input) {
  if (!isRecord(input)) throw new Error('Fleet must be an object.');
  let serialized;
  try { serialized = JSON.stringify(input); } catch { throw new Error('Fleet must be serializable JSON without cycles.'); }
  if (new TextEncoder().encode(serialized).length > LIMITS.bytes) throw new Error('Fleet exceeds the 5 MiB import limit.');
  if (!own(input, 'schemaVersion') || input.schemaVersion !== 1) throw new Error('Unsupported schemaVersion; expected 1.');
  const organization = textField(input, 'organization', 'fleet', { required: true });
  if (!own(input, 'assets') || !Array.isArray(input.assets)) throw new Error('fleet.assets must be an array.');
  if (input.assets.length > LIMITS.assets) throw new Error('Fleet exceeds the 1,000 asset limit.');
  if (own(input, 'demo') && typeof input.demo !== 'boolean') throw new Error('fleet.demo must be a boolean.');
  const ids = new Set();
  const assets = [];
  for (let index = 0; index < input.assets.length; index += 1) {
    const asset = normalizeAsset(input.assets[index], index);
    if (ids.has(asset.id)) throw new Error(`Duplicate asset id: ${asset.id}.`);
    ids.add(asset.id);
    assets.push(asset);
  }
  return { schemaVersion: 1, organization, demo: own(input, 'demo') ? input.demo : false, assets };
}

/** Real calendar date + explicit timezone, rather than Date.parse's rollover behavior. */
export function parseEvidenceTime(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi, s, fraction = '', zone] = match;
  const [year, month, day, hour, minute, second] = [y, mo, d, h, mi, s].map(Number);
  if (year < 1970 || month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59) return null;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > days) return null;
  let offset = 0;
  if (zone !== 'Z') {
    const zoneHour = Number(zone.slice(1, 3));
    const zoneMinute = Number(zone.slice(4, 6));
    if (zoneHour > 14 || zoneMinute > 59 || (zoneHour === 14 && zoneMinute !== 0)) return null;
    offset = (zoneHour * 60 + zoneMinute) * 60000 * (zone[0] === '+' ? 1 : -1);
  }
  return Date.UTC(year, month - 1, day, hour, minute, second, Number(fraction.padEnd(3, '0'))) - offset;
}

function nowMillis(value = new Date()) {
  const timestamp = value instanceof Date ? value.getTime() : parseEvidenceTime(value);
  if (timestamp === null || !Number.isFinite(timestamp)) throw new Error('Assessment time must be a valid Date or timezone-qualified ISO timestamp.');
  return timestamp;
}

function stableVersion(value) {
  const match = /^(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,5})$/.exec(value);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), branch: `${match[1]}.${match[2]}` };
}

function catalogContext(catalog, now) {
  if (!isRecord(catalog) || !isRecord(catalog.fixedVersions) || !Array.isArray(catalog.cves)) throw new Error('Invalid advisory catalog.');
  const reviewed = parseEvidenceTime(catalog.reviewedAt);
  const expires = parseEvidenceTime(catalog.expiresAt);
  if (reviewed === null || expires === null || expires <= reviewed || !Number.isFinite(catalog.maxEvidenceAgeHours) || catalog.maxEvidenceAgeHours <= 0) {
    throw new Error('Invalid advisory catalog dates or evidence freshness limit.');
  }
  for (const [branch, version] of Object.entries(catalog.fixedVersions)) {
    if (!stableVersion(version) || stableVersion(version).branch !== branch) throw new Error('Invalid fixed-version mapping in advisory catalog.');
  }
  return { fresh: now >= reviewed && now <= expires, reviewed, expires };
}

function timeCheck(value, label, now, maxAge) {
  const at = parseEvidenceTime(value);
  if (at === null) return { valid: false, at: null, age: null, reason: `${label} is missing or is not a real timezone-qualified timestamp.` };
  const age = (now - at) / HOURS;
  if (age < 0) return { valid: false, at, age, reason: `${label} is in the future.` };
  if (age > maxAge) return { valid: false, at, age, reason: `${label} is older than the ${maxAge}-hour evidence window.` };
  return { valid: true, at, age, reason: '' };
}

function finish(status, reasons, nextActions, fixedVersion, evidenceAgeHours) {
  return { status, label: STATUS_LABELS[status], reasons: [...new Set(reasons)], nextActions: [...new Set(nextActions)], fixedVersion, evidenceAgeHours };
}

function assessNormalized(asset, catalog, now, context) {
  const reasons = [];
  const nextActions = [];
  const observed = timeCheck(asset.observedAt, 'Runtime observation', now, catalog.maxEvidenceAgeHours);
  const version = stableVersion(asset.phpVersion);
  const fixedVersion = version && own(catalog.fixedVersions, version.branch) ? catalog.fixedVersions[version.branch] : null;
  const fixed = fixedVersion ? stableVersion(fixedVersion) : null;
  const legacy = version && ([5, 7].includes(version.major) || (version.major === 8 && version.minor <= 1));
  const belowMinimum = version && (legacy || (fixed && version.patch < fixed.patch));
  const unfavorableWebEvidence = asset.observation === 'web-runtime' && asset.distribution === 'upstream' && belowMinimum;

  if (!context.fresh) {
    reasons.push(now < context.reviewed ? 'The catalog review date is in the future.' : 'The advisory catalog has expired.');
    nextActions.push('Review the official advisory sources and update the catalog before recording a positive outcome.');
  }
  if (!observed.valid) {
    reasons.push(observed.reason);
    nextActions.push('Record a fresh observation of the PHP runtime that actually serves this website.');
  }
  if (unfavorableWebEvidence) {
    reasons.push(legacy ? 'The recorded upstream web runtime is on a legacy branch without a fixed upstream release in this catalog.' : `The recorded upstream web runtime ${asset.phpVersion} is below the ${fixedVersion} fix.`);
    nextActions.push(legacy ? 'Plan a supported PHP upgrade or obtain a specific vendor backport confirmation.' : `Apply the vendor update for this environment; the upstream minimum on this branch is ${fixedVersion}.`);
    nextActions.push('Confirm all relevant workers use the update, then observe the web runtime and check the application.');
    if (asset.providerConfirmation.coversBothCves) reasons.push('The contrary web-runtime record prevents a provider assertion from closing this item.');
    return finish('action-required', reasons, nextActions, fixedVersion, observed.age);
  }

  // Unknown future branches and pre-release builds cannot inherit a fix from a different branch.
  const base = /^(\d+)\.(\d+)\.(\d+)/.exec(asset.phpVersion);
  const futureBranch = base && (Number(base[1]) > 8 || (Number(base[1]) === 8 && Number(base[2]) > 5));
  const prerelease = /(?:alpha|beta|(?:^|[.\s_-])rc\d*|\drc\d*|dev)/i.test(asset.phpVersion);
  if (futureBranch || prerelease) {
    reasons.push(futureBranch ? 'This PHP branch is outside the reviewed catalog.' : 'A pre-release or development version is not a fixed stable release in this catalog.');
    nextActions.push('Check the exact build against its vendor advisory; this catalog cannot establish its status.');
    return finish('verification-needed', reasons, nextActions, fixedVersion, observed.age);
  }

  // A vendor suffix must not hide a later observation from the backport review.
  // The numeric prefix is used only for this warning, never to establish that a
  // vendor build is vulnerable or that it contains an upstream fix.
  const reviewVersion = version ?? (base ? stableVersion(base[0]) : null);
  const reviewFixed = reviewVersion && own(catalog.fixedVersions, reviewVersion.branch) ? stableVersion(catalog.fixedVersions[reviewVersion.branch]) : null;
  const reviewLegacy = reviewVersion && ([5, 7].includes(reviewVersion.major) || (reviewVersion.major === 8 && reviewVersion.minor <= 1));
  const needsBackportReview = reviewVersion && (reviewLegacy || (reviewFixed && reviewVersion.patch < reviewFixed.patch));

  const confirmation = asset.providerConfirmation;
  const confirmed = timeCheck(confirmation.confirmedAt, 'Provider confirmation', now, catalog.maxEvidenceAgeHours);
  const hasProviderEvidence = confirmation.coversBothCves && confirmed.valid && confirmation.reference.length >= 8 && confirmation.reviewer.length > 0;
  if (context.fresh && hasProviderEvidence) {
    const providerReasons = [
      'An operator recorded a current, specific provider confirmation covering both catalog CVEs.',
      'This is a provider assertion, not an independently verified web-runtime observation.',
    ];
    if (asset.observation === 'web-runtime' && observed.at !== null && confirmed.at < observed.at && needsBackportReview) {
      return finish('verification-needed', [...reasons, 'The provider assertion predates a lower-version web-runtime observation; establish whether the observed build contains the backport.'], ['Obtain a confirmation that explicitly covers the observed package/build and this deployment.'], fixedVersion, observed.age);
    }
    return finish('provider-confirmed', providerReasons, ['Retain the provider reference and confirm it applies to this exact customer environment.'], fixedVersion, confirmed.age);
  }
  if (confirmation.coversBothCves || confirmation.reference || confirmation.confirmedAt || confirmation.reviewer) {
    if (!confirmation.coversBothCves) reasons.push('The provider record does not explicitly cover both CVEs.');
    if (!confirmed.valid) reasons.push(confirmed.reason);
    if (confirmation.reference.length < 8) reasons.push('The provider reference needs a specific ticket, statement, or advisory citation.');
    if (!confirmation.reviewer) reasons.push('The provider record has no named reviewer.');
  }

  if (asset.distribution !== 'upstream') {
    reasons.push(asset.distribution === 'vendor' ? 'Vendor builds may contain backported fixes that cannot be inferred from their upstream version number.' : 'The PHP distribution or build provenance is not established.');
    nextActions.push('Record the exact vendor package/build and a provider confirmation covering both CVEs, or establish upstream build provenance.');
  }
  if (!version) {
    reasons.push('The PHP version is missing, customized, or not an exact stable version.');
    nextActions.push('Collect the exact active web-runtime version and vendor package information.');
  } else if (!fixed) {
    reasons.push('The recorded version has no fixed upstream release in this catalog.');
    nextActions.push('Check a supported upgrade or a specific vendor backport.');
  }
  if (asset.observation !== 'web-runtime') {
    reasons.push(asset.observation === 'cli' ? 'CLI PHP can differ from the PHP runtime serving web requests.' : asset.observation === 'installed-package' ? 'An installed package does not establish which code existing web workers are running.' : 'The observation source is not established as the active web runtime.');
    nextActions.push('Observe the web runtime after updating and restarting all relevant workers.');
  }
  if (belowMinimum) {
    reasons.push('The recorded version warrants an update or backport review, but does not establish the active upstream web runtime.');
    nextActions.push('Review update availability and obtain runtime or vendor evidence.');
  }
  if (!asset.reviewer) { reasons.push('The runtime evidence has no named reviewer.'); nextActions.push('Record who reviewed the runtime evidence.'); }
  if (asset.evidenceNote.length < 12 && !safeReferenceUrl(asset.evidenceUrl)) {
    reasons.push('A meaningful runtime evidence note or a valid reference URL is required.');
    nextActions.push('Record how the runtime was observed and which workers or deployment the observation covers.');
  }
  const restarted = timeCheck(asset.restartConfirmedAt, 'Worker restart confirmation', now, catalog.maxEvidenceAgeHours);
  const smoke = timeCheck(asset.smokeTestAt, 'Application check', now, catalog.maxEvidenceAgeHours);
  if (!restarted.valid) { reasons.push(restarted.reason); nextActions.push('Confirm the update is active across all relevant workers and record the restart time.'); }
  if (!smoke.valid) { reasons.push(smoke.reason); nextActions.push('Check the important application flows and record when they passed.'); }
  const chronology = restarted.at !== null && observed.at !== null && smoke.at !== null && restarted.at <= observed.at && observed.at <= smoke.at;
  if (restarted.at !== null && observed.at !== null && smoke.at !== null && !chronology) {
    reasons.push('Evidence order must be worker restart, then web-runtime observation, then application check.');
    nextActions.push('Re-observe the running web runtime and check the application after the recorded restart.');
  }
  const complete = context.fresh && asset.distribution === 'upstream' && fixed && version.patch >= fixed.patch
    && asset.observation === 'web-runtime' && observed.valid && restarted.valid && smoke.valid && chronology
    && asset.reviewer && (asset.evidenceNote.length >= 12 || safeReferenceUrl(asset.evidenceUrl));
  if (complete) return finish('evidence-complete', [
    `Recorded active web-runtime version ${asset.phpVersion} meets the ${fixedVersion} minimum for this branch.`,
    'Fresh, ordered runtime, worker restart, and application-check evidence has a named reviewer.',
    'Evidence is operator supplied; this outcome is not a guarantee of security or absence of previous compromise.',
  ], ['Retain the evidence and recheck it when the deployment or advisory changes.'], fixedVersion, observed.age);
  return finish('verification-needed', reasons, nextActions, fixedVersion, observed.age);
}

export function assessAsset(input, options = {}) {
  const asset = normalizeAsset(input);
  const now = nowMillis(options.now);
  const catalog = options.catalog ?? CATALOG;
  return assessNormalized(asset, catalog, now, catalogContext(catalog, now));
}

export function assessFleet(input, options = {}) {
  const fleet = normalizeFleet(input);
  const now = nowMillis(options.now);
  const catalog = options.catalog ?? CATALOG;
  const context = catalogContext(catalog, now);
  const assets = fleet.assets.map((asset) => ({ ...asset, assessment: assessNormalized(asset, catalog, now, context) }));
  const summary = { total: assets.length, actionRequired: 0, verificationNeeded: 0, evidenceComplete: 0, providerConfirmed: 0 };
  const fields = { 'action-required': 'actionRequired', 'verification-needed': 'verificationNeeded', 'evidence-complete': 'evidenceComplete', 'provider-confirmed': 'providerConfirmed' };
  for (const asset of assets) summary[fields[asset.assessment.status]] += 1;
  return { schemaVersion: 1, organization: fleet.organization, demo: fleet.demo, generatedAt: new Date(now).toISOString(),
    catalogReviewedAt: catalog.reviewedAt, catalogExpiresAt: catalog.expiresAt, catalogFresh: context.fresh,
    assets, summary };
}

export function makeDemoFleet(now = new Date()) {
  const clock = nowMillis(now);
  const ago = (minutes) => new Date(clock - minutes * 60000).toISOString();
  const base = { environment: 'production', provider: 'Self-managed VPS', owner: 'Operations team', phpVersion: '8.4.27',
    distribution: 'upstream', observation: 'web-runtime', observedAt: ago(30), evidenceUrl: '',
    evidenceNote: 'Fictional example: all relevant workers restarted; active web runtime recorded and application flows checked.', reviewer: 'Demo operator',
    restartConfirmedAt: ago(40), smokeTestAt: ago(20) };
  return normalizeFleet({ schemaVersion: 1, organization: 'Northstar Web Studio — demo', demo: true, assets: [
    { ...base, id: 'demo-001', client: 'Fern & Field', name: 'Storefront', phpVersion: '8.4.26' },
    { ...base, id: 'demo-002', client: 'Fern & Field', name: 'Booking portal', phpVersion: '8.3.36' },
    { ...base, id: 'demo-003', client: 'Harbor Goods', name: 'Customer website', provider: 'Managed hosting', distribution: 'vendor', phpVersion: '8.2.29-vendor1', observation: 'unknown', observedAt: '', reviewer: '', restartConfirmedAt: '', smokeTestAt: '', evidenceNote: '', providerConfirmation: { coversBothCves: true, confirmedAt: ago(10), reference: 'DEMO-482: provider confirmed both CVEs fixed for this account and deployment.', reviewer: 'Demo operator' } },
    { ...base, id: 'demo-004', client: 'Harbor Goods', name: 'API server', observation: 'cli', restartConfirmedAt: '', smokeTestAt: '', evidenceNote: 'Fictional CLI version only; active web runtime has not been checked.' },
    { ...base, id: 'demo-005', client: 'Atlas Workshop', name: 'Legacy catalog', phpVersion: '7.4.33' },
    { ...base, id: 'demo-006', client: 'Atlas Workshop', name: 'Member portal', distribution: 'vendor', phpVersion: '8.2.29-1+deb12u1', evidenceNote: 'Fictional vendor package; backport confirmation still needed.' },
    { ...base, id: 'demo-007', client: 'Juniper Studio', name: 'Website', observedAt: ago(96 * 60), restartConfirmedAt: ago(97 * 60), smokeTestAt: ago(95 * 60) },
    { ...base, id: 'demo-008', client: 'Juniper Studio', name: 'Preview environment', environment: 'staging', phpVersion: '8.5.12' },
  ] });
}

export function safeReferenceUrl(value) {
  if (typeof value !== 'string' || /[\u0000-\u0020\u007f]/.test(value)) return null;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

function assessedSnapshot(input, options = {}) {
  const { client } = options;
  // Never trust imported status strings, summaries, labels, or HTML; rebuild from the raw evidence.
  const normalized = normalizeFleet(input);
  if (client !== undefined && typeof client !== 'string') throw new Error('Client filter must be a string.');
  const assets = client === undefined ? normalized.assets : normalized.assets.filter((asset) => asset.client === client);
  if (client !== undefined && assets.length === 0) throw new Error(`No assets match client: ${client}.`);
  return assessFleet({ ...normalized, assets }, { now: options.now });
}

function csvCell(value) {
  let cell = String(value ?? '');
  if (/^[\s\u0000-\u001f\u007f]*[=+\-@]/u.test(cell) || /^[\u0000-\u001f\u007f]/u.test(cell)) cell = `'${cell}`;
  return `"${cell.replace(/"/g, '""')}"`;
}

export function fleetToCsv(input, options = {}) {
  const report = assessedSnapshot(input, options);
  const columns = ['Organization', 'Demo', 'Generated at', 'Catalog reviewed', 'Catalog expires', 'Catalog current', 'Asset ID', 'Client', 'Site', 'Environment', 'Provider', 'Owner', 'PHP version', 'Distribution', 'Observation', 'Observed at', 'Status', 'Reason', 'Next actions', 'Fixed upstream minimum', 'Reviewer', 'Restart confirmed at', 'Application checked at', 'Evidence note', 'Evidence URL', 'Provider covers both CVEs', 'Provider confirmed at', 'Provider reference', 'Provider reviewer'];
  const rows = report.assets.map((asset) => [report.organization, report.demo ? 'DEMO — fictional data' : 'No', report.generatedAt, report.catalogReviewedAt, report.catalogExpiresAt, report.catalogFresh,
    asset.id, asset.client, asset.name, asset.environment, asset.provider, asset.owner, asset.phpVersion, asset.distribution, asset.observation, asset.observedAt, asset.assessment.label,
    asset.assessment.reasons.join(' | '), asset.assessment.nextActions.join(' | '), asset.assessment.fixedVersion ?? '', asset.reviewer, asset.restartConfirmedAt, asset.smokeTestAt,
    asset.evidenceNote, asset.evidenceUrl, asset.providerConfirmation.coversBothCves, asset.providerConfirmation.confirmedAt, asset.providerConfirmation.reference, asset.providerConfirmation.reviewer]);
  return [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function renderReport(input, options = {}) {
  const report = assessedSnapshot(input, options);
  const e = escapeHtml;
  const list = (items) => `<ul>${items.map((item) => `<li>${e(item)}</li>`).join('')}</ul>`;
  const evidenceLink = (asset) => {
    const url = safeReferenceUrl(asset.evidenceUrl);
    return url ? `<a href="${e(url)}" rel="noreferrer noopener">Evidence reference</a>` : asset.evidenceUrl ? e(asset.evidenceUrl) : '—';
  };
  const cards = report.assets.map((asset) => `<article>
    <div class="asset-head"><div><p class="eyebrow">${e(asset.client)} · ${e(asset.environment)}</p><h2>${e(asset.name)}</h2></div><span class="badge ${e(asset.assessment.status)}">${e(asset.assessment.label)}</span></div>
    <dl><div><dt>Owner</dt><dd>${e(asset.owner || 'Unassigned')}</dd></div><div><dt>Provider</dt><dd>${e(asset.provider || 'Not recorded')}</dd></div><div><dt>PHP / observation</dt><dd>${e(asset.phpVersion || 'Unknown')} · ${e(asset.observation)}</dd></div><div><dt>Runtime observation</dt><dd>${e(asset.observedAt || 'Not recorded')}</dd></div><div><dt>Reviewer</dt><dd>${e(asset.reviewer || 'Not recorded')}</dd></div><div><dt>Worker restart / application check</dt><dd>${e(asset.restartConfirmedAt || 'Not recorded')} / ${e(asset.smokeTestAt || 'Not recorded')}</dd></div></dl>
    <h3>Assessment</h3>${list(asset.assessment.reasons)}<h3>Next actions</h3>${list(asset.assessment.nextActions)}
    <div class="evidence"><strong>Recorded evidence</strong><p>${e(asset.evidenceNote || 'No runtime evidence note recorded.')}</p><p>${evidenceLink(asset)}</p>${asset.providerConfirmation.reference ? `<p><strong>Provider assertion:</strong> ${e(asset.providerConfirmation.reference)}<br>Reviewed by ${e(asset.providerConfirmation.reviewer || 'Not recorded')} · ${e(asset.providerConfirmation.confirmedAt || 'Not recorded')} · Covers both CVEs: ${asset.providerConfirmation.coversBothCves ? 'yes' : 'no'}</p>` : ''}</div>
  </article>`).join('');
  const sources = CATALOG.sources.map((source) => `<li><a href="${e(source.url)}" rel="noreferrer noopener">${e(source.title)}</a></li>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; base-uri 'none'; form-action 'none'"><meta name="referrer" content="no-referrer"><title>${e(options.client || report.organization)} — PHP evidence report</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f6f5;color:#17312c;font:15px/1.65 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1050px;margin:auto;padding:48px 32px}header{border-bottom:2px solid #17312c;padding-bottom:28px;margin-bottom:24px}h1{font-size:38px;line-height:1.12;letter-spacing:-1px;margin:8px 0 16px}h2{font-size:23px;line-height:1.2;margin:3px 0}h3{font-size:13px;text-transform:uppercase;letter-spacing:.09em;margin:22px 0 8px}p{margin:6px 0}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:11px;font-weight:750;color:#586f66}.meta{color:#586f66;font-size:13px}.notice{padding:14px 18px;background:#fff1cc;border-left:4px solid #b46b00;border-radius:6px;margin:20px 0}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:26px 0}.metric{border:1px solid #d5dfda;padding:14px;background:white;border-radius:10px}.metric b{display:block;font-size:28px;line-height:1.2}.metric span{font-size:12px;color:#53675e}article{background:white;border:1px solid #d5dfda;border-radius:12px;padding:26px;margin:18px 0;break-inside:avoid}.asset-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.badge{display:inline-block;white-space:nowrap;border-radius:30px;padding:4px 12px;font-size:12px;font-weight:700;background:#eef0f2}.action-required{background:#fee3de;color:#8b2519}.verification-needed{background:#fff0c2;color:#775300}.evidence-complete{background:#dff3e9;color:#155638}.provider-confirmed{background:#e4edf9;color:#294e81}dl{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:24px 0}dt{font-size:11px;color:#64796f;text-transform:uppercase;letter-spacing:.06em}dd{margin:0;overflow-wrap:anywhere}ul{padding-left:20px;margin:0}li{margin:4px 0}.evidence{background:#f5f8f6;border-radius:8px;padding:15px;margin-top:20px;font-size:13px;overflow-wrap:anywhere}a{color:#175b50}footer{font-size:12px;color:#526a5e;border-top:1px solid #c9d8cf;margin-top:36px;padding-top:20px}.empty{padding:36px;text-align:center;border:1px dashed #a9bbb0;border-radius:10px}@media(max-width:600px){main{padding:25px 16px}.metrics{grid-template-columns:repeat(2,1fr)}.asset-head{display:block}.badge{margin-top:12px}dl{grid-template-columns:1fr}h1{font-size:30px}}@media print{body{background:white}main{max-width:none;padding:0}article{box-shadow:none}.metrics{break-inside:avoid}a{color:inherit}header{padding-top:0}}
</style></head><body><main><header><p class="eyebrow">PHP Response Desk / Customer handover</p><h1>PHP patch evidence report</h1><p><strong>${e(options.client || report.organization)}</strong>${options.client ? ` · Prepared by ${e(report.organization)}` : ''}</p><p class="meta">Generated ${e(report.generatedAt)} · ${report.summary.total} recorded ${report.summary.total === 1 ? 'environment' : 'environments'}</p><p class="meta">Scope: ${e(CATALOG.cves.join(' and '))}</p></header>
${report.demo ? '<div class="notice"><strong>DEMONSTRATION — fictional customers and evidence.</strong> This report does not describe a real assessment.</div>' : ''}
${!report.catalogFresh ? '<div class="notice"><strong>Catalog review required.</strong> The source snapshot is expired or not yet valid. Positive outcomes remain unavailable until it is reviewed.</div>' : ''}
<div class="metrics"><div class="metric"><b>${report.summary.actionRequired}</b><span>Action required</span></div><div class="metric"><b>${report.summary.verificationNeeded}</b><span>Verification needed</span></div><div class="metric"><b>${report.summary.evidenceComplete}</b><span>Evidence complete</span></div><div class="metric"><b>${report.summary.providerConfirmed}</b><span>Provider confirmed</span></div></div>
${cards || '<p class="empty">No environments have been recorded. An empty inventory does not establish that there are no affected systems.</p>'}
<footer><p><strong>How to interpret this report</strong></p><p>Evidence is supplied by the operator. “Evidence complete” means that the recorded upstream web-runtime, restart, and application-check evidence satisfies this tool’s rules. “Provider confirmed” is a separate, recorded provider assertion. Neither outcome independently verifies a server, establishes the absence of compromise, or covers every vulnerability.</p><p>Catalog reviewed ${e(report.catalogReviewedAt)}; review expires ${e(report.catalogExpiresAt)}. Evidence freshness window: ${CATALOG.maxEvidenceAgeHours} hours. Changed deployments require new evidence. This export can contain customer infrastructure information; share only with its intended recipients.</p><h3>Primary source references</h3><ul>${sources}</ul></footer></main></body></html>`;
}
