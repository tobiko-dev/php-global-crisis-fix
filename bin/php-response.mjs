#!/usr/bin/env node
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { assessFleet, makeDemoFleet, fleetToCsv, renderReport, normalizeFleet, LIMITS } from '../src/core.mjs';

const HELP = `PHP Response Desk — local PHP patch evidence workflow

Usage:
  node bin/php-response.mjs demo [--format html|json|csv] [--out FILE]
  node bin/php-response.mjs assess FILE [--format html|json|csv] [--out FILE]
      [--client NAME] [--fail-on-open]

The default format is JSON. FILE must be a version-1 fleet JSON file.
Assessed JSON can be imported again: assessments are recalculated from evidence.
--client includes only the exact named client's assets in every output format.
--fail-on-open exits 2 when the selected inventory has unresolved assets or is empty.
All assessment is offline. No server changes or network scans are performed.

Exit codes: 0 = command completed, 1 = invalid input/I/O/usage, 2 = open work remains.
`;

function parseArguments(args) {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) return { help: true };
  const command = args.shift();
  if (!['assess', 'demo'].includes(command)) throw new Error(`Unknown command: ${command}. Use --help.`);
  const result = { command, format: 'json', failOnOpen: false };
  if (command === 'assess') {
    if (!args[0] || args[0].startsWith('--')) throw new Error('assess requires an input JSON file.');
    result.input = args.shift();
  }
  const seen = new Set();
  while (args.length) {
    const flag = args.shift();
    if (seen.has(flag)) throw new Error(`Duplicate option: ${flag}.`);
    seen.add(flag);
    if (flag === '--fail-on-open') { result.failOnOpen = true; continue; }
    const keys = { '--format': 'format', '--out': 'out', '--client': 'client' };
    if (!Object.hasOwn(keys, flag)) throw new Error(`Unknown option: ${flag}.`);
    if (!args[0] || args[0].startsWith('--')) throw new Error(`${flag} requires a value.`);
    result[keys[flag]] = args.shift();
  }
  if (!['html', 'json', 'csv'].includes(result.format)) throw new Error('--format must be html, json, or csv.');
  if (result.input && result.out && path.resolve(result.input) === path.resolve(result.out)) throw new Error('Output must not overwrite the input inventory file.');
  return result;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) { process.stdout.write(HELP); return; }
  let fleet;
  if (options.command === 'demo') fleet = makeDemoFleet();
  else {
    const info = await stat(options.input);
    if (!info.isFile()) throw new Error('Input must be a regular file.');
    if (info.size > LIMITS.bytes) throw new Error('Input exceeds the 5 MiB import limit.');
    const raw = await readFile(options.input, 'utf8');
    if (Buffer.byteLength(raw, 'utf8') > LIMITS.bytes) throw new Error('Input exceeds the 5 MiB import limit.');
    try { fleet = normalizeFleet(JSON.parse(raw)); } catch (error) { throw new Error(`Invalid fleet: ${error.message}`); }
  }
  if (options.client !== undefined) {
    fleet = { ...fleet, assets: fleet.assets.filter((asset) => asset.client === options.client) };
    if (!fleet.assets.length) throw new Error(`No assets match client: ${options.client}.`);
  }
  const report = assessFleet(fleet);
  const content = options.format === 'html' ? renderReport(report, { client: options.client }) : options.format === 'csv' ? fleetToCsv(report) : JSON.stringify(report, null, 2) + '\n';
  if (options.out) {
    await mkdir(path.dirname(path.resolve(options.out)), { recursive: true });
    await writeFile(options.out, content, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    process.stderr.write(`Wrote ${options.format.toUpperCase()} report: ${options.out}\n`);
  } else process.stdout.write(content);
  if (options.failOnOpen && (!report.assets.length || report.summary.actionRequired + report.summary.verificationNeeded > 0)) process.exitCode = 2;
}

main().catch((error) => { process.stderr.write(`PHP Response Desk: ${error.message}\n`); process.exitCode = 1; });
