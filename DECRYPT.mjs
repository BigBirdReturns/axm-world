import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const encrypted = path.join(here, 'por-cold-independent-005.zip.aes256');
const output = path.join(here, 'por-cold-independent-005.zip');
const keyArg = process.argv.slice(2).find((value) => value.startsWith('--key='))?.slice(6);
const keyHex = keyArg || process.env.POR_PACKET_KEY || '';
if (!/^[a-f0-9]{64}$/i.test(keyHex)) throw new Error('Set POR_PACKET_KEY to the authorized 64-character hex key, or pass --key=KEY.');

const payload = await fs.readFile(encrypted);
if (payload.subarray(0, 9).toString() !== 'PORBLIND1') throw new Error('Unsupported encrypted packet format.');
const iv = payload.subarray(9, 21);
const tag = payload.subarray(21, 37);
const ciphertext = payload.subarray(37);
const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), iv);
decipher.setAuthTag(tag);
const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
const hash = crypto.createHash('sha256').update(plaintext).digest('hex');
const expected = 'a6c8a705ecce196ab1a88dba1e703a9d1964276c5ff2199f0ca2441740ad4b38';
if (hash !== expected) throw new Error(`Decrypted archive hash mismatch: ${hash}`);
await fs.writeFile(output, plaintext);
console.log(`Decrypted and verified ${path.basename(output)} (${hash}).`);

