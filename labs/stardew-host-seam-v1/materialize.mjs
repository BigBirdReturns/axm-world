#!/usr/bin/env node
import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const carrierDir = path.join(root, 'carrier');
const expectedArchiveSha256 = '962f78cc3e07b3c96946b94dfc091fa91343775d7b80ec324e9c10cf3713a157';
const partNames = (await fsp.readdir(carrierDir))
  .filter((name) => /^source\.tar\.gz\.b64\.part\d+$/.test(name))
  .sort((a, b) => a.localeCompare(b, 'en-US'));

if (partNames.length === 0) throw new Error('No Stardew host-seam source carrier parts were found.');
const encoded = (await Promise.all(partNames.map((name) => fsp.readFile(path.join(carrierDir, name), 'utf8'))))
  .join('')
  .replace(/\s+/g, '');
const archive = Buffer.from(encoded, 'base64');
const actualArchiveSha256 = crypto.createHash('sha256').update(archive).digest('hex');
if (actualArchiveSha256 !== expectedArchiveSha256) {
  throw new Error(`Source carrier SHA-256 mismatch: ${actualArchiveSha256}`);
}

const temporary = path.join(root, `.stardew-source-${process.pid}.tar.gz`);
await fsp.writeFile(temporary, archive, { flag: 'wx' });
try {
  const result = spawnSync('tar', ['-xzf', temporary, '--strip-components=1', '-C', root], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`tar extraction failed: ${result.stderr || result.stdout || result.status}`);
  }
} finally {
  await fsp.rm(temporary, { force: true });
}

const ledgerPath = path.join(root, 'SOURCE_SHA256SUMS');
const ledger = await fsp.readFile(ledgerPath, 'utf8');
for (const line of ledger.split(/\r?\n/)) {
  if (!line.trim()) continue;
  const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
  if (!match) throw new Error(`Malformed source-ledger row: ${line}`);
  const [, expected, relative] = match;
  const candidate = path.resolve(root, relative);
  if (candidate !== root && !candidate.startsWith(root + path.sep)) {
    throw new Error(`Source-ledger path escape: ${relative}`);
  }
  const bytes = await fsp.readFile(candidate);
  const actual = crypto.createHash('sha256').update(bytes).digest('hex');
  if (actual !== expected) throw new Error(`Source-ledger mismatch: ${relative}`);
}

process.stdout.write(`${JSON.stringify({
  format: 'rodoh-stardew-source-materialization/1',
  archiveSha256: actualArchiveSha256,
  partCount: partNames.length,
  sourceLedgerVerified: true,
}, null, 2)}\n`);
