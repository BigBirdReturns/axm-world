import fsp from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { hashFile } from './core.mjs';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

export async function writeDiagnosticPng(filePath, { width = 640, height = 360, seed = 1 } = {}) {
  if (!Number.isInteger(width) || width < 64 || width > 4096) throw new Error('PNG width is out of range.');
  if (!Number.isInteger(height) || height < 64 || height > 4096) throw new Error('PNG height is out of range.');
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = 1 + x * 4;
      row[offset] = (x * 255 / Math.max(1, width - 1) + seed * 17) & 0xff;
      row[offset + 1] = (y * 255 / Math.max(1, height - 1) + seed * 31) & 0xff;
      row[offset + 2] = ((x ^ y) + seed * 47) & 0xff;
      row[offset + 3] = 255;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const bytes = Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, bytes, { flag: 'wx' });
  const hashed = await hashFile(filePath);
  return { path: filePath, width, height, bytes: hashed.bytes, sha256: hashed.sha256, synthetic: true };
}

export async function inspectPng(filePath) {
  const bytes = await fsp.readFile(filePath);
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(SIGNATURE)) throw new Error('Not a PNG file.');
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const hashed = await hashFile(filePath);
  return { path: filePath, width, height, bytes: hashed.bytes, sha256: hashed.sha256 };
}
