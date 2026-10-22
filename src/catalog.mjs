/** Reviewed source snapshot, not an automatically refreshed vulnerability feed. */
export const CATALOG = Object.freeze({
  id: 'php2shell-2026-10-21',
  reviewedAt: '2026-10-21T14:00:00Z',
  expiresAt: '2026-10-28T23:59:59Z',
  maxEvidenceAgeHours: 72,
  cves: Object.freeze(['CVE-2026-109618', 'CVE-2026-109619']),
  fixedVersions: Object.freeze({ '8.2': '8.2.35', '8.3': '8.3.36', '8.4': '8.4.27', '8.5': '8.5.12' }),
  sources: Object.freeze([
    Object.freeze({ title: 'PHP release and mitigation advisory', url: 'https://www.php.net/archive/2026.php' }),
    Object.freeze({ title: 'PHP: CVE-2026-109618', url: 'https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w' }),
    Object.freeze({ title: 'PHP: CVE-2026-109619', url: 'https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp' }),
    Object.freeze({ title: 'CERT-EU advisory 2026-018', url: 'https://cert.europa.eu/publications/security-advisories/2026-018' }),
    Object.freeze({ title: 'Laravel Forge operational guidance', url: 'https://laravel.com/forge/docs/knowledge-base/php-security-release-october-2026' }),
  ]),
});
