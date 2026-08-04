#!/usr/bin/env node
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ignored = new Set(['node_modules', 'build', '.git']);
const files = [];
const queue = [root];
let symlinks = 0;
while (queue.length > 0) {
  const current = queue.shift();
  const entries = await fsp.readdir(current, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name, 'en-US'));
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const absolute = path.join(current, entry.name);
    if (entry.isSymbolicLink()) {
      symlinks += 1;
      continue;
    }
    if (entry.isDirectory()) queue.push(absolute);
    else if (entry.isFile()) files.push(absolute);
  }
}
if (symlinks > 0) throw new Error(`Source tree contains ${symlinks} symbolic links.`);
const javascript = files.filter((file) => file.endsWith('.mjs'));
for (const file of javascript) {
  const result = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`JavaScript syntax check failed for ${path.relative(root, file)}:\n${result.stderr || result.stdout}`);
}
const jsonFiles = files.filter((file) => file.endsWith('.json'));
for (const file of jsonFiles) {
  try { JSON.parse(await fsp.readFile(file, 'utf8')); }
  catch (error) { throw new Error(`JSON parse failed for ${path.relative(root, file)}: ${error.message}`); }
}
const providerApi = await fsp.readFile(path.join(root, 'smapi', 'MotionDeck.CabinetRuntimeProvider', 'RuntimeApi.cs'), 'utf8');
const adapterApi = await fsp.readFile(path.join(root, 'smapi', 'Rodoh.StardewCabinetAdapter.v0.2', 'RuntimeApi.cs'), 'utf8');
if (!providerApi.includes('public string Invoke(string requestJson)') || !adapterApi.includes('string Invoke(string requestJson)')) throw new Error('SMAPI JSON boundary is missing.');
if (/CabinetArmRequest|CabinetRuntimeState|CabinetProbe/.test(providerApi + adapterApi)) throw new Error('Provider-owned record types leaked across the SMAPI API boundary.');
const cmake = await fsp.readFile(path.join(root, 'native', 'CMakeLists.txt'), 'utf8');
if (!cmake.includes('57af7fc61f9f2d492580cb28aab6d0ea59d8d417')) throw new Error('OpenXR SDK source is not pinned to the qualified commit.');
process.stdout.write(`${JSON.stringify({
  format: 'motiondeck-cabinet-source-check/1',
  status: 'passed',
  files: files.length,
  javascript: javascript.length,
  json: jsonFiles.length,
  symlinks,
  smapiBoundary: 'versioned-json-string',
  openxrSdkCommit: '57af7fc61f9f2d492580cb28aab6d0ea59d8d417',
  productAuthority: 'none',
}, null, 2)}\n`);
