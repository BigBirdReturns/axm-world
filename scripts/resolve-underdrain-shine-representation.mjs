#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';

const ROLE_OUTPUTS = new Map([
  ['player:rhea-venn', { assetId: 'underdrain:rhea-venn-player', fileName: 'rhea-venn.png', pixelsPerUnit: 256, displayScale: 1.0, pivotX: 0.5, pivotY: 0.08 }],
  ['enemy:skirmisher', { assetId: 'underdrain:capling-skirmisher', fileName: 'capling-skirmisher.png', pixelsPerUnit: 256, displayScale: 0.8, pivotX: 0.5, pivotY: 0.08 }],
  ['enemy:duelist', { assetId: 'underdrain:crown-duelist', fileName: 'crown-duelist.png', pixelsPerUnit: 256, displayScale: 0.95, pivotX: 0.5, pivotY: 0.08 }],
  ['enemy:swarm', { assetId: 'underdrain:signal-spore-swarm', fileName: 'signal-spore-swarm.png', pixelsPerUnit: 256, displayScale: 0.7, pivotX: 0.5, pivotY: 0.12 }],
  ['enemy:hexer', { assetId: 'underdrain:discharge-hexer', fileName: 'discharge-hexer.png', pixelsPerUnit: 256, displayScale: 0.95, pivotX: 0.5, pivotY: 0.08 }],
  ['enemy:breaker', { assetId: 'underdrain:root-breaker', fileName: 'root-breaker.png', pixelsPerUnit: 256, displayScale: 1.35, pivotX: 0.5, pivotY: 0.06 }],
  ['arena:pump-seven', { assetId: 'underdrain:pump-seven-arena', fileName: 'pump-seven-arena.png', pixelsPerUnit: 128, displayScale: 1.0, pivotX: 0.5, pivotY: 0.5 }],
]);

function parseArgs(argv) {
  const values = new Map();
  for (let index = 2; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!name?.startsWith('--') || !value) throw new Error('Usage: resolve-underdrain-shine-representation.mjs --extraction <shine-extraction.json> --role-map <role-map.json> --output <directory>');
    values.set(name, value);
  }
  for (const required of ['--extraction', '--role-map', '--output']) if (!values.has(required)) throw new Error(`Missing ${required}.`);
  return {
    extraction: resolve(values.get('--extraction')),
    roleMap: resolve(values.get('--role-map')),
    output: resolve(values.get('--output')),
  };
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function main() {
  const options = parseArgs(process.argv);
  const extractionBytes = await readFile(options.extraction);
  const extraction = JSON.parse(extractionBytes.toString('utf8'));
  if (extraction.format !== 'rodoh-underdrain-shine-extraction/1' || extraction.status !== 'pass') throw new Error('Shine extraction receipt is unsupported or not passing.');
  const roleMap = JSON.parse(await readFile(options.roleMap, 'utf8'));
  if (roleMap.format !== 'rodoh-underdrain-shine-role-map/1') throw new Error('Shine role-map format is unsupported.');
  const map = new Map();
  const sourceKeys = new Set();
  for (const entry of roleMap.roles ?? []) {
    if (!ROLE_OUTPUTS.has(entry?.role)) throw new Error(`Role map contains unknown role ${entry?.role}.`);
    if (map.has(entry.role)) throw new Error(`Role map repeats ${entry.role}.`);
    if (typeof entry.sourceKey !== 'string' || entry.sourceKey.startsWith('<')) throw new Error(`Role ${entry.role} has not received a concrete Shine source key.`);
    if (!sourceKeys.add(entry.sourceKey)) throw new Error(`Distinct production roles may not share Shine source key ${entry.sourceKey}.`);
    map.set(entry.role, entry.sourceKey);
  }
  if (map.size !== ROLE_OUTPUTS.size || [...ROLE_OUTPUTS.keys()].some((role) => !map.has(role))) throw new Error('Role map does not cover the exact seven-role production floor.');

  const assetsByKey = new Map((extraction.assets ?? []).map((asset) => [asset.key, asset]));
  await mkdir(options.output, { recursive: true });
  const assets = [];
  for (const [role, output] of ROLE_OUTPUTS) {
    const key = map.get(role);
    const asset = assetsByKey.get(key);
    if (!asset) throw new Error(`Role ${role} cites absent extracted key ${key}.`);
    const extractionRoot = dirname(options.extraction);
    const sourcePng = resolve(extractionRoot, asset.pngFile);
    const sourceBytes = await readFile(sourcePng);
    if (sha256(sourceBytes) !== asset.pngSha256) throw new Error(`Extracted PNG digest is stale for ${key}.`);
    const target = join(options.output, output.fileName);
    await copyFile(sourcePng, target);
    assets.push({
      assetId: output.assetId,
      role,
      sourceKey: key,
      fileName: output.fileName,
      sha256: sha256(sourceBytes),
      pixelsPerUnit: output.pixelsPerUnit,
      displayScale: output.displayScale,
      pivotX: output.pivotX,
      pivotY: output.pivotY,
    });
  }

  const manifest = {
    format: 'rodoh-underdrain-resolved-representation-source/1',
    productId: 'underdrain-bloom-below-unity6000-v1',
    themeId: 'underdrain-bloom-below',
    unityVersion: '6000.0.66f2',
    extractionReceipt: relative(options.output, options.extraction).replaceAll('\\', '/'),
    extractionReceiptSha256: sha256(extractionBytes),
    roleMap: options.roleMap,
    roleMapSha256: sha256(await readFile(options.roleMap)),
    assets,
    templateOnly: false,
    reviewRequired: true,
    approvalIssued: false,
    productAcceptance: 'not-issued',
    authority: 'resolved project-owned sprite-source custody only',
  };
  const manifestPath = join(options.output, 'resolved-representation-source.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const ledger = [];
  for (const fileName of [...assets.map((asset) => asset.fileName), basename(manifestPath)].sort()) {
    const path = join(options.output, fileName);
    ledger.push(`${sha256(await readFile(path))}  ${fileName}`);
  }
  await writeFile(join(options.output, 'SHA256SUMS'), `${ledger.join('\n')}\n`, 'ascii');
  process.stdout.write(`${JSON.stringify({ status: 'pass', manifest: manifestPath, assetCount: assets.length })}\n`);
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
