#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';

const PRODUCT_ID = 'underdrain-bloom-below-unity6000-v1';
const THEME_ID = 'underdrain-bloom-below';
const UNITY_VERSION = '6000.0.66f2';
const SESSION_FORMAT = 'rodoh-underdrain-representation-authoring-session/1';
const SELECTION_FORMAT = 'rodoh-underdrain-representation-authoring-selection/1';
const RECEIPT_FORMAT = 'rodoh-underdrain-representation-authoring/1';
const SOURCE_FORMAT = 'rodoh-underdrain-resolved-representation-source/1';
const EXTRACTION_FORMAT = 'rodoh-underdrain-shine-extraction/1';
const MAX_BODY_BYTES = 96 * 1024 * 1024;
const MAX_PNG_BYTES = 32 * 1024 * 1024;
const MAX_DIMENSION = 4096;

const ROLE_OUTPUTS = [
  {
    role: 'player:rhea-venn',
    assetId: 'underdrain:rhea-venn-player',
    fileName: 'rhea-venn.png',
    title: 'Rhea Venn',
    guidance: 'Worker-plumber silhouette. Keep hands, wrench, boots, and face readable at play distance.',
    pixelsPerUnit: 256,
    displayScale: 1.0,
    pivotX: 0.5,
    pivotY: 0.08,
    backgroundMode: 'edge',
  },
  {
    role: 'enemy:skirmisher',
    assetId: 'underdrain:capling-skirmisher',
    fileName: 'capling-skirmisher.png',
    title: 'Capling Skirmisher',
    guidance: 'Fast, low, lateral threat. Preserve a compact silhouette distinct from the duelist.',
    pixelsPerUnit: 256,
    displayScale: 0.8,
    pivotX: 0.5,
    pivotY: 0.08,
    backgroundMode: 'edge',
  },
  {
    role: 'enemy:duelist',
    assetId: 'underdrain:crown-duelist',
    fileName: 'crown-duelist.png',
    title: 'Crown Duelist',
    guidance: 'Upright weapon silhouette with clear anticipation and parry read.',
    pixelsPerUnit: 256,
    displayScale: 0.95,
    pivotX: 0.5,
    pivotY: 0.08,
    backgroundMode: 'edge',
  },
  {
    role: 'enemy:swarm',
    assetId: 'underdrain:signal-spore-swarm',
    fileName: 'signal-spore-swarm.png',
    title: 'Signal-Spore Swarm',
    guidance: 'Distributed unstable cluster, not another single frog-shaped body.',
    pixelsPerUnit: 256,
    displayScale: 0.7,
    pivotX: 0.5,
    pivotY: 0.12,
    backgroundMode: 'edge',
  },
  {
    role: 'enemy:hexer',
    assetId: 'underdrain:discharge-hexer',
    fileName: 'discharge-hexer.png',
    title: 'Discharge Hexer',
    guidance: 'Ranged casting silhouette with readable hands, spores, or discharge apparatus.',
    pixelsPerUnit: 256,
    displayScale: 0.95,
    pivotX: 0.5,
    pivotY: 0.08,
    backgroundMode: 'edge',
  },
  {
    role: 'enemy:breaker',
    assetId: 'underdrain:root-breaker',
    fileName: 'root-breaker.png',
    title: 'Root Breaker',
    guidance: 'Large vertical-impact silhouette. Preserve mass and ground contact.',
    pixelsPerUnit: 256,
    displayScale: 1.35,
    pivotX: 0.5,
    pivotY: 0.06,
    backgroundMode: 'edge',
  },
  {
    role: 'arena:pump-seven',
    assetId: 'underdrain:pump-seven-arena',
    fileName: 'pump-seven-arena.png',
    title: 'Pump Seven Arena',
    guidance: 'Coherent sewer mechanism space. Keep valves, purge wheel, sluice, and Root Gate context.',
    pixelsPerUnit: 128,
    displayScale: 1.0,
    pivotX: 0.5,
    pivotY: 0.5,
    backgroundMode: 'none',
  },
];
const ROLE_BY_ID = new Map(ROLE_OUTPUTS.map((entry) => [entry.role, entry]));

function parseArgs(argv) {
  const values = new Map();
  const switches = new Set();
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    if (token === '--replace' || token === '--no-open') {
      switches.add(token);
      continue;
    }
    if (index + 1 >= argv.length || argv[index + 1].startsWith('--')) throw new Error(`Missing value for ${token}.`);
    values.set(token, argv[++index]);
  }
  for (const required of ['--extraction', '--output']) if (!values.has(required)) throw new Error(`Missing ${required}.`);
  const port = values.has('--port') ? Number(values.get('--port')) : 0;
  const timeoutMinutes = values.has('--timeout-minutes') ? Number(values.get('--timeout-minutes')) : 180;
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Port must be an integer from 0 through 65535.');
  if (!Number.isFinite(timeoutMinutes) || timeoutMinutes <= 0 || timeoutMinutes > 1440) throw new Error('Timeout must be greater than zero and no more than 1440 minutes.');
  return {
    extraction: resolve(values.get('--extraction')),
    output: resolve(values.get('--output')),
    selection: values.has('--selection') ? resolve(values.get('--selection')) : null,
    operatorId: values.get('--operator-id') ?? null,
    host: values.get('--host') ?? '127.0.0.1',
    port,
    timeoutMinutes,
    replace: switches.has('--replace'),
    noOpen: switches.has('--no-open'),
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

function pngDimensions(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error('Prepared role output is not a PNG file.');
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width < 1 || height < 1 || width > MAX_DIMENSION || height > MAX_DIMENSION) throw new Error(`Prepared role PNG dimensions are outside the 1-${MAX_DIMENSION} bound: ${width}x${height}.`);
  return { width, height };
}

async function pathState(path) {
  try {
    return await stat(path);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function ensureOutputAvailable(output, replace) {
  const existing = await pathState(output);
  if (existing === null) return;
  if (!existing.isDirectory()) throw new Error(`Output path exists and is not a directory: ${output}.`);
  if ((await readdir(output)).length === 0) return;
  if (!replace) throw new Error(`Output directory is not empty: ${output}. Use --replace for an explicit replacement.`);
}

async function loadExtraction(path) {
  const bytes = await readFile(path);
  const value = JSON.parse(bytes.toString('utf8'));
  if (value.format !== EXTRACTION_FORMAT || value.status !== 'pass') throw new Error('Shine extraction receipt is unsupported or not passing.');
  if (value.assetObject !== 'ASSET_DATA' || value.unityInvoked !== false || value.approvalIssued !== false || value.productAcceptance !== 'not-issued') {
    throw new Error('Shine extraction receipt crossed its source-only authority boundary.');
  }
  if (!isSha(value.sourceSha256) || value.expectedSourceSha256 !== value.sourceSha256) throw new Error('Shine extraction receipt is not bound to its exact expected standalone SHA-256.');
  const root = dirname(path);
  const assets = [];
  const byKey = new Map();
  for (const entry of value.assets ?? []) {
    if (!entry || typeof entry.key !== 'string' || typeof entry.pngFile !== 'string' || !isSha(entry.pngSha256)) throw new Error('Shine extraction contains an incomplete PNG record.');
    if (byKey.has(entry.key)) throw new Error(`Shine extraction repeats asset key ${entry.key}.`);
    const file = resolve(root, entry.pngFile);
    requireWithinRoot(root, file, `Extracted PNG for ${entry.key}`);
    const png = await readFile(file);
    const digest = sha256(png);
    if (digest !== entry.pngSha256) throw new Error(`Extracted PNG digest is stale for ${entry.key}.`);
    const dimensions = pngDimensions(png);
    if (Number(entry.width) !== dimensions.width || Number(entry.height) !== dimensions.height) throw new Error(`Extracted PNG dimensions are stale for ${entry.key}.`);
    const asset = {
      key: entry.key,
      width: dimensions.width,
      height: dimensions.height,
      pngFile: entry.pngFile.replaceAll('\\', '/'),
      pngSha256: digest,
      absolutePath: file,
    };
    byKey.set(asset.key, asset);
    assets.push(asset);
  }
  if (assets.length === 0) throw new Error('Shine extraction contains no prepared PNG inventory.');
  assets.sort((left, right) => left.key.localeCompare(right.key, 'en'));
  return { bytes, receipt: value, root, assets, byKey };
}

function finiteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} must be finite.`);
  return number;
}

function normalizeCrop(value, source, role) {
  if (!value || typeof value !== 'object') throw new Error(`Role ${role} lacks a crop recipe.`);
  const x = finiteNumber(value.x, `${role} crop x`);
  const y = finiteNumber(value.y, `${role} crop y`);
  const width = finiteNumber(value.width, `${role} crop width`);
  const height = finiteNumber(value.height, `${role} crop height`);
  if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > source.width + 0.001 || y + height > source.height + 0.001) {
    throw new Error(`Role ${role} crop escapes source ${source.key}: ${x},${y},${width},${height} of ${source.width}x${source.height}.`);
  }
  return { x, y, width, height, sourceWidth: source.width, sourceHeight: source.height };
}

function normalizeBackground(value, role) {
  const mode = value?.mode ?? 'none';
  if (mode !== 'none' && mode !== 'edge') throw new Error(`Role ${role} has unsupported background mode ${mode}.`);
  const tolerance = Math.round(finiteNumber(value?.tolerance ?? 48, `${role} background tolerance`));
  const feather = Math.round(finiteNumber(value?.feather ?? 18, `${role} background feather`));
  const trim = value?.trim !== false;
  if (tolerance < 0 || tolerance > 255 || feather < 0 || feather > 128) throw new Error(`Role ${role} background settings are outside the supported bound.`);
  return { mode, tolerance, feather, trim };
}

function decodeOutput(value, role) {
  if (!value || typeof value.pngBase64 !== 'string') throw new Error(`Role ${role} lacks prepared PNG bytes.`);
  const compact = value.pngBase64.replace(/^data:image\/png;base64,/, '').replace(/\s+/g, '');
  const bytes = Buffer.from(compact, 'base64');
  if (bytes.length === 0 || bytes.length > MAX_PNG_BYTES) throw new Error(`Role ${role} prepared PNG byte count is outside the supported bound.`);
  const dimensions = pngDimensions(bytes);
  if (value.width !== undefined && Number(value.width) !== dimensions.width) throw new Error(`Role ${role} client width differs from PNG IHDR width.`);
  if (value.height !== undefined && Number(value.height) !== dimensions.height) throw new Error(`Role ${role} client height differs from PNG IHDR height.`);
  const transparentPixelFraction = value.transparentPixelFraction === undefined ? null : finiteNumber(value.transparentPixelFraction, `${role} transparency fraction`);
  if (transparentPixelFraction !== null && (transparentPixelFraction < 0 || transparentPixelFraction > 1)) throw new Error(`Role ${role} transparency fraction is outside 0-1.`);
  return { bytes, width: dimensions.width, height: dimensions.height, transparentPixelFraction };
}

function normalizeOperatorId(value) {
  if (value === null || value === undefined || String(value).trim() === '') return 'local-representation-operator';
  const text = String(value).trim();
  if (text.length > 128 || /[\r\n\0]/.test(text)) throw new Error('Operator id is malformed.');
  return text;
}

function normalizeSelection(value, extraction, operatorOverride = null) {
  if (!value || value.format !== SELECTION_FORMAT) throw new Error(`Representation authoring selection must use ${SELECTION_FORMAT}.`);
  const operatorId = normalizeOperatorId(operatorOverride ?? value.operatorId);
  const seenRoles = new Set();
  const outputDigests = new Set();
  const roles = [];
  for (const selection of value.roles ?? []) {
    if (!selection || !ROLE_BY_ID.has(selection.role)) throw new Error(`Selection contains unknown role ${selection?.role}.`);
    if (seenRoles.has(selection.role)) throw new Error(`Selection repeats role ${selection.role}.`);
    seenRoles.add(selection.role);
    const source = extraction.byKey.get(selection.sourceKey);
    if (!source) throw new Error(`Role ${selection.role} cites absent Shine source key ${selection.sourceKey}.`);
    const crop = normalizeCrop(selection.crop, source, selection.role);
    const background = normalizeBackground(selection.background, selection.role);
    const output = decodeOutput(selection.output, selection.role);
    const digest = sha256(output.bytes);
    if (outputDigests.has(digest)) throw new Error(`Distinct production roles may not share prepared PNG bytes; duplicate digest ${digest}.`);
    outputDigests.add(digest);
    roles.push({
      role: selection.role,
      sourceKey: source.key,
      sourcePngSha256: source.pngSha256,
      crop,
      background,
      output,
      outputSha256: digest,
    });
  }
  if (seenRoles.size !== ROLE_OUTPUTS.length || ROLE_OUTPUTS.some((role) => !seenRoles.has(role.role))) throw new Error('Selection does not cover the exact seven-role production floor.');
  roles.sort((left, right) => ROLE_OUTPUTS.findIndex((entry) => entry.role === left.role) - ROLE_OUTPUTS.findIndex((entry) => entry.role === right.role));
  return { operatorId, roles };
}

async function writeAuthoredRepresentation(options, extraction, rawSelection) {
  await ensureOutputAvailable(options.output, options.replace);
  const normalized = normalizeSelection(rawSelection, extraction, options.operatorId);
  const temporary = `${options.output}.tmp-${process.pid}-${randomBytes(6).toString('hex')}`;
  await rm(temporary, { recursive: true, force: true });
  await mkdir(temporary, { recursive: true });
  try {
    const selectionRecord = {
      format: SELECTION_FORMAT,
      generatedAt: new Date().toISOString(),
      operatorId: normalized.operatorId,
      productId: PRODUCT_ID,
      sourceStandaloneFileName: extraction.receipt.sourceFileName,
      sourceStandaloneSha256: extraction.receipt.sourceSha256,
      extractionReceipt: relative(options.output, options.extraction).replaceAll('\\', '/'),
      extractionReceiptSha256: sha256(extraction.bytes),
      roles: normalized.roles.map((entry) => ({
        role: entry.role,
        sourceKey: entry.sourceKey,
        sourcePngSha256: entry.sourcePngSha256,
        crop: entry.crop,
        background: entry.background,
        outputFileName: ROLE_BY_ID.get(entry.role).fileName,
        outputSha256: entry.outputSha256,
        outputWidth: entry.output.width,
        outputHeight: entry.output.height,
        transparentPixelFraction: entry.output.transparentPixelFraction,
      })),
      roleSelectionReviewed: true,
      namedAssetReview: 'not-issued',
      approvalIssued: false,
      productAcceptance: 'not-issued',
      authority: 'local crop, cutout, and semantic-role preparation only',
    };
    const selectionPath = join(temporary, 'representation-authoring-selection.json');
    const selectionBytes = Buffer.from(`${JSON.stringify(selectionRecord, null, 2)}\n`, 'utf8');
    await writeFile(selectionPath, selectionBytes);

    const assets = [];
    for (const role of ROLE_OUTPUTS) {
      const authored = normalized.roles.find((entry) => entry.role === role.role);
      const target = join(temporary, role.fileName);
      await writeFile(target, authored.output.bytes);
      assets.push({
        assetId: role.assetId,
        role: role.role,
        sourceKey: authored.sourceKey,
        sourcePngSha256: authored.sourcePngSha256,
        authoringCrop: authored.crop,
        backgroundPreparation: authored.background,
        fileName: role.fileName,
        sha256: authored.outputSha256,
        width: authored.output.width,
        height: authored.output.height,
        transparentPixelFraction: authored.output.transparentPixelFraction,
        pixelsPerUnit: role.pixelsPerUnit,
        displayScale: role.displayScale,
        pivotX: role.pivotX,
        pivotY: role.pivotY,
      });
    }

    const manifest = {
      format: SOURCE_FORMAT,
      productId: PRODUCT_ID,
      themeId: THEME_ID,
      unityVersion: UNITY_VERSION,
      sourceStandaloneFileName: extraction.receipt.sourceFileName,
      sourceStandaloneSha256: extraction.receipt.sourceSha256,
      sourceAssetObject: extraction.receipt.assetObject,
      extractionReceipt: relative(options.output, options.extraction).replaceAll('\\', '/'),
      extractionReceiptSha256: sha256(extraction.bytes),
      authoringSelection: basename(selectionPath),
      authoringSelectionSha256: sha256(selectionBytes),
      assets,
      distinctPreparedProducts: true,
      templateOnly: false,
      reviewRequired: true,
      approvalIssued: false,
      productAcceptance: 'not-issued',
      authority: 'project-owned role-product preparation only; Unity import and named review remain open',
    };
    const manifestPath = join(temporary, 'resolved-representation-source.json');
    const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    await writeFile(manifestPath, manifestBytes);

    const receipt = {
      format: RECEIPT_FORMAT,
      generatedAt: new Date().toISOString(),
      status: 'pass',
      productId: PRODUCT_ID,
      themeId: THEME_ID,
      unityVersion: UNITY_VERSION,
      operatorId: normalized.operatorId,
      sourceStandaloneFileName: extraction.receipt.sourceFileName,
      sourceStandaloneSha256: extraction.receipt.sourceSha256,
      extractionReceipt: options.extraction,
      extractionReceiptSha256: sha256(extraction.bytes),
      authoringSelection: 'representation-authoring-selection.json',
      authoringSelectionSha256: sha256(selectionBytes),
      resolvedManifest: 'resolved-representation-source.json',
      resolvedManifestSha256: sha256(manifestBytes),
      preparedRoleCount: assets.length,
      distinctPreparedProductCount: new Set(assets.map((entry) => entry.sha256)).size,
      sourceKeyCount: new Set(assets.map((entry) => entry.sourceKey)).size,
      roles: assets.map((entry) => ({
        role: entry.role,
        sourceKey: entry.sourceKey,
        sourcePngSha256: entry.sourcePngSha256,
        outputFileName: entry.fileName,
        outputSha256: entry.sha256,
        outputWidth: entry.width,
        outputHeight: entry.height,
        transparentPixelFraction: entry.transparentPixelFraction,
        crop: entry.authoringCrop,
        background: entry.backgroundPreparation,
      })),
      unityInvoked: false,
      representationMaterialized: false,
      namedAssetReview: 'open-after-unity-materialization',
      approvalIssued: false,
      productAcceptance: 'not-issued',
      authority: 'local visual-role authoring only',
    };
    const receiptPath = join(temporary, 'representation-authoring-receipt.json');
    const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
    await writeFile(receiptPath, receiptBytes);

    const fileNames = [
      ...ROLE_OUTPUTS.map((entry) => entry.fileName),
      basename(selectionPath),
      basename(manifestPath),
      basename(receiptPath),
    ].sort((left, right) => left.localeCompare(right, 'en'));
    const ledger = [];
    for (const fileName of fileNames) ledger.push(`${sha256(await readFile(join(temporary, fileName)))}  ${fileName}`);
    await writeFile(join(temporary, 'SHA256SUMS'), `${ledger.join('\n')}\n`, 'ascii');

    if (options.replace) await rm(options.output, { recursive: true, force: true });
    else {
      const existing = await pathState(options.output);
      if (existing?.isDirectory() && (await readdir(options.output)).length === 0) await rm(options.output, { recursive: true, force: true });
    }
    await rename(temporary, options.output);
    const result = {
      format: SESSION_FORMAT,
      status: 'pass',
      output: options.output,
      manifest: join(options.output, 'resolved-representation-source.json'),
      receipt: join(options.output, 'representation-authoring-receipt.json'),
      preparedRoleCount: assets.length,
      distinctPreparedProducts: true,
      unityInvoked: false,
      approvalIssued: false,
      productAcceptance: 'not-issued',
    };
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result;
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

function htmlDocument() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>UNDERDRAIN Representation Authoring</title>
<style>
:root{color-scheme:dark;--bg:#0b1110;--panel:#121d1a;--line:#2a3d37;--ink:#edf7f1;--muted:#a8b9b1;--accent:#80e6a6;--warn:#f2c66d;--danger:#ff8d7f}
*{box-sizing:border-box}body{margin:0;font:14px/1.45 Inter,Segoe UI,system-ui,sans-serif;background:var(--bg);color:var(--ink)}button,select,input{font:inherit}.top{position:sticky;top:0;z-index:10;display:flex;gap:16px;align-items:center;padding:12px 18px;background:#0b1110ee;border-bottom:1px solid var(--line);backdrop-filter:blur(10px)}.top h1{font-size:17px;margin:0}.top .status{margin-left:auto;color:var(--muted)}.layout{display:grid;grid-template-columns:260px minmax(360px,1fr) minmax(430px,1.2fr);gap:12px;padding:12px;min-height:calc(100vh - 58px)}.panel{background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden}.panel h2{font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin:0;padding:12px;border-bottom:1px solid var(--line);color:var(--muted)}.roles{padding:8px}.role{display:block;width:100%;text-align:left;padding:10px;border:1px solid transparent;border-radius:9px;background:transparent;color:var(--ink);margin-bottom:6px;cursor:pointer}.role:hover{background:#182722}.role.active{border-color:var(--accent);background:#193127}.role strong{display:block}.role small{color:var(--muted)}.dot{float:right;width:9px;height:9px;border-radius:50%;margin-top:5px;background:#52655e}.role.ready .dot{background:var(--accent)}.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;padding:8px;max-height:calc(100vh - 112px);overflow:auto}.asset{border:1px solid var(--line);border-radius:9px;background:#0e1715;padding:7px;cursor:pointer;color:var(--ink);text-align:left}.asset:hover,.asset.selected{border-color:var(--accent)}.thumb{height:112px;display:grid;place-items:center;background:repeating-conic-gradient(#26332f 0 25%,#18221f 0 50%) 50%/18px 18px;border-radius:6px;overflow:hidden}.thumb img{max-width:100%;max-height:100%;object-fit:contain}.asset strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:6px;font-size:12px}.asset small{color:var(--muted);font-size:11px}.editor{padding:12px;display:grid;gap:10px}.guidance{padding:10px;border:1px solid var(--line);border-radius:8px;color:var(--muted)}.canvasWrap{position:relative;min-height:390px;background:#090f0d;border:1px solid var(--line);border-radius:9px;display:grid;place-items:center;overflow:hidden}.canvasWrap.checker{background:repeating-conic-gradient(#25332e 0 25%,#15201c 0 50%) 50%/24px 24px}.canvasWrap canvas{max-width:100%;max-height:68vh;touch-action:none;cursor:crosshair}.controls{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.controls label{display:grid;gap:4px;color:var(--muted);font-size:12px}.controls select,.controls input,.controls button,.actions button{width:100%;padding:8px;border-radius:7px;border:1px solid var(--line);background:#0d1714;color:var(--ink)}.controls button,.actions button{cursor:pointer}.controls button:hover,.actions button:hover{border-color:var(--accent)}.preview{display:grid;grid-template-columns:150px 1fr;gap:10px;align-items:center;padding:9px;border:1px solid var(--line);border-radius:9px}.previewBox{height:150px;display:grid;place-items:end center;background:linear-gradient(#182923,#0d1613);overflow:hidden}.previewBox img{max-width:96%;max-height:96%;object-fit:contain}.preview p{margin:0;color:var(--muted)}.actions{display:flex;gap:8px}.actions .primary{background:#1d5f39;border-color:#3d9d62;font-weight:700}.actions .danger{margin-left:auto;color:var(--danger)}.message{min-height:22px;color:var(--muted)}@media(max-width:1100px){.layout{grid-template-columns:220px 1fr}.editorPanel{grid-column:1/-1}.gallery{max-height:460px}}@media(max-width:720px){.layout{display:block}.panel{margin-bottom:10px}.controls{grid-template-columns:1fr 1fr}.gallery{max-height:none}.top{position:static}}
</style>
</head>
<body>
<div class="top"><h1>UNDERDRAIN 2.5D Representation Authoring</h1><span>Local-only crop, cutout, and semantic role preparation</span><span class="status" id="topStatus">Loading…</span></div>
<div class="layout">
<section class="panel"><h2>Seven required roles</h2><div class="roles" id="roles"></div></section>
<section class="panel"><h2>Project-owned Shine inventory</h2><div class="gallery" id="gallery"></div></section>
<section class="panel editorPanel"><h2>Active role editor</h2><div class="editor">
<div class="guidance"><strong id="roleTitle"></strong><div id="roleGuidance"></div></div>
<div class="canvasWrap checker" id="canvasWrap"><canvas id="editorCanvas" width="900" height="520"></canvas></div>
<div class="controls">
<label>Background<select id="backgroundMode"><option value="edge">Edge-connected cutout</option><option value="none">Keep crop background</option></select></label>
<label>Tolerance<input id="tolerance" type="range" min="0" max="255" value="48"></label>
<label>Feather<input id="feather" type="range" min="0" max="128" value="18"></label>
<label>Output max px<select id="outputSize"><option>512</option><option selected>1024</option><option>1536</option><option>2048</option></select></label>
<button id="fullCrop">Full image</button><button id="portraitCrop">Center portrait</button><button id="renderPreview">Render preview</button><button id="toggleBackdrop">Toggle backdrop</button>
</div>
<div class="preview"><div class="previewBox"><img id="previewImage" alt="Prepared role preview"></div><p id="previewText">Select an asset, drag a crop rectangle, and render a preview. The final server receipt binds the source key, source digest, crop, background recipe, and exact output bytes.</p></div>
<div class="message" id="message"></div>
<div class="actions"><button class="primary" id="complete">Write seven-role source pack and continue</button><button id="saveCurrent">Save active role</button><button class="danger" id="cancel">Cancel without writing</button></div>
</div></section>
</div>
<script>
'use strict';
const token=new URL(location.href).searchParams.get('token');
const api=(path,options={})=>fetch(path+(path.includes('?')?'&':'?')+'token='+encodeURIComponent(token),{...options,headers:{...(options.headers||{}),'x-underdrain-token':token}});
const roleNodes=new Map();const assetNodes=new Map();const assignments=new Map();let state=null;let activeRole=null;let activeImage=null;let imageRect=null;let dragStart=null;
const canvas=document.getElementById('editorCanvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
const msg=(text,bad=false)=>{const el=document.getElementById('message');el.textContent=text;el.style.color=bad?'var(--danger)':'var(--muted)'};
function current(){return assignments.get(activeRole)}
function roleDef(){return state.roles.find(r=>r.role===activeRole)}
function fitRect(sw,sh,cw,ch){const s=Math.min(cw/sw,ch/sh);const w=sw*s,h=sh*s;return{x:(cw-w)/2,y:(ch-h)/2,w,h,scale:s}}
function sourcePoint(event){const r=canvas.getBoundingClientRect();const x=(event.clientX-r.left)*canvas.width/r.width,y=(event.clientY-r.top)*canvas.height/r.height;if(!imageRect)return null;return{x:Math.max(0,Math.min(activeImage.naturalWidth,(x-imageRect.x)/imageRect.scale)),y:Math.max(0,Math.min(activeImage.naturalHeight,(y-imageRect.y)/imageRect.scale))}}
function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#07100d';ctx.fillRect(0,0,canvas.width,canvas.height);if(!activeImage){ctx.fillStyle='#9bb0a7';ctx.textAlign='center';ctx.fillText('Choose a source image for this role',canvas.width/2,canvas.height/2);return}imageRect=fitRect(activeImage.naturalWidth,activeImage.naturalHeight,canvas.width,canvas.height);ctx.drawImage(activeImage,imageRect.x,imageRect.y,imageRect.w,imageRect.h);const crop=current().crop;if(crop){ctx.fillStyle='rgba(0,0,0,.54)';ctx.fillRect(0,0,canvas.width,canvas.height);const x=imageRect.x+crop.x*imageRect.scale,y=imageRect.y+crop.y*imageRect.scale,w=crop.width*imageRect.scale,h=crop.height*imageRect.scale;ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(activeImage,imageRect.x,imageRect.y,imageRect.w,imageRect.h);ctx.restore();ctx.strokeStyle='#80e6a6';ctx.lineWidth=3;ctx.strokeRect(x,y,w,h)}}
async function loadActiveImage(){const assignment=current();activeImage=null;imageRect=null;if(!assignment.sourceKey){draw();return}const asset=state.assets.find(a=>a.key===assignment.sourceKey);const image=new Image();image.decoding='async';image.src='/asset/'+encodeURIComponent(asset.key)+'?token='+encodeURIComponent(token);await image.decode();activeImage=image;if(!assignment.crop)assignment.crop={x:0,y:0,width:image.naturalWidth,height:image.naturalHeight};draw()}
function renderRoles(){const root=document.getElementById('roles');root.innerHTML='';for(const role of state.roles){const b=document.createElement('button');b.className='role';b.innerHTML='<span class="dot"></span><strong>'+escapeHtml(role.title)+'</strong><small>'+escapeHtml(role.role)+'</small>';b.onclick=()=>setActiveRole(role.role);root.appendChild(b);roleNodes.set(role.role,b)}}
function renderGallery(){const root=document.getElementById('gallery');root.innerHTML='';for(const asset of state.assets){const b=document.createElement('button');b.className='asset';b.innerHTML='<div class="thumb"><img loading="lazy" src="/asset/'+encodeURIComponent(asset.key)+'?token='+encodeURIComponent(token)+'" alt=""></div><strong>'+escapeHtml(asset.key)+'</strong><small>'+asset.width+'×'+asset.height+' · '+asset.pngSha256.slice(0,10)+'</small>';b.onclick=async()=>{const a=current();a.sourceKey=asset.key;a.crop={x:0,y:0,width:asset.width,height:asset.height};a.preview=null;await loadActiveImage();updateUI();msg('Assigned '+asset.key+' to '+roleDef().title+'. Drag to refine the crop.')};root.appendChild(b);assetNodes.set(asset.key,b)}}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function setActiveRole(role){activeRole=role;await loadActiveImage();updateUI()}
function updateUI(){for(const [role,node] of roleNodes){node.classList.toggle('active',role===activeRole);node.classList.toggle('ready',Boolean(assignments.get(role).preview))}for(const [key,node] of assetNodes)node.classList.toggle('selected',current()?.sourceKey===key);const role=roleDef();document.getElementById('roleTitle').textContent=role.title;document.getElementById('roleGuidance').textContent=role.guidance;document.getElementById('backgroundMode').value=current().background.mode;document.getElementById('tolerance').value=current().background.tolerance;document.getElementById('feather').value=current().background.feather;const p=current().preview;document.getElementById('previewImage').src=p?.dataUrl||'';document.getElementById('previewText').textContent=p?(p.width+'×'+p.height+'; transparent pixels '+(p.transparentPixelFraction*100).toFixed(1)+'%; output '+p.bytesApprox.toLocaleString()+' bytes.'):'No prepared preview saved for this role.';document.getElementById('topStatus').textContent=[...assignments.values()].filter(v=>v.preview).length+' / 7 prepared'}
canvas.addEventListener('pointerdown',event=>{if(!activeImage)return;dragStart=sourcePoint(event);canvas.setPointerCapture(event.pointerId)});canvas.addEventListener('pointermove',event=>{if(!dragStart||!activeImage)return;const end=sourcePoint(event);const x=Math.min(dragStart.x,end.x),y=Math.min(dragStart.y,end.y),width=Math.abs(end.x-dragStart.x),height=Math.abs(end.y-dragStart.y);if(width>=2&&height>=2){current().crop={x,y,width,height};current().preview=null;draw();updateUI()}});canvas.addEventListener('pointerup',event=>{dragStart=null;try{canvas.releasePointerCapture(event.pointerId)}catch{}});
function cornerColors(data,w,h){const at=(x,y)=>{const i=(y*w+x)*4;return[data[i],data[i+1],data[i+2]]};return[at(0,0),at(w-1,0),at(0,h-1),at(w-1,h-1)]}
function colorDistance(data,index,colors){let best=1e9;for(const c of colors){const dr=data[index]-c[0],dg=data[index+1]-c[1],db=data[index+2]-c[2];best=Math.min(best,Math.sqrt(dr*dr+dg*dg+db*db))}return best}
function edgeCutout(imageData,tolerance,feather){const {data,width,height}=imageData,colors=cornerColors(data,width,height),seen=new Uint8Array(width*height),queue=new Int32Array(width*height),soft=new Float32Array(width*height);let head=0,tail=0;const push=(x,y)=>{const p=y*width+x;if(seen[p])return;const i=p*4,d=colorDistance(data,i,colors);if(d>tolerance+feather)return;seen[p]=1;soft[p]=d;queue[tail++]=p};for(let x=0;x<width;x++){push(x,0);push(x,height-1)}for(let y=0;y<height;y++){push(0,y);push(width-1,y)}while(head<tail){const p=queue[head++],x=p%width,y=(p/width)|0;if(x>0)push(x-1,y);if(x+1<width)push(x+1,y);if(y>0)push(x,y-1);if(y+1<height)push(x,y+1)}for(let p=0;p<seen.length;p++){if(!seen[p])continue;const i=p*4,d=soft[p];if(d<=tolerance)data[i+3]=0;else if(feather>0)data[i+3]=Math.round(data[i+3]*Math.max(0,Math.min(1,(d-tolerance)/feather)))}return imageData}
function trimCanvas(source){const c=source.getContext('2d',{willReadFrequently:true}),d=c.getImageData(0,0,source.width,source.height).data;let minX=source.width,minY=source.height,maxX=-1,maxY=-1,transparent=0;for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){const a=d[(y*source.width+x)*4+3];if(a<8)transparent++;else{minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}}if(maxX<0)return{canvas:source,transparentPixelFraction:1};const pad=Math.max(2,Math.round(Math.max(maxX-minX+1,maxY-minY+1)*.025));minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);maxX=Math.min(source.width-1,maxX+pad);maxY=Math.min(source.height-1,maxY+pad);const out=document.createElement('canvas');out.width=maxX-minX+1;out.height=maxY-minY+1;out.getContext('2d').drawImage(source,minX,minY,out.width,out.height,0,0,out.width,out.height);return{canvas:out,transparentPixelFraction:transparent/(source.width*source.height)}}
async function prepareRole(role){const assignment=assignments.get(role.role);if(!assignment.sourceKey||!assignment.crop)throw new Error(role.title+' has no source crop.');const asset=state.assets.find(a=>a.key===assignment.sourceKey),image=new Image();image.src='/asset/'+encodeURIComponent(asset.key)+'?token='+encodeURIComponent(token);await image.decode();const crop=assignment.crop,max=Number(document.getElementById('outputSize').value)||1024,scale=Math.min(1,max/Math.max(crop.width,crop.height)),out=document.createElement('canvas');out.width=Math.max(1,Math.round(crop.width*scale));out.height=Math.max(1,Math.round(crop.height*scale));const c=out.getContext('2d',{willReadFrequently:true});c.drawImage(image,crop.x,crop.y,crop.width,crop.height,0,0,out.width,out.height);if(assignment.background.mode==='edge'){let data=c.getImageData(0,0,out.width,out.height);data=edgeCutout(data,assignment.background.tolerance,assignment.background.feather);c.putImageData(data,0,0)}const trimmed=assignment.background.trim?trimCanvas(out):{canvas:out,transparentPixelFraction:0};const dataUrl=trimmed.canvas.toDataURL('image/png');return{dataUrl,pngBase64:dataUrl.split(',')[1],width:trimmed.canvas.width,height:trimmed.canvas.height,transparentPixelFraction:trimmed.transparentPixelFraction,bytesApprox:Math.floor(dataUrl.length*.75)}}
async function renderCurrent(){try{syncControls();const p=await prepareRole(roleDef());current().preview=p;updateUI();msg('Prepared preview saved for '+roleDef().title+'.')}catch(error){msg(error.message,true)}}
function syncControls(){const a=current();a.background={mode:document.getElementById('backgroundMode').value,tolerance:Number(document.getElementById('tolerance').value),feather:Number(document.getElementById('feather').value),trim:true};a.preview=null}
document.getElementById('backgroundMode').onchange=syncControls;document.getElementById('tolerance').oninput=syncControls;document.getElementById('feather').oninput=syncControls;document.getElementById('renderPreview').onclick=renderCurrent;document.getElementById('saveCurrent').onclick=renderCurrent;document.getElementById('fullCrop').onclick=()=>{if(!activeImage)return;current().crop={x:0,y:0,width:activeImage.naturalWidth,height:activeImage.naturalHeight};current().preview=null;draw();updateUI()};document.getElementById('portraitCrop').onclick=()=>{if(!activeImage)return;const w=activeImage.naturalWidth,h=activeImage.naturalHeight,target=Math.min(w,h*.78),x=(w-target)/2;current().crop={x,y:0,width:target,height:h};current().preview=null;draw();updateUI()};document.getElementById('toggleBackdrop').onclick=()=>document.getElementById('canvasWrap').classList.toggle('checker');
document.getElementById('complete').onclick=async()=>{try{msg('Preparing all seven roles…');const roles=[];for(const role of state.roles){activeRole=role.role;syncControlsFromAssignment();const assignment=assignments.get(role.role);if(!assignment.preview)assignment.preview=await prepareRole(role);roles.push({role:role.role,sourceKey:assignment.sourceKey,crop:assignment.crop,background:assignment.background,output:{pngBase64:assignment.preview.pngBase64,width:assignment.preview.width,height:assignment.preview.height,transparentPixelFraction:assignment.preview.transparentPixelFraction}})}const response=await api('/api/complete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({format:'${SELECTION_FORMAT}',operatorId:state.operatorId,roles})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Authoring failed.');msg('Seven-role pack written: '+result.output);document.getElementById('complete').disabled=true;document.getElementById('cancel').disabled=true;document.getElementById('topStatus').textContent='PASS — named Unity review remains open'}catch(error){msg(error.message,true)}};
function syncControlsFromAssignment(){const a=current();document.getElementById('backgroundMode').value=a.background.mode;document.getElementById('tolerance').value=a.background.tolerance;document.getElementById('feather').value=a.background.feather}
document.getElementById('cancel').onclick=async()=>{await api('/api/cancel',{method:'POST'});msg('Cancelled. No output was written.',true)};
(async()=>{const response=await api('/api/state');state=await response.json();for(const role of state.roles)assignments.set(role.role,{sourceKey:null,crop:null,background:{mode:role.backgroundMode,tolerance:48,feather:18,trim:true},preview:null});renderRoles();renderGallery();await setActiveRole(state.roles[0].role);document.getElementById('topStatus').textContent='0 / 7 prepared';msg('Choose a project-owned source for each role. Source images may be reused only when the final crops produce byte-distinct role products.')})().catch(error=>msg(error.message,true));
</script>
</body></html>`;
}

function openBrowser(url) {
  try {
    if (process.platform === 'win32') {
      const child = spawn('cmd.exe', ['/d', '/s', '/c', 'start', '""', `"${url}"`], { detached: true, stdio: 'ignore', windowsHide: true });
      child.unref();
    } else if (process.platform === 'darwin') {
      const child = spawn('open', [url], { detached: true, stdio: 'ignore' });
      child.unref();
    } else {
      const child = spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
      child.unref();
    }
  } catch {
    // The URL is always printed for manual opening.
  }
}

async function readRequestBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new Error('Authoring submission exceeds the maximum request size.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function jsonResponse(response, status, value) {
  const body = Buffer.from(`${JSON.stringify(value)}\n`, 'utf8');
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': body.length,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  response.end(body);
}

async function serveReview(options, extraction) {
  if (options.host !== '127.0.0.1' && options.host !== '::1' && options.host !== 'localhost') throw new Error('Representation authoring may listen only on loopback.');
  await ensureOutputAvailable(options.output, options.replace);
  const token = randomBytes(24).toString('hex');
  let terminal = false;
  let exitCode = 2;
  let completeResolve;
  const completed = new Promise((resolvePromise) => { completeResolve = resolvePromise; });
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`);
      const suppliedToken = request.headers['x-underdrain-token'] ?? url.searchParams.get('token');
      if (suppliedToken !== token) return jsonResponse(response, 403, { error: 'Invalid local authoring token.' });
      if (request.method === 'GET' && url.pathname === '/') {
        const body = Buffer.from(htmlDocument(), 'utf8');
        response.writeHead(200, {
          'content-type': 'text/html; charset=utf-8',
          'content-length': body.length,
          'cache-control': 'no-store',
          'content-security-policy': "default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
          'referrer-policy': 'no-referrer',
          'x-content-type-options': 'nosniff',
          'x-frame-options': 'DENY',
        });
        return response.end(body);
      }
      if (request.method === 'GET' && url.pathname === '/api/state') {
        return jsonResponse(response, 200, {
          format: SESSION_FORMAT,
          status: 'review-open',
          productId: PRODUCT_ID,
          themeId: THEME_ID,
          operatorId: normalizeOperatorId(options.operatorId),
          sourceStandaloneFileName: extraction.receipt.sourceFileName,
          sourceStandaloneSha256: extraction.receipt.sourceSha256,
          roles: ROLE_OUTPUTS.map(({ role, title, guidance, backgroundMode }) => ({ role, title, guidance, backgroundMode })),
          assets: extraction.assets.map(({ key, width, height, pngSha256 }) => ({ key, width, height, pngSha256 })),
          sourceReuseAllowed: true,
          distinctPreparedBytesRequired: true,
          unityInvoked: false,
          approvalIssued: false,
          productAcceptance: 'not-issued',
        });
      }
      if (request.method === 'GET' && url.pathname.startsWith('/asset/')) {
        const key = decodeURIComponent(url.pathname.slice('/asset/'.length));
        const asset = extraction.byKey.get(key);
        if (!asset) return jsonResponse(response, 404, { error: 'Unknown extracted asset.' });
        const body = await readFile(asset.absolutePath);
        response.writeHead(200, {
          'content-type': 'image/png',
          'content-length': body.length,
          'cache-control': 'no-store',
          'content-security-policy': "default-src 'none'",
          'x-content-type-options': 'nosniff',
        });
        return response.end(body);
      }
      if (request.method === 'POST' && url.pathname === '/api/complete') {
        if (terminal) return jsonResponse(response, 409, { error: 'Authoring session is already terminal.' });
        const body = await readRequestBody(request);
        const selection = JSON.parse(body.toString('utf8'));
        const result = await writeAuthoredRepresentation(options, extraction, selection);
        terminal = true;
        exitCode = 0;
        jsonResponse(response, 200, result);
        setTimeout(() => { server.close(); completeResolve(); }, 250).unref();
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/cancel') {
        if (!terminal) {
          terminal = true;
          exitCode = 2;
          jsonResponse(response, 200, { status: 'cancelled', outputWritten: false });
          setTimeout(() => { server.close(); completeResolve(); }, 100).unref();
          return;
        }
        return jsonResponse(response, 409, { error: 'Authoring session is already terminal.' });
      }
      return jsonResponse(response, 404, { error: 'Unknown local authoring endpoint.' });
    } catch (error) {
      return jsonResponse(response, 400, { error: error?.message ?? String(error) });
    }
  });
  server.on('error', (error) => {
    if (!terminal) {
      terminal = true;
      exitCode = 1;
      console.error(error?.stack || String(error));
      completeResolve();
    }
  });
  await new Promise((resolvePromise, rejectPromise) => server.listen(options.port, options.host, resolvePromise).once('error', rejectPromise));
  const address = server.address();
  const host = options.host === '::1' ? '[::1]' : options.host;
  const url = `http://${host}:${address.port}/?token=${token}`;
  process.stdout.write(`${JSON.stringify({
    format: SESSION_FORMAT,
    status: 'review-open',
    url,
    extraction: options.extraction,
    output: options.output,
    timeoutMinutes: options.timeoutMinutes,
    unityInvoked: false,
    approvalIssued: false,
    productAcceptance: 'not-issued',
  })}\n`);
  if (!options.noOpen) openBrowser(url);
  const timer = setTimeout(() => {
    if (!terminal) {
      terminal = true;
      exitCode = 2;
      console.error(`Representation authoring timed out after ${options.timeoutMinutes} minutes. No output was written.`);
      server.close();
      completeResolve();
    }
  }, options.timeoutMinutes * 60_000);
  timer.unref();
  const interrupt = () => {
    if (!terminal) {
      terminal = true;
      exitCode = 2;
      console.error('Representation authoring was interrupted. No output was written.');
      server.close();
      completeResolve();
    }
  };
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  await completed;
  clearTimeout(timer);
  process.removeListener('SIGINT', interrupt);
  process.removeListener('SIGTERM', interrupt);
  process.exitCode = exitCode;
}

async function main() {
  const options = parseArgs(process.argv);
  const extraction = await loadExtraction(options.extraction);
  if (options.selection) {
    const selection = JSON.parse(await readFile(options.selection, 'utf8'));
    await writeAuthoredRepresentation(options, extraction, selection);
    return;
  }
  await serveReview(options, extraction);
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
