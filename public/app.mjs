import { normalizeFleet, assessAsset, assessFleet, makeDemoFleet, fleetToCsv, renderReport, parseEvidenceTime } from '/src/core.mjs';
import { CATALOG } from '/src/catalog.mjs';

const STORAGE_KEY = 'php-response-desk.fleet.v1';
const MAX_BYTES = 5 * 1024 * 1024;
const $ = (id) => document.getElementById(id);
const labels = Object.freeze({
  'action-required': 'Action required',
  'verification-needed': 'Needs verification',
  'evidence-complete': 'Evidence complete',
  'provider-confirmed': 'Provider confirmed',
});
const observationLabels = Object.freeze({ 'web-runtime': 'Web runtime', 'installed-package': 'Installed package', cli: 'CLI observation', unknown: 'Not observed' });
const priority = Object.freeze({ 'action-required': 0, 'verification-needed': 1, 'provider-confirmed': 2, 'evidence-complete': 3 });
const textFields = ['id', 'name', 'client', 'owner', 'environment', 'provider', 'phpVersion', 'distribution', 'observation', 'evidenceUrl', 'evidenceNote', 'reviewer'];
const dateFields = ['observedAt', 'restartConfirmedAt', 'smokeTestAt'];
let storageWorks = true;
let workspaceSaved = false;
let recoveryRaw = null;
let fleet;
let assessed;
let view = 'overview';
let editingId = null;
let pendingImport = null;
let toastTimer;
let previewTimer;
let visibleAssets = [];
let originalDates = {};

function element(tag, className = '', text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

function formatDate(value, includeTime = false) {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat(undefined, includeTime
    ? { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', year: 'numeric' }).format(parsed);
}

function safeUrl(value) {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.href : null;
  } catch { return null; }
}

function toLocalInput(value) {
  if (!value) return '';
  const timestamp = parseEvidenceTime(value);
  if (timestamp === null) return '';
  const date = new Date(timestamp);
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function fromLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : value;
}

function showToast(message, error = false) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').classList.toggle('error', error);
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, error ? 8000 : 4500);
}

function setError(id, error) {
  $(id).textContent = error ? (error instanceof Error ? error.message : String(error)) : '';
  $(id).hidden = !error;
}

function readWorkspace() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        if (new TextEncoder().encode(raw).length > MAX_BYTES) throw new Error('Saved workspace is too large.');
        const normalized = normalizeFleet(JSON.parse(raw));
        workspaceSaved = true;
        return normalized;
      } catch {
        recoveryRaw = raw;
        $('recoveryWarning').hidden = false;
      }
    }
  } catch { storageWorks = false; }
  const initial = normalizeFleet(makeDemoFleet());
  if (recoveryRaw === null && storageWorks) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      workspaceSaved = true;
    } catch { storageWorks = false; }
  }
  return initial;
}

function saveWorkspace(candidate) {
  // Validation precedes state changes, including failed imports.
  const normalized = normalizeFleet(candidate);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    storageWorks = true;
  } catch { storageWorks = false; }
  workspaceSaved = storageWorks;
  fleet = normalized;
  render();
  return storageWorks;
}

function notifySaved(message) {
  showToast(storageWorks ? message : `${message} Saved for this session only; export JSON to keep a copy.`, !storageWorks);
}

function resetFilters() {
  $('searchInput').value = '';
  $('clientFilter').value = '';
  $('statusFilter').value = '';
}

function setView(nextView) {
  view = nextView;
  $('statusFilter').value = '';
  for (const button of document.querySelectorAll('[data-view]')) {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  $('pageTitle').textContent = view === 'queue' ? 'Close the evidence gaps.' : 'A clear answer for every site.';
  $('pageDescription').textContent = view === 'queue'
    ? 'Focus on sites that need an update decision or a better evidence record.'
    : 'Track the update. Record the evidence. Keep your customers informed.';
  $('breadcrumbCurrent').textContent = view === 'queue' ? 'Evidence queue' : 'Fleet overview';
  $('inventoryTitle').firstChild.textContent = view === 'queue' ? 'Open evidence records ' : 'Fleet inventory ';
  document.title = `PHP Response Desk · ${view === 'queue' ? 'Evidence queue' : 'Fleet overview'}`;
  render();
}

function populateClients(select, firstLabel, keep = '') {
  const options = [new Option(firstLabel, '')];
  for (const client of [...new Set(fleet.assets.map((asset) => asset.client))].sort((a, b) => a.localeCompare(b))) {
    options.push(new Option(client, client));
  }
  select.replaceChildren(...options);
  if (options.some((option) => option.value === keep)) select.value = keep;
}

function getVisibleAssets() {
  const query = $('searchInput').value.trim().toLocaleLowerCase();
  const client = $('clientFilter').value;
  const status = $('statusFilter').value;
  return assessed.assets.filter((asset) => {
    if (view === 'queue' && !['action-required', 'verification-needed'].includes(asset.assessment.status)) return false;
    if (client && asset.client !== client) return false;
    if (status && asset.assessment.status !== status) return false;
    const searchable = [asset.name, asset.id, asset.client, asset.owner, asset.provider].join(' ').toLocaleLowerCase();
    return !query || searchable.includes(query);
  }).sort((a, b) => priority[a.assessment.status] - priority[b.assessment.status] || a.client.localeCompare(b.client) || a.name.localeCompare(b.name));
}

function initials(value) {
  return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => [...part][0] || '').join('').toLocaleUpperCase();
}

function evidenceAge(asset) {
  if (asset.assessment.status === 'provider-confirmed') return 'Provider statement recorded';
  const age = asset.assessment.evidenceAgeHours;
  if (age === null || !Number.isFinite(age)) return 'No valid observation';
  if (age < 0) return 'Review observation time';
  if (age < 1) return 'Observed within the hour';
  if (age < 24) return `Observed ${Math.floor(age)}h ago`;
  return `Observed ${Math.floor(age / 24)}d ago`;
}

function statusPill(status) {
  return element('span', `status-pill status-${Object.hasOwn(labels, status) ? status : 'verification-needed'}`, labels[status] || 'Needs verification');
}

function renderRows() {
  visibleAssets = getVisibleAssets();
  const fragment = document.createDocumentFragment();
  for (const asset of visibleAssets) {
    const row = element('tr');
    const site = element('td');
    const siteCell = element('div', 'site-cell');
    const avatar = element('span', 'site-avatar', initials(asset.client));
    avatar.setAttribute('aria-hidden', 'true');
    const siteInfo = element('div', 'site-info');
    const name = element('button', 'site-name', asset.name);
    name.type = 'button';
    name.title = asset.name;
    name.addEventListener('click', () => openEditor(asset.id));
    const subtitle = `${asset.client} · ${asset.environment}`;
    const meta = element('span', 'site-meta', subtitle);
    meta.title = subtitle;
    siteInfo.append(name, meta);
    siteCell.append(avatar, siteInfo);
    site.append(siteCell);
    const php = element('td');
    php.append(element('span', 'version', asset.phpVersion || '—'), element('span', 'observation', observationLabels[asset.observation] || 'Not observed'));
    const status = element('td');
    const detail = element('span', 'status-detail', evidenceAge(asset));
    detail.title = asset.assessment.reasons.join(' ');
    status.append(statusPill(asset.assessment.status), detail);
    const owner = element('td');
    const ownerCell = element('div', 'owner-cell');
    if (asset.owner) {
      const ownerAvatar = element('span', 'owner-avatar', initials(asset.owner));
      ownerAvatar.setAttribute('aria-hidden', 'true');
      ownerCell.append(ownerAvatar);
    }
    ownerCell.append(element('span', '', asset.owner || 'Unassigned'));
    ownerCell.title = asset.owner || 'Unassigned';
    owner.append(ownerCell);
    const control = element('td');
    const review = element('button', 'review-button', '›');
    review.type = 'button';
    review.setAttribute('aria-label', `Review ${asset.name}`);
    review.addEventListener('click', () => openEditor(asset.id));
    control.append(review);
    row.append(site, php, status, owner, control);
    fragment.append(row);
  }
  $('fleetRows').replaceChildren(fragment);
  $('inventoryCount').textContent = visibleAssets.length;
  $('visibleCount').textContent = `Showing ${visibleAssets.length} of ${fleet.assets.length} site${fleet.assets.length === 1 ? '' : 's'}`;
  $('emptyState').hidden = visibleAssets.length > 0;
  const empty = fleet.assets.length === 0;
  $('emptyTitle').textContent = empty ? 'Your first site starts here' : view === 'queue' && !$('searchInput').value && !$('clientFilter').value && !$('statusFilter').value ? 'No open evidence records' : 'No sites match these filters';
  $('emptyDescription').textContent = empty ? 'Add a site or import a local collector file to begin.' : 'Try another client, status, or search term to see more sites.';
  $('emptyAction').textContent = empty ? 'Add your first site' : 'Reset filters';
  $('exportCsvButton').disabled = visibleAssets.length === 0;
  for (const card of document.querySelectorAll('[data-status]')) {
    card.dataset.selected = String(card.dataset.status === $('statusFilter').value);
    card.setAttribute('aria-pressed', card.dataset.selected);
  }
}

function renderNextActions() {
  const open = assessed.assets.filter((asset) => ['action-required', 'verification-needed'].includes(asset.assessment.status))
    .sort((a, b) => priority[a.assessment.status] - priority[b.assessment.status]);
  $('nextCount').textContent = open.length;
  $('nextActions').replaceChildren();
  if (!open.length) {
    const state = element('div', 'empty-next');
    state.append(element('strong', '', fleet.assets.length ? 'No open actions recorded.' : 'Your queue is empty.'), document.createTextNode(fleet.assets.length ? 'Review the evidence before customer handover.' : 'Add a site to see its next steps.'));
    $('nextActions').append(state);
    return;
  }
  open.slice(0, 3).forEach((asset, index) => {
    const button = element('button', 'next-item');
    button.type = 'button';
    const content = element('span', 'next-content');
    content.append(element('strong', '', asset.name), element('p', '', asset.assessment.nextActions[0] || 'Review the evidence record.'));
    button.append(element('span', 'next-number', String(index + 1).padStart(2, '0')), content);
    button.addEventListener('click', () => openEditor(asset.id));
    $('nextActions').append(button);
  });
}

function render() {
  assessed = assessFleet(fleet);
  $('organizationLabel').textContent = fleet.organization;
  $('organizationLabel').title = fleet.organization;
  $('saveState').textContent = workspaceSaved ? 'Stored in this browser' : storageWorks ? 'Demo preview · recovery available' : 'Session only · export to keep';
  $('demoBanner').hidden = !fleet.demo;
  $('actionCount').textContent = assessed.summary.actionRequired;
  $('verifyCount').textContent = assessed.summary.verificationNeeded;
  $('completeCount').textContent = assessed.summary.evidenceComplete;
  $('providerCount').textContent = assessed.summary.providerConfirmed;
  $('queueCount').textContent = assessed.summary.actionRequired + assessed.summary.verificationNeeded;
  const clients = new Set(fleet.assets.map((asset) => asset.client)).size;
  $('fleetDescription').textContent = `${fleet.assets.length} site${fleet.assets.length === 1 ? '' : 's'} across ${clients} client${clients === 1 ? '' : 's'} · Every outcome has an evidence record.`;
  populateClients($('clientFilter'), 'All clients', $('clientFilter').value);
  $('catalogWarning').hidden = assessed.catalogFresh;
  $('catalogWarning').textContent = 'The advisory catalog is outside its review window. Positive outcomes are paused; review and update the catalog before using a report for handover.';
  $('catalogNote').textContent = `Reviewed ${formatDate(CATALOG.reviewedAt)} · ${assessed.catalogFresh ? 'Within review window' : 'Review required'}`;
  renderRows();
  renderNextActions();
}

function showDialog(id, focusSelector) {
  const dialog = $(id);
  if (dialog.open) return;
  dialog.showModal();
  if (focusSelector) requestAnimationFrame(() => dialog.querySelector(focusSelector)?.focus());
}

function confirmAction(title, message, action = 'Continue') {
  $('confirmTitle').textContent = title;
  $('confirmMessage').textContent = message;
  $('confirmAction').textContent = action;
  $('confirmDialog').returnValue = 'cancel';
  return new Promise((resolve) => {
    $('confirmDialog').addEventListener('close', () => resolve($('confirmDialog').returnValue === 'confirm'), { once: true });
    showDialog('confirmDialog', '[value="cancel"]');
  });
}

function newId() {
  return `site-${crypto.randomUUID ? crypto.randomUUID().slice(0, 12) : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`}`;
}

function openEditor(id = null) {
  editingId = id;
  const existing = fleet.assets.find((asset) => asset.id === id);
  const initial = existing || normalizeFleet({ schemaVersion: 1, organization: fleet.organization, assets: [{ id: newId(), name: 'New site', client: 'New client' }] }).assets[0];
  const form = $('assetForm');
  form.reset();
  originalDates = {};
  for (const field of textFields) form.elements.namedItem(field).value = initial[field] || '';
  if (!existing) { form.elements.namedItem('name').value = ''; form.elements.namedItem('client').value = ''; }
  for (const field of dateFields) {
    const display = toLocalInput(initial[field]);
    form.elements.namedItem(field).value = display;
    originalDates[field] = { raw: initial[field], display: form.elements.namedItem(field).value };
  }
  form.elements.namedItem('coversBothCves').checked = initial.providerConfirmation.coversBothCves;
  form.elements.namedItem('confirmedAt').value = toLocalInput(initial.providerConfirmation.confirmedAt);
  originalDates.confirmedAt = { raw: initial.providerConfirmation.confirmedAt, display: form.elements.namedItem('confirmedAt').value };
  form.elements.namedItem('providerReference').value = initial.providerConfirmation.reference;
  form.elements.namedItem('providerReviewer').value = initial.providerConfirmation.reviewer;
  $('providerDetails').open = initial.providerConfirmation.coversBothCves || Boolean(initial.providerConfirmation.reference);
  $('siteId').readOnly = Boolean(existing);
  $('editorTitle').textContent = existing ? 'Review site evidence' : 'Add a site';
  $('deleteButton').hidden = !existing;
  setError('formError', null);
  updatePreview();
  showDialog('editorDialog', '#siteName');
}

function collectFormAsset() {
  const form = $('assetForm');
  const asset = {};
  for (const field of textFields) asset[field] = form.elements.namedItem(field).value;
  const readDate = (field) => {
    const value = form.elements.namedItem(field).value;
    // An unrelated edit must not rewrite timestamps or repair invalid imported evidence.
    return value === originalDates[field]?.display ? originalDates[field].raw : fromLocalInput(value);
  };
  for (const field of dateFields) asset[field] = readDate(field);
  asset.providerConfirmation = {
    coversBothCves: form.elements.namedItem('coversBothCves').checked,
    confirmedAt: readDate('confirmedAt'),
    reference: form.elements.namedItem('providerReference').value,
    reviewer: form.elements.namedItem('providerReviewer').value,
  };
  return asset;
}

function updatePreview() {
  const container = $('assessmentPreview');
  container.replaceChildren();
  try {
    const draft = collectFormAsset();
    const normalized = normalizeFleet({ schemaVersion: 1, organization: fleet.organization, assets: [draft] });
    const result = assessAsset(normalized.assets[0]);
    container.append(statusPill(result.status), element('p', '', result.reasons[0] || 'Review the evidence for this site.'));
    if (result.nextActions.length) {
      container.append(element('h3', '', 'Next actions'));
      const list = element('ul');
      for (const action of result.nextActions.slice(0, 4)) list.append(element('li', '', action));
      container.append(list);
    }
  } catch {
    container.append(statusPill('verification-needed'), element('p', '', 'Start with the site and client name. Evidence will be assessed as you fill in the record.'));
  }
}

function download(contents, filename, type) {
  const blob = new Blob([contents], { type });
  const href = URL.createObjectURL(blob);
  const anchor = element('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function fileStem(value) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 65) || 'workspace';
}

function updateReportScope() {
  const client = $('reportClient').value;
  const assets = assessed.assets.filter((asset) => !client || asset.client === client);
  const open = assets.filter((asset) => ['action-required', 'verification-needed'].includes(asset.assessment.status)).length;
  $('reportScope').replaceChildren(element('strong', '', client || 'All clients · internal report'), document.createTextNode(`${assets.length} site${assets.length === 1 ? '' : 's'} · ${open} unresolved · ${fleet.demo ? 'Fictional demo data' : 'Operator-recorded evidence'}`));
}

function openReport() {
  assessed = assessFleet(fleet);
  populateClients($('reportClient'), 'All clients — internal use', $('clientFilter').value);
  setError('reportError', null);
  updateReportScope();
  showDialog('reportDialog', '#reportClient');
}

async function startEmpty() {
  if (!(await confirmAction('Start an empty workspace?', 'This removes the current inventory from this browser. Export workspace JSON first if you need to keep it.', 'Start empty'))) return;
  saveWorkspace({ schemaVersion: 1, organization: fleet.demo ? 'Your agency' : fleet.organization, demo: false, assets: [] });
  resetFilters();
  setView('overview');
  notifySaved('Empty workspace ready. Add a site or import inventory.');
  $('addButton').focus();
}

function renderSourceRecord() {
  $('fixedVersions').replaceChildren();
  $('sourceVersions').replaceChildren();
  for (const [branch, version] of Object.entries(CATALOG.fixedVersions)) {
    for (const target of [$('fixedVersions'), $('sourceVersions')]) {
      const item = element('div', 'version-item');
      item.append(element('span', '', `PHP ${branch}`), element('strong', '', version));
      target.append(item);
    }
  }
  $('catalogDetails').replaceChildren();
  for (const [term, definition] of [
    ['Catalog ID', CATALOG.id],
    ['Reviewed', formatDate(CATALOG.reviewedAt, true)],
    ['Review expires', formatDate(CATALOG.expiresAt, true)],
    ['Evidence window', `${CATALOG.maxEvidenceAgeHours} hours`],
    ['CVEs covered', CATALOG.cves.join(', ')],
  ]) $('catalogDetails').append(element('dt', '', term), element('dd', '', definition));
  $('sourceLinks').replaceChildren();
  for (const source of CATALOG.sources) {
    const item = element('li');
    const url = safeUrl(source.url);
    if (url) {
      const link = element('a', '', source.title);
      link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      item.append(link);
    } else item.textContent = source.title;
    $('sourceLinks').append(item);
  }
}

for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => setView(button.dataset.view));
for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', () => $(button.dataset.close).close());
for (const button of document.querySelectorAll('[data-status]')) button.addEventListener('click', () => {
  if (view === 'queue' && ['evidence-complete', 'provider-confirmed'].includes(button.dataset.status)) setView('overview');
  $('statusFilter').value = $('statusFilter').value === button.dataset.status ? '' : button.dataset.status;
  renderRows();
  $('inventoryTitle').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
});
for (const id of ['searchInput', 'clientFilter', 'statusFilter']) $(id).addEventListener(id === 'searchInput' ? 'input' : 'change', renderRows);
$('queueButton').addEventListener('click', () => setView('queue'));
$('addButton').addEventListener('click', () => openEditor());
$('emptyAction').addEventListener('click', () => { if (!fleet.assets.length) openEditor(); else { resetFilters(); setView('overview'); } });
$('resetButton').addEventListener('click', startEmpty);
$('demoEmptyButton').addEventListener('click', startEmpty);
async function loadDemo() {
  if (!(await confirmAction('Load the fictional demo?', 'This replaces the current inventory in this browser with eight example sites. Export JSON first to keep your current workspace.', 'Load demo'))) return;
  saveWorkspace(makeDemoFleet());
  resetFilters();
  setView('overview');
  notifySaved('Fictional demo loaded.');
}
$('demoButton').addEventListener('click', loadDemo);
$('settingsResetButton').addEventListener('click', () => { $('workspaceDialog').close(); startEmpty(); });
$('settingsDemoButton').addEventListener('click', () => { $('workspaceDialog').close(); loadDemo(); });

$('assetForm').addEventListener('input', () => { clearTimeout(previewTimer); previewTimer = setTimeout(updatePreview, 150); });
$('assetForm').addEventListener('change', updatePreview);
$('assetForm').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!$('assetForm').reportValidity()) return;
  try {
    const asset = collectFormAsset();
    const assets = editingId ? fleet.assets.map((item) => item.id === editingId ? asset : item) : [...fleet.assets, asset];
    saveWorkspace({ ...fleet, assets });
    $('editorDialog').close();
    notifySaved('Site evidence saved.');
  } catch (error) { setError('formError', error); $('formError').scrollIntoView({ block: 'nearest' }); }
});
$('deleteButton').addEventListener('click', async () => {
  const asset = fleet.assets.find((item) => item.id === editingId);
  if (!asset) return;
  if (!(await confirmAction('Delete this site?', `Remove “${asset.name}” and its evidence from this workspace?`, 'Delete site'))) return;
  saveWorkspace({ ...fleet, assets: fleet.assets.filter((item) => item.id !== editingId) });
  $('editorDialog').close();
  $('addButton').focus();
  notifySaved('Site removed from this workspace.');
});

for (const id of ['navReports', 'reportButton']) $(id).addEventListener('click', openReport);
for (const id of ['navSources', 'sourcesButton']) $(id).addEventListener('click', () => showDialog('sourcesDialog'));
$('reportClient').addEventListener('change', updateReportScope);
$('reportForm').addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    const client = $('reportClient').value;
    const html = renderReport(assessFleet(fleet), client ? { client } : {});
    download(html, `php-response-${fileStem(client || 'all-clients')}-${new Date().toISOString().slice(0, 10)}.html`, 'text/html;charset=utf-8');
    $('reportDialog').close();
    showToast('Report downloaded. Open it in a browser to print or save as PDF.');
  } catch (error) { setError('reportError', error); }
});
$('exportJsonButton').addEventListener('click', () => {
  download(`${JSON.stringify(normalizeFleet(fleet), null, 2)}\n`, `php-response-${fileStem(fleet.organization)}.json`, 'application/json');
  showToast('Full workspace JSON exported.');
});
$('exportCsvButton').addEventListener('click', () => {
  const selected = new Set(visibleAssets.map((asset) => asset.id));
  const current = assessFleet({ ...fleet, assets: fleet.assets.filter((asset) => selected.has(asset.id)) });
  download(fleetToCsv(current), `php-response-${fileStem($('clientFilter').value || 'current-view')}.csv`, 'text/csv;charset=utf-8');
  showToast(`${current.assets.length} visible site records exported to CSV.`);
});

$('importButton').addEventListener('click', () => $('importFile').click());
$('importFile').addEventListener('change', async () => {
  const file = $('importFile').files[0];
  $('importFile').value = '';
  if (!file) return;
  try {
    if (file.size > MAX_BYTES) throw new Error('Import exceeds the 5 MiB limit.');
    const raw = await file.text();
    const parsed = normalizeFleet(JSON.parse(raw));
    pendingImport = parsed;
    $('importDescription').textContent = `${parsed.assets.length} site record${parsed.assets.length === 1 ? '' : 's'} from “${parsed.organization}”. ${parsed.demo ? 'This file is marked as fictional demo data.' : 'Imported evidence remains subject to the same review rules.'}`;
    const mergeOption = $('importMode').querySelector('option[value="merge"]');
    mergeOption.disabled = fleet.demo !== parsed.demo;
    $('importMode').value = 'replace';
    $('importHint').textContent = fleet.demo !== parsed.demo
      ? 'Demo records and real inventory stay separate. This import will replace the workspace; export JSON first if you need the current records.'
      : 'Replace uses the imported workspace. Merge keeps existing sites and replaces matching record IDs with the imported evidence.';
    setError('importError', null);
    showDialog('importDialog', '#importMode');
  } catch (error) { pendingImport = null; showToast(`Import failed: ${error.message} Your current workspace was kept.`, true); }
});
$('importForm').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!pendingImport) return;
  try {
    let candidate = pendingImport;
    if ($('importMode').value === 'merge') {
      if (fleet.demo !== pendingImport.demo) throw new Error('Demo and real data cannot be merged.');
      const merged = new Map(fleet.assets.map((asset) => [asset.id, asset]));
      for (const asset of pendingImport.assets) merged.set(asset.id, asset);
      candidate = { ...fleet, assets: [...merged.values()] };
    }
    saveWorkspace(candidate);
    pendingImport = null;
    resetFilters();
    render();
    $('importDialog').close();
    notifySaved('Inventory imported and assessed.');
  } catch (error) { setError('importError', error); }
});
$('importDialog').addEventListener('close', () => {
  // A queued close event from the previous preview must not clear a newer import.
  if (!$('importDialog').open) pendingImport = null;
});

$('workspaceButton').addEventListener('click', () => {
  $('organizationInput').value = fleet.organization;
  setError('workspaceError', null);
  showDialog('workspaceDialog', '#organizationInput');
});
$('workspaceForm').addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    saveWorkspace({ ...fleet, organization: $('organizationInput').value });
    $('workspaceDialog').close();
    notifySaved('Workspace name saved.');
  } catch (error) { setError('workspaceError', error); }
});
$('recoverButton').addEventListener('click', () => { if (recoveryRaw !== null) download(recoveryRaw, 'php-response-recovery.json', 'application/json'); });

// A second tab must not silently replace this tab's in-progress evidence edits.
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY && event.newValue !== JSON.stringify(fleet)) {
    showToast('Another tab changed this workspace. Export your current JSON before reloading to use the other tab’s version.', true);
  }
});

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
for (const hint of document.querySelectorAll('.time-hint')) hint.textContent = `Times use your browser's timezone (${timezone}).`;
fleet = readWorkspace();
renderSourceRecord();
render();
// Expiry is re-evaluated while the application remains open; no background network work.
setInterval(() => { if (!document.hidden) render(); }, 60000);
