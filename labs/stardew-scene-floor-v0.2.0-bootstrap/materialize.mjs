#!/usr/bin/env node
// The bootstrap is intentionally outside the content-addressed payload it verifies.
import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const bootstrapRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(bootstrapRoot, '..', '..');
const carrierRoot = path.join(bootstrapRoot, 'carrier');
const checksumPath = path.join(carrierRoot, 'source.tar.gz.sha256');

const checksumText = await fsp.readFile(checksumPath, 'utf8');
const checksumMatch = /^([a-f0-9]{64})  source\.tar\.gz\s*$/.exec(checksumText);
if (!checksumMatch) throw new Error('Malformed Stardew scene carrier checksum.');
const expectedArchiveSha256 = checksumMatch[1];
const partNames = (await fsp.readdir(carrierRoot))
  .filter((name) => /^source\.tar\.gz\.b64\.part\d+$/.test(name))
  .sort((a, b) => a.localeCompare(b, 'en-US'));
if (partNames.length === 0) throw new Error('No Stardew scene carrier parts were found.');
const encoded = (await Promise.all(partNames.map((name) => fsp.readFile(path.join(carrierRoot, name), 'utf8'))))
  .join('')
  .replace(/\s+/g, '');
const archive = Buffer.from(encoded, 'base64');
const actualArchiveSha256 = crypto.createHash('sha256').update(archive).digest('hex');
if (actualArchiveSha256 !== expectedArchiveSha256) {
  throw new Error(`Stardew scene carrier SHA-256 mismatch: ${actualArchiveSha256}`);
}

const temporaryRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'stardew-scene-materialize-'));
const archivePath = path.join(temporaryRoot, 'source.tar.gz');
const extractedRoot = path.join(temporaryRoot, 'extracted');
await fsp.mkdir(extractedRoot, { recursive: true });
await fsp.writeFile(archivePath, archive, { flag: 'wx' });

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed: ${result.stderr || result.stdout || result.status}`);
  }
  return result.stdout;
}

try {
  const listing = run('tar', ['-tzf', archivePath]);
  for (const rawEntry of listing.split(/\r?\n/)) {
    if (!rawEntry) continue;
    const entry = rawEntry.replace(/^\.\//, '').replace(/\/$/, '');
    if (!entry) continue;
    if (
      path.posix.isAbsolute(entry) ||
      /^[A-Za-z]:[\\/]/.test(entry) ||
      entry === '..' ||
      entry.startsWith('../') ||
      entry.includes('/../') ||
      entry.includes('\\')
    ) {
      throw new Error(`Unsafe archive member: ${rawEntry}`);
    }
  }

  run('tar', ['-xzf', archivePath, '-C', extractedRoot]);

  const stagedPackage = path.join(extractedRoot, 'labs', 'stardew-scene-floor-v0.2.0');
  run(process.execPath, [path.join(stagedPackage, 'scripts', 'verify-source.mjs')], { cwd: stagedPackage });

  const queue = [extractedRoot];
  let copied = 0;
  let identical = 0;
  while (queue.length > 0) {
    const current = queue.shift();
    const entries = await fsp.readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en-US'));
    for (const entry of entries) {
      const source = path.join(current, entry.name);
      const relative = path.relative(extractedRoot, source);
      const destination = path.join(repositoryRoot, relative);
      if (entry.isSymbolicLink()) throw new Error(`Carrier contains a symbolic link: ${relative}`);
      if (entry.isDirectory()) {
        await fsp.mkdir(destination, { recursive: true });
        queue.push(source);
        continue;
      }
      if (!entry.isFile()) throw new Error(`Carrier contains a non-regular entry: ${relative}`);
      const sourceBytes = await fsp.readFile(source);
      let destinationBytes = null;
      try {
        destinationBytes = await fsp.readFile(destination);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      if (destinationBytes !== null) {
        if (!sourceBytes.equals(destinationBytes)) {
          throw new Error(`Refusing to overwrite divergent reviewable source: ${relative}`);
        }
        identical += 1;
        continue;
      }
      await fsp.mkdir(path.dirname(destination), { recursive: true });
      await fsp.writeFile(destination, sourceBytes, { flag: 'wx' });
      copied += 1;
    }
  }

  process.stdout.write(`${JSON.stringify({
    format: 'rodoh-stardew-scene-materialization/1',
    archiveSha256: actualArchiveSha256,
    partCount: partNames.length,
    copiedFiles: copied,
    identicalFiles: identical,
    sourceLedgerVerified: true,
    status: 'passed',
  }, null, 2)}\n`);
} finally {
  await fsp.rm(temporaryRoot, { recursive: true, force: true });
}
