import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { isPlainObject, parseBoundedJson, pathExists } from './core.mjs';

export async function ensureTokenFile(filePath) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) throw new Error(`IPC token path is not a regular file: ${filePath}`);
    if (process.platform !== 'win32' && (stat.mode & 0o077) !== 0) throw new Error('IPC token file is accessible by group or other users.');
    const token = (await fsp.readFile(filePath, 'utf8')).trim();
    if (!/^[A-Za-z0-9_-]{32,256}$/.test(token)) throw new Error('IPC token file contains an invalid token.');
    return token;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const token = crypto.randomBytes(32).toString('base64url');
  await fsp.writeFile(filePath, `${token}\n`, { flag: 'wx', mode: 0o600 });
  return token;
}

async function removeStaleUnixSocket(socketPath) {
  if (process.platform === 'win32' || !(await pathExists(socketPath))) return;
  const stat = await fsp.lstat(socketPath);
  if (!stat.isSocket()) throw new Error(`Refusing to replace non-socket path: ${socketPath}`);
  await fsp.unlink(socketPath);
}

export class CabinetServer {
  constructor({ socketPath, runtime, maxConnections = 8, idleTimeoutMs = 10_000, maxMessageBytes = 256 * 1024 }) {
    this.socketPath = socketPath;
    this.runtime = runtime;
    this.maxConnections = maxConnections;
    this.idleTimeoutMs = idleTimeoutMs;
    this.maxMessageBytes = maxMessageBytes;
    this.connections = 0;
    this.server = null;
    this.closed = false;
  }

  async start() {
    await removeStaleUnixSocket(this.socketPath);
    if (process.platform !== 'win32') await fsp.mkdir(path.dirname(this.socketPath), { recursive: true, mode: 0o700 });
    this.server = net.createServer((socket) => this.#accept(socket));
    this.server.maxConnections = this.maxConnections;
    await new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(this.socketPath, () => {
        this.server.off('error', reject);
        resolve();
      });
    });
    if (process.platform !== 'win32') await fsp.chmod(this.socketPath, 0o600);
    return this;
  }

  #accept(socket) {
    this.connections += 1;
    if (this.connections > this.maxConnections) {
      socket.destroy();
      this.connections -= 1;
      return;
    }
    socket.setEncoding('utf8');
    socket.setTimeout(this.idleTimeoutMs, () => socket.destroy(new Error('IPC connection timed out.')));
    let buffer = '';
    let processing = Promise.resolve();
    socket.on('data', (chunk) => {
      buffer += chunk;
      if (Buffer.byteLength(buffer, 'utf8') > this.maxMessageBytes) {
        socket.destroy(new Error('IPC message ceiling exceeded.'));
        return;
      }
      while (buffer.includes('\n')) {
        const index = buffer.indexOf('\n');
        const line = buffer.slice(0, index).replace(/\r$/, '');
        buffer = buffer.slice(index + 1);
        if (!line) continue;
        processing = processing.then(() => this.#processLine(socket, line)).catch((error) => {
          if (!socket.destroyed) socket.write(`${JSON.stringify({ format: 'motiondeck-cabinet-ipc-response/1', success: false, code: 'server.exception', message: error.message })}\n`);
        });
      }
    });
    socket.on('close', () => { this.connections = Math.max(0, this.connections - 1); });
    socket.on('error', () => {});
  }

  async #processLine(socket, line) {
    let request;
    try {
      request = parseBoundedJson(line, 'IPC request', this.maxMessageBytes);
    } catch (error) {
      socket.write(`${JSON.stringify({ format: 'motiondeck-cabinet-ipc-response/1', success: false, code: 'request.invalid-json', message: error.message })}\n`);
      return;
    }
    if (!isPlainObject(request)) {
      socket.write(`${JSON.stringify({ format: 'motiondeck-cabinet-ipc-response/1', success: false, code: 'request.not-object', message: 'IPC request must be an object.' })}\n`);
      return;
    }
    const response = await this.runtime.handle(request);
    socket.write(`${JSON.stringify(response)}\n`, () => {
      if (request.operation === 'shutdown' && response.success) setImmediate(() => this.close().catch(() => {}));
    });
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    await new Promise((resolve) => {
      if (!this.server) return resolve();
      this.server.close(() => resolve());
      setTimeout(resolve, 1000).unref?.();
    });
    if (process.platform !== 'win32') await fsp.unlink(this.socketPath).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  }
}
