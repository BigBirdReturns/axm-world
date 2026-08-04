import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { generateEvidenceKeyPair, signEvidenceFile, verifyEvidenceFile } from '../src/physical-tools.mjs';
import { PHYSICAL_EVIDENCE_FORMAT } from '../src/attestation.mjs';
import { REQUIRED_CAPABILITIES } from '../src/protocol.mjs';
import { temporaryRoot } from './helpers.mjs';

test('operator tooling generates, signs, and verifies a physical evidence file', async (t) => {
  const root = await temporaryRoot();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const privateKeyPath = path.join(root, 'operator.private.pem');
  const publicKeyPath = path.join(root, 'operator.public.pem');
  const key = await generateEvidenceKeyPair({ privateKeyPath, publicKeyPath });
  assert.match(key.signingKeyId, /^ed25519_[a-f0-9]{64}$/);
  if (process.platform !== 'win32') assert.equal((await fsp.stat(privateKeyPath)).mode & 0o077, 0);
  const machineFingerprint = `cabinetmachine1_${'c'.repeat(64)}`;
  const unsignedPath = path.join(root, 'unsigned.json');
  const signedPath = path.join(root, 'signed.json');
  await fsp.writeFile(unsignedPath, `${JSON.stringify({
    format: PHYSICAL_EVIDENCE_FORMAT,
    machineFingerprint,
    issuedAt: '2026-08-03T00:00:00.000Z',
    expiresAt: '2026-08-10T00:00:00.000Z',
    operator: 'operator-tool-test',
    records: REQUIRED_CAPABILITIES.map((capabilityId) => ({ capabilityId, status: 'passed', evidenceDigest: `tool_${capabilityId}` })),
  }, null, 2)}\n`);
  const signed = await signEvidenceFile({ inputPath: unsignedPath, privateKeyPath, outputPath: signedPath });
  assert.equal(signed.signingKeyId, key.signingKeyId);
  const verification = await verifyEvidenceFile({ inputPath: signedPath, publicKeyPath, expectedMachineFingerprint: machineFingerprint, now: new Date('2026-08-04T00:00:00.000Z') });
  assert.equal(verification.status, 'admitted');
});
