import fsp from 'node:fs/promises';
import net from 'node:net';
import { makeRequest } from './protocol.mjs';
import { parseBoundedJson } from './core.mjs';

export async function readToken(filePath) {
  const token = (await fsp.readFile(filePath, 'utf8')).trim();
  if (!token) throw new Error(`IPC token is empty: ${filePath}`);
  return token;
}

export async function sendRequest({ socketPath, token, operation, payload = {}, transactionId = null, clientId = 'motiondeck-cli', clientRole = 'operator', clientVersion = '0.1.0', requestId = undefined, timeoutMs = 10_000, maxMessageBytes = 256 * 1024 }) {
  const request = makeRequest(operation, payload, { token, transactionId, clientId, clientRole, clientVersion, requestId });
  const line = `${JSON.stringify(request)}\n`;
  if (Buffer.byteLength(line, 'utf8') > maxMessageBytes) throw new Error('IPC request exceeds the message ceiling.');
  return await new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    let buffer = '';
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error); else resolve(value);
    };
    socket.setEncoding('utf8');
    socket.on('connect', () => socket.write(line));
    socket.on('data', (chunk) => {
      buffer += chunk;
      if (Buffer.byteLength(buffer, 'utf8') > maxMessageBytes) return finish(new Error('IPC response exceeds the message ceiling.'));
      const newline = buffer.indexOf('\n');
      if (newline < 0) return;
      try {
        finish(null, parseBoundedJson(buffer.slice(0, newline).replace(/\r$/, ''), 'IPC response', maxMessageBytes));
      } catch (error) {
        finish(error);
      }
    });
    socket.on('error', (error) => finish(error));
    socket.on('end', () => { if (!settled) finish(new Error('IPC connection ended without a response.')); });
    const timer = setTimeout(() => finish(new Error(`IPC request exceeded ${timeoutMs} ms.`)), timeoutMs);
    timer.unref?.();
  });
}
