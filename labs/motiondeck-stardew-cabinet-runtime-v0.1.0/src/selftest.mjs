import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from './config.mjs';
import { ensureTokenFile, CabinetServer } from './server.mjs';
import { createRuntime } from './factory.mjs';
import { sendRequest } from './client.mjs';
import { EvidenceLedger } from './evidence.mjs';
import { digestObject } from './core.mjs';

export async function runSelftest(packageRoot) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'motiondeck-cabinet-selftest-'));
  const socketPath = process.platform === 'win32'
    ? String.raw`\\.\pipe\BigBirdReturns.MotionDeckCabinetRuntime.selftest.${process.pid}.${crypto.randomBytes(4).toString('hex')}`
    : path.join(root, 'runtime.sock');
  const tokenFile = path.join(root, 'token.txt');
  const evidenceRoot = path.join(root, 'evidence');
  const config = await loadConfig({ packageRoot, overrides: {
    adapter: 'fixture',
    stateRoot: root,
    ipc: { socketPath, tokenFile, maxConnections: 4, idleTimeoutMs: 5000, maxMessageBytes: 256 * 1024 },
    evidence: { root: evidenceRoot, maximumLedgerBytes: 4 * 1024 * 1024, maximumLedgerEntries: 10_000 },
    fixture: { frameWidth: 320, frameHeight: 180 },
  } });
  const token = await ensureTokenFile(tokenFile);
  const runtime = await createRuntime({ packageRoot, config, token });
  const server = await new CabinetServer({ socketPath, runtime, ...config.ipc }).start();
  const call = (operation, payload = {}, transactionId = null, options = {}) => sendRequest({ socketPath, token, operation, payload, transactionId, clientRole: options.clientRole ?? 'test', requestId: options.requestId });
  const transactionId = 'selftest-transaction';
  try {
    const hello = await call('hello');
    const probe = await call('probe');
    const operationalRefusal = await call('arm', { authorityMode: 'operational', leaseTtlMs: 2000 }, transactionId);
    const armed = await call('arm', { authorityMode: 'synthetic', leaseTtlMs: 2000 }, transactionId);
    const heartbeat = await call('heartbeat', {}, transactionId);
    const recentered = await call('recenter', {}, transactionId);
    const frame = await call('capture-frame', { name: 'selftest' }, transactionId);
    const fallback = await call('select-fallback', { fallback: 'controller' }, transactionId);
    const nativeFallback = await call('select-fallback', { fallback: 'native-2d' }, transactionId);
    const disarmed = await call('disarm', { reason: 'selftest-complete' }, transactionId);
    const events = await call('drain-events', { limit: 100 });
    const checks = {
      hello: hello.success,
      probe: probe.success,
      operationalRefused: operationalRefusal.success === false && operationalRefusal.code === 'arm.gate-blocked',
      syntheticArmed: armed.success && armed.state.armed && armed.state.authority === 'none',
      heartbeat: heartbeat.success,
      recenter: recentered.success && recentered.state.originVersion === 1,
      frame: frame.success && frame.payload.frame?.width === 320 && frame.payload.frame?.height === 180,
      controllerFallback: fallback.success && fallback.state.activeFallback === 'controller',
      nativeFallback: nativeFallback.success && nativeFallback.state.activeFallback === 'native-2d',
      disarmed: disarmed.success && !disarmed.state.armed,
      evidence: events.success && events.payload.ledger.entries >= 10,
    };
    const failures = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
    await server.close();
    await runtime.close();
    const reopened = await new EvidenceLedger({ root: evidenceRoot, maximumLedgerBytes: 4 * 1024 * 1024, maximumLedgerEntries: 10_000 }).open();
    const payload = {
      rootWasTemporary: true,
      platform: process.platform,
      node: process.version,
      checks,
      failures,
      ledger: reopened.summary(),
      productAuthority: 'none',
    };
    return {
      format: 'motiondeck-cabinet-selftest-receipt/1',
      status: failures.length === 0 ? 'passed' : 'failed',
      receiptId: digestObject(payload, 'cabinetselftest1'),
      generatedAt: new Date().toISOString(),
      payload,
    };
  } finally {
    await server.close().catch(() => {});
    await runtime.close().catch(() => {});
    await fsp.rm(root, { recursive: true, force: true });
  }
}
