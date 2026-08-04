import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { CabinetServer, ensureTokenFile } from '../src/server.mjs';
import { sendRequest } from '../src/client.mjs';
import { fixtureRuntime, temporaryRoot } from './helpers.mjs';

test('authenticated local IPC completes a full fixture transaction', async (t) => {
  const root = await temporaryRoot();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const socketPath = process.platform === 'win32'
    ? String.raw`\\.\pipe\BigBirdReturns.MotionDeckCabinetRuntime.test.${process.pid}.${crypto.randomBytes(4).toString('hex')}`
    : path.join(root, 'runtime.sock');
  const tokenFile = path.join(root, 'token.txt');
  const token = await ensureTokenFile(tokenFile);
  const { runtime } = await fixtureRuntime(root, token);
  const server = await new CabinetServer({ socketPath, runtime, maxConnections: 2, idleTimeoutMs: 5000 }).start();
  t.after(async () => { await server.close(); await runtime.close(); });
  const hello = await sendRequest({ socketPath, token, operation: 'hello', clientRole: 'test' });
  assert.equal(hello.success, true);
  const bad = await sendRequest({ socketPath, token: 'x'.repeat(token.length), operation: 'probe', clientRole: 'test' });
  assert.equal(bad.success, false);
  assert.equal(bad.code, 'request.blocked');
  const arm = await sendRequest({ socketPath, token, operation: 'arm', payload: { authorityMode: 'synthetic', leaseTtlMs: 2000 }, transactionId: 'ipc-test', clientRole: 'test' });
  assert.equal(arm.success, true);
  const shutdown = await sendRequest({ socketPath, token, operation: 'shutdown', clientRole: 'test' });
  assert.equal(shutdown.success, true);
});

test('token file permissions are private on POSIX', async (t) => {
  const root = await temporaryRoot();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const file = path.join(root, 'token.txt');
  await ensureTokenFile(file);
  if (process.platform !== 'win32') {
    const stat = await fsp.stat(file);
    assert.equal(stat.mode & 0o077, 0);
  }
});
