#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile, readdir, stat } from 'node:fs/promises';
import { basename, extname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const FORMAT = 'rodoh-underdrain-shine-extraction/1';

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

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
    if (index + 1 >= argv.length || argv[index + 1].startsWith('--')) throw new Error(`Missing value for ${token}`);
    values.set(token, argv[++index]);
  }
  const input = values.get('--input');
  const output = values.get('--output');
  if (!input || !output) throw new Error('Usage: extract-underdrain-shine-assets.mjs --input <standalone.html> --output <directory> [--expected-sha256 <hex>] [--role-map <json>] [--replace]');
  return {
    input: resolve(input),
    output: resolve(output),
    expectedSha256: values.get('--expected-sha256')?.toLowerCase(),
    roleMap: values.get('--role-map') ? resolve(values.get('--role-map')) : null,
    replace: switches.has('--replace'),
  };
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function sanitizeKey(value) {
  const safe = String(value).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!safe) throw new Error(`Asset key cannot be materialized safely: ${value}`);
  return safe;
}

function captureObjectLiteral(source, marker = 'const ASSET_DATA=') {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Standalone does not contain ${marker}`);
  const start = source.indexOf('{', markerIndex + marker.length);
  if (start < 0) throw new Error('ASSET_DATA object has no opening brace.');
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error('ASSET_DATA object is unterminated.');
}

function decodeDataUri(value, key) {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(value));
  if (!match) throw new Error(`ASSET_DATA.${key} is not a base64 data URI.`);
  const mime = match[1].toLowerCase();
  const bytes = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
  if (bytes.length === 0) throw new Error(`ASSET_DATA.${key} decoded to zero bytes.`);
  const extension = mime === 'image/webp' ? '.webp'
    : mime === 'image/png' ? '.png'
      : mime === 'image/jpeg' ? '.jpg'
        : mime === 'image/gif' ? '.gif'
          : null;
  if (!extension) throw new Error(`ASSET_DATA.${key} has unsupported MIME type ${mime}.`);
  return { mime, bytes, extension };
}

async function pngFromDataUri(page, dataUri) {
  return page.evaluate(async (uri) => {
    const image = new Image();
    image.decoding = 'sync';
    image.src = uri;
    await new Promise((resolvePromise, rejectPromise) => {
      image.onload = resolvePromise;
      image.onerror = () => rejectPromise(new Error('Browser could not decode embedded image.'));
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { alpha: true, willReadFrequently: false });
    if (!context) throw new Error('Browser did not provide a 2D canvas context.');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    return {
      width: canvas.width,
      height: canvas.height,
      pngBase64: canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''),
    };
  }, dataUri);
}

async function listFiles(root) {
  const values = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) values.push(path);
    }
  }
  await walk(root);
  return values;
}

async function resolveRoleMap(path, assetKeys) {
  if (!path) return null;
  const map = JSON.parse(await readFile(path, 'utf8'));
  if (map.format !== 'rodoh-underdrain-shine-role-map/1') throw new Error('Role-map format is unsupported.');
  const known = new Set(assetKeys);
  const seen = new Set();
  const roles = [];
  for (const entry of map.roles ?? []) {
    if (!entry || typeof entry.role !== 'string' || typeof entry.sourceKey !== 'string') throw new Error('Role-map entry is incomplete.');
    if (!known.has(entry.sourceKey)) throw new Error(`Role ${entry.role} cites absent Shine key ${entry.sourceKey}.`);
    if (seen.has(entry.role)) throw new Error(`Role-map repeats ${entry.role}.`);
    seen.add(entry.role);
    roles.push({ role: entry.role, sourceKey: entry.sourceKey });
  }
  return { format: map.format, source: path, roles };
}

async function main() {
  const options = parseArgs(process.argv);
  const sourceBytes = await readFile(options.input);
  const sourceSha256 = sha256(sourceBytes);
  if (options.expectedSha256 && !/^[0-9a-f]{64}$/.test(options.expectedSha256)) throw new Error('Expected SHA-256 is malformed.');
  if (options.expectedSha256 && sourceSha256 !== options.expectedSha256) {
    throw new Error(`Shine standalone SHA-256 differs: expected ${options.expectedSha256}, observed ${sourceSha256}.`);
  }

  if (options.replace) await rm(options.output, { recursive: true, force: true });
  else {
    try {
      const existing = await stat(options.output);
      if (existing.isDirectory() && (await readdir(options.output)).length > 0) throw new Error(`Output directory is not empty: ${options.output}. Use --replace for an explicit replacement.`);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  await mkdir(join(options.output, 'original'), { recursive: true });
  await mkdir(join(options.output, 'png'), { recursive: true });

  const source = sourceBytes.toString('utf8');
  const objectLiteral = captureObjectLiteral(source);
  const values = JSON.parse(objectLiteral);
  const keys = Object.keys(values).sort((left, right) => left.localeCompare(right, 'en'));
  if (keys.length === 0) throw new Error('ASSET_DATA contains no assets.');

  let browser = null;
  let page = null;
  const assets = [];
  try {
    for (const key of keys) {
      const safe = sanitizeKey(key);
      const decoded = decodeDataUri(values[key], key);
      const originalRelative = `original/${safe}${decoded.extension}`;
      const pngRelative = `png/${safe}.png`;
      const originalPath = join(options.output, originalRelative);
      const pngPath = join(options.output, pngRelative);
      await writeFile(originalPath, decoded.bytes);
      let rendered;
      let pngBytes;
      if (decoded.mime === 'image/png') {
        if (decoded.bytes.length < 24 || decoded.bytes.toString('ascii', 1, 4) !== 'PNG') throw new Error(`ASSET_DATA.${key} is labeled PNG but lacks a PNG signature.`);
        rendered = { width: decoded.bytes.readUInt32BE(16), height: decoded.bytes.readUInt32BE(20) };
        pngBytes = decoded.bytes;
      } else {
        if (browser === null) {
          browser = await chromium.launch({ headless: true });
          page = await browser.newPage({ viewport: { width: 64, height: 64 } });
        }
        rendered = await pngFromDataUri(page, values[key]);
        pngBytes = Buffer.from(rendered.pngBase64, 'base64');
      }
      await writeFile(pngPath, pngBytes);
      assets.push({
        key,
        mime: decoded.mime,
        width: rendered.width,
        height: rendered.height,
        originalFile: originalRelative.replaceAll('\\', '/'),
        originalSha256: sha256(decoded.bytes),
        pngFile: pngRelative.replaceAll('\\', '/'),
        pngSha256: sha256(pngBytes),
      });
    }
  } finally {
    if (page !== null) await page.close();
    if (browser !== null) await browser.close();
  }

  const roleMap = await resolveRoleMap(options.roleMap, keys);
  const receipt = {
    format: FORMAT,
    generatedAt: new Date().toISOString(),
    status: 'pass',
    sourceFile: options.input,
    sourceFileName: basename(options.input),
    sourceSha256,
    expectedSourceSha256: options.expectedSha256 ?? null,
    assetObject: 'ASSET_DATA',
    assetCount: assets.length,
    assets,
    roleMap,
    representationMaterialized: false,
    unityInvoked: false,
    approvalIssued: false,
    productAcceptance: 'not-issued',
    authority: 'lossless embedded-asset extraction and browser-decoded PNG derivation only',
  };
  const receiptPath = join(options.output, 'shine-extraction.json');
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

  const files = (await listFiles(options.output))
    .filter((path) => basename(path) !== 'SHA256SUMS')
    .sort((left, right) => relative(options.output, left).localeCompare(relative(options.output, right), 'en'));
  const ledger = [];
  for (const file of files) {
    const rel = relative(options.output, file).replaceAll('\\', '/');
    ledger.push(`${sha256(await readFile(file))}  ${rel}`);
  }
  await writeFile(join(options.output, 'SHA256SUMS'), `${ledger.join('\n')}\n`, 'ascii');
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
}

main().catch((error) => fail(error?.stack || String(error)));
