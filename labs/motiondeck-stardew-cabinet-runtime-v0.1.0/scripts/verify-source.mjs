#!/usr/bin/env node
import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ledgerPath = path.join(root, 'SOURCE_SHA256SUMS');
const text = await fsp.readFile(ledgerPath, 'utf8');
const seen = new Set();
let count = 0;
for (const line of text.split(/\r?\n/)) {
  if (!line.trim()) continue;
  const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
  if (!match) throw new Error(`Malformed source-ledger row: ${line}`);
  const [, expected, relative] = match;
  if (relative === 'SOURCE_SHA256SUMS') throw new Error('Source ledger must not self-reference.');
  if (seen.has(relative)) throw new Error(`Duplicate source-ledger path: ${relative}`);
  seen.add(relative);
  const absolute = path.resolve(root, relative);
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) throw new Error(`Source-ledger path escape: ${relative}`);
  const stat = await fsp.lstat(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Source-ledger path is not a regular file: ${relative}`);
  const bytes = await fsp.readFile(absolute);
  const actual = crypto.createHash('sha256').update(bytes).digest('hex');
  if (actual !== expected) throw new Error(`Source-ledger mismatch: ${relative}`);
  count += 1;
}
const ledgerSha256 = crypto.createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
process.stdout.write(`${JSON.stringify({
  format: 'motiondeck-cabinet-source-ledger/1',
  status: 'passed',
  files: count,
  ledgerSha256,
  productAuthority: 'none',
}, null, 2)}\n`);
