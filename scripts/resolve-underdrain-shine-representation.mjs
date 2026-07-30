#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';

const PRODUCT_ID = 'underdrain-bloom-below-unity6000-v1';
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
  const switches = new Set();
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    if (token === '--replace') {
      switches.add(token);
      continue;
    }
    if (index + 1 >= argv.length || argv[index + 1].startsWith('--')) throw new Error(`Missing value for ${token}.`);
    values.set(token, argv[++index]);
  }
  for (const required of ['--extraction', '--role-map', '--output']) if (!values.has(required)) throw new Error(`Missing ${required}.`);
  return {
    extraction: resolve(values.get('--extraction')),
    roleMap: resolve(values.get('--role-map')),
    output: resolve(values.get('--output')),
    replace: switches.has('--replace'),
  };
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function isSha(value) {
  return /^[0-9a-f]{64}$/.test(String(value));
}

function requireWithinRoot(root, candidate, label) {
  const rel = relative(root, candidate);
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`${label} escapes its extraction root: ${candidate}.`);
}

async function prepareOutput(output, replace) {
  if (replace) await rm(output, { recursive: true, force: true });
  else {
    try {
      const existing = await stat(output);
      if (!existing.isDirectory()) throw new Error(`Output path exists and is not a directory: ${output}.`);
      if ((await readdir(output)).length > 0) throw new Error(`Output directory is not empty: ${output}. Use --replace for an explicit replacement.`);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  await mkdir(output, { recursive: true });
}

async function main() {
  const options = parseArgs(process.argv);
  const extractionBytes = await readFile(options.extraction);
  const extraction = JSON.parse(extractionBytes.toString('utf8'));
  if (extraction.format !== 'rodoh-underdrain-shine-extraction/1' || extraction.status !== 'pass') throw new Error('Shine extraction receipt is unsupported or not passing.');
  if (extraction.assetObject !== 'ASSET_DATA' || extraction.unityInvoked !== false || extraction.approvalIssued !== false || extraction.productAcceptance !== 'not-issued') throw new Error('Shine extraction receipt crossed its source-only authority boundary.');
  if (!isSha(extraction.sourceSha256) || extraction.expectedSourceSha256 !== extraction.sourceSha256) throw new Error('Shine extraction receipt is not bound to an exact expected standalone SHA-256.');

  const roleMapBytes = await readFile(options.roleMap);
  const roleMap = JSON.parse(roleMapBytes.toString('utf8'));
  if (roleMap.format !== 'rodoh-underdrain-shine-role-map/1') throw new Error('Shine role-map format is unsupported.');
  if (roleMap.productId !== PRODUCT_ID) throw new Error(`Shine role map is bound to ${roleMap.productId}, expected ${PRODUCT_ID}.`);

  const map = new Map();
  const sourceKeys = new Set();
  for (const entry of roleMap.roles ?? []) {
    if (!ROLE_OUTPUTS.has(entry?.role)) throw new Error(`Role map contains unknown role ${entry?.role}.`);
    if (map.has(entry.role)) throw new Error(`Role map repeats ${entry.role}.`);
    if (typeof entry.sourceKey !== 'string' || entry.sourceKey.startsWith('<')) throw new Error(`Role ${entry.role} has not received a concrete Shine source key.`);
    if (sourceKeys.has(entry.sourceKey)) throw new Error(`Distinct production roles may not share Shine source key ${entry.sourceKey}.`);
    sourceKeys.add(entry.sourceKey);
    map.set(entry.role, entry.sourceKey);
  }
  if (map.size !== ROLE_OUTPUTS.size || [...ROLE_OUTPUTS.keys()].some((role) => !map.has(role))) throw new Error('Role map does not cover the exact seven-role production floor.');

  const assetsByKey = new Map();
  for (const asset of extraction.assets ?? []) {
    if (!asset || typeof asset.key !== 'string' || typeof asset.pngFile !== 'string' || !isSha(asset.pngSha256)) throw new Error('Shine extraction contains an incomplete PNG record.');
    if (assetsByKey.has(asset.key)) throw new Error(`Shine extraction repeats asset key ${asset.key}.`);
    assetsByKey.set(asset.key, asset);
  }

  await prepareOutput(options.output, options.replace);
  const extractionRoot = dirname(options.extraction);
  const preparedDigests = new Set();
  const assets = [];
  for (const [role, output] of ROLE_OUTPUTS) {
    const key = map.get(role);
    const asset = assetsByKey.get(key);
    if (!asset) throw new Error(`Role ${role} cites absent extracted key ${key}.`);
    const sourcePng = resolve(extractionRoot, asset.pngFile);
    requireWithinRoot(extractionRoot, sourcePng, `Extracted PNG for ${key}`);
    const sourceBytes = await readFile(sourcePng);
    const digest = sha256(sourceBytes);
    if (digest !== asset.pngSha256) throw new Error(`Extracted PNG digest is stale for ${key}.`);
    if (preparedDigests.has(digest)) throw new Error(`Distinct production roles may not share prepared PNG bytes; duplicate digest ${digest}.`);
    preparedDigests.add(digest);
    const target = join(options.output, output.fileName);
    await copyFile(sourcePng, target);
    assets.push({
      assetId: output.assetId,
      role,
      sourceKey: key,
      fileName: output.fileName,
      sha256: digest,
      pixelsPerUnit: output.pixelsPerUnit,
      displayScale: output.displayScale,
      pivotX: output.pivotX,
      pivotY: output.pivotY,
    });
  }

  const manifest = {
    format: 'rodoh-underdrain-resolved-representation-source/1',
    productId: PRODUCT_ID,
    themeId: 'underdrain-bloom-below',
    unityVersion: '6000.0.66f2',
    sourceStandaloneFileName: extraction.sourceFileName,
    sourceStandaloneSha256: extraction.sourceSha256,
    sourceAssetObject: extraction.assetObject,
    extractionReceipt: relative(options.output, options.extraction).replaceAll('\\', '/'),
    extractionReceiptSha256: sha256(extractionBytes),
    roleMap: options.roleMap,
    roleMapSha256: sha256(roleMapBytes),
    assets,
    distinctPreparedProducts: true,
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
  process.stdout.write(`${JSON.stringify({ status: 'pass', manifest: manifestPath, assetCount: assets.length, distinctPreparedProducts: true })}\n`);
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
