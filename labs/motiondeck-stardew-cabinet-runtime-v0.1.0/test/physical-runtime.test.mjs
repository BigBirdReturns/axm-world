import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { WindowsAdapter } from '../src/adapters/windows.mjs';
import { EvidenceLedger } from '../src/evidence.mjs';
import { CabinetRuntime } from '../src/runtime.mjs';
import { makeRequest, REQUIRED_CAPABILITIES } from '../src/protocol.mjs';
import { PHYSICAL_EVIDENCE_FORMAT, publicKeyId, signPhysicalEvidence } from '../src/attestation.mjs';
import { temporaryRoot } from './helpers.mjs';

function request(token, operation, payload, transactionId) {
  return makeRequest(operation, payload, { token, transactionId, clientRole: 'test', clientId: 'physical-runtime-test' });
}

test('operational arm requires and consumes complete signed physical evidence', async (t) => {
  const root = await temporaryRoot();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const hookScript = path.join(root, 'hook.mjs');
  await fsp.writeFile(hookScript, 'process.stdout.write("ok");\n');
  const hooks = Object.fromEntries([
    'arm', 'disarm', 'recenter', 'controllerFallback', 'native2dFallback',
    'rendererNative2d', 'rendererDesktop3d', 'rendererHmdVr', 'rendererCabinetTv', 'captureFrame',
  ].map((name) => [name, { executable: process.execPath, args: [hookScript], timeoutMs: 2000 }]));
  const config = {
    nativeProbePath: path.join(root, 'missing-native-probe.exe'),
    televisionDisplayId: null,
    physicalEvidencePath: null,
    trustedEvidenceKeys: {},
    hooks,
  };
  const adapter = new WindowsAdapter({ packageRoot: root, evidenceRoot: path.join(root, 'evidence'), config });
  const initial = await adapter.probe();
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const signingKeyId = publicKeyId(publicKey);
  const publicPath = path.join(root, 'physical-evidence.pub.pem');
  const evidencePath = path.join(root, 'physical-evidence.json');
  await fsp.writeFile(publicPath, publicPem);
  const signed = signPhysicalEvidence({
    format: PHYSICAL_EVIDENCE_FORMAT,
    machineFingerprint: initial.environment.machineFingerprint,
    issuedAt: '2026-08-03T00:00:00.000Z',
    expiresAt: '2026-08-10T00:00:00.000Z',
    operator: 'bounded-test-operator',
    records: REQUIRED_CAPABILITIES.map((capabilityId) => ({ capabilityId, status: 'passed', evidenceDigest: `physical_${capabilityId}`, details: { fixture: true } })),
    signingKeyId,
  }, privateKey);
  await fsp.writeFile(evidencePath, `${JSON.stringify(signed, null, 2)}\n`);
  config.physicalEvidencePath = evidencePath;
  config.trustedEvidenceKeys = { [signingKeyId]: publicPath };

  const ledger = await new EvidenceLedger({ root: path.join(root, 'ledger') }).open();
  const token = crypto.randomBytes(32).toString('base64url');
  const runtime = new CabinetRuntime({ adapter, ledger, token });
  t.after(() => runtime.close());
  const probe = await runtime.handle(request(token, 'probe', {}, null));
  assert.equal(probe.success, true);
  assert.ok(probe.probe.capabilities.every((entry) => entry.status === 'available' && entry.evidenceTier === 'physical'));
  const armed = await runtime.handle(request(token, 'arm', { authorityMode: 'operational', leaseTtlMs: 2000 }, 'physical-transaction'));
  assert.equal(armed.success, true);
  assert.equal(armed.state.authority, 'local-device-display-lease');
  assert.equal(armed.state.hmdWornRequired, false);
  assert.equal(armed.state.authorityMode, 'operational');
  const disarmed = await runtime.handle(request(token, 'disarm', { reason: 'test-complete' }, 'physical-transaction'));
  assert.equal(disarmed.success, true);
  assert.equal(disarmed.state.authority, 'none');
});
