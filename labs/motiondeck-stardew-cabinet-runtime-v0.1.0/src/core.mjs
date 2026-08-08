import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

export const MAX_JSON_BYTES = 256 * 1024;
export const MAX_FILE_HASH_BYTES = 4 * 1024 * 1024 * 1024;

export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort((a, b) => a.localeCompare(b, 'en-US'));
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

export function sha256Bytes(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function digestObject(value, prefix = 'sha256') {
  return `${prefix}_${sha256Bytes(Buffer.from(stableStringify(value), 'utf8'))}`;
}

export function randomId(prefix) {
  return `${prefix}_${sha256Bytes(crypto.randomBytes(32))}`;
}

export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function issue(severity, code, message, details = {}) {
  return { severity, code, message, ...details };
}

export function sortIssues(findings) {
  const rank = { blocker: 0, warning: 1, info: 2 };
  return [...findings].sort((a, b) => {
    const severity = (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
    if (severity !== 0) return severity;
    const code = String(a.code).localeCompare(String(b.code), 'en-US');
    if (code !== 0) return code;
    return stableStringify(a).localeCompare(stableStringify(b), 'en-US');
  });
}

export function statusFromIssues(findings) {
  return findings.some((finding) => finding.severity === 'blocker') ? 'blocked' : 'admitted';
}

export function parseBoundedJson(text, label = 'JSON', maxBytes = MAX_JSON_BYTES) {
  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes > maxBytes) throw new Error(`${label} exceeds ${maxBytes} bytes.`);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} is invalid JSON: ${error.message}`);
  }
  return parsed;
}

export async function readBoundedJson(filePath, maxBytes = MAX_JSON_BYTES) {
  const stat = await fsp.stat(filePath);
  if (!stat.isFile()) throw new Error(`Not a regular file: ${filePath}`);
  if (stat.size > maxBytes) throw new Error(`JSON file exceeds ${maxBytes} bytes: ${filePath}`);
  return parseBoundedJson(await fsp.readFile(filePath, 'utf8'), filePath, maxBytes);
}

export async function pathExists(candidate) {
  try {
    await fsp.access(candidate);
    return true;
  } catch {
    return false;
  }
}

export function safeRelativePath(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  const normalized = relative.split(path.sep).join('/');
  if (!normalized || normalized === '.' || normalized.startsWith('../') || normalized.includes('/../') || path.isAbsolute(relative)) return null;
  return normalized;
}

export async function writeJsonAtomic(filePath, value) {
  const directory = path.dirname(filePath);
  await fsp.mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`);
  const data = `${JSON.stringify(value, null, 2)}\n`;
  await fsp.writeFile(temporary, data, { flag: 'wx', mode: 0o600 });
  await fsp.rename(temporary, filePath);
}

export async function hashFile(filePath, maxBytes = MAX_FILE_HASH_BYTES) {
  const stat = await fsp.stat(filePath);
  if (!stat.isFile()) throw new Error(`Not a regular file: ${filePath}`);
  if (stat.size > maxBytes) throw new Error(`File exceeds hash ceiling (${maxBytes} bytes): ${filePath}`);
  return await new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve({ sha256: hash.digest('hex'), bytes: stat.size }));
  });
}

export function redactObject(value, keyPattern = /(token|secret|password|authorization|cookie|credential)/i) {
  if (Array.isArray(value)) return value.map((entry) => redactObject(entry, keyPattern));
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
    key,
    keyPattern.test(key) ? '[REDACTED]' : redactObject(entry, keyPattern),
  ]));
}

export function boundedString(value, name, maxLength = 512, { optional = false } = {}) {
  if (value === undefined || value === null) {
    if (optional) return null;
    throw new Error(`${name} is required.`);
  }
  if (typeof value !== 'string') throw new Error(`${name} must be a string.`);
  const trimmed = value.trim();
  if (!trimmed && !optional) throw new Error(`${name} must not be empty.`);
  if (trimmed.length > maxLength) throw new Error(`${name} exceeds ${maxLength} characters.`);
  return trimmed || null;
}

export function boundedInteger(value, name, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}
