import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { PHYSICAL_EVIDENCE_FORMAT, publicKeyId, signPhysicalEvidence, verifyPhysicalEvidence } from '../src/attestation.mjs';
import { REQUIRED_CAPABILITIES } from '../src/protocol.mjs';

function fixture() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const signingKeyId = publicKeyId(publicKey);
  const unsigned = {
    format: PHYSICAL_EVIDENCE_FORMAT,
    machineFingerprint: `cabinetmachine1_${'a'.repeat(64)}`,
    issuedAt: '2026-08-03T00:00:00.000Z',
    expiresAt: '2026-08-10T00:00:00.000Z',
    operator: 'physical-acceptance-fixture',
    records: REQUIRED_CAPABILITIES.map((capabilityId) => ({ capabilityId, status: 'passed', evidenceDigest: `evidence_${capabilityId}` })),
    signingKeyId,
  };
  return { publicKey, signed: signPhysicalEvidence(unsigned, privateKey), signingKeyId };
}

test('signed physical evidence admits exact machine and complete capability set', () => {
  const { publicKey, signed, signingKeyId } = fixture();
  const result = verifyPhysicalEvidence(signed, {
    trustedKeys: new Map([[signingKeyId, publicKey]]),
    expectedMachineFingerprint: signed.machineFingerprint,
    now: new Date('2026-08-04T00:00:00.000Z'),
  });
  assert.equal(result.status, 'admitted');
  assert.equal(result.records.size, REQUIRED_CAPABILITIES.length);
});

test('physical evidence refuses tamper, wrong machine, and missing capability', () => {
  const { publicKey, signed, signingKeyId } = fixture();
  const tampered = structuredClone(signed);
  tampered.records[0].evidenceDigest = 'changed';
  assert.equal(verifyPhysicalEvidence(tampered, { trustedKeys: new Map([[signingKeyId, publicKey]]), expectedMachineFingerprint: signed.machineFingerprint, now: new Date('2026-08-04T00:00:00Z') }).status, 'blocked');
  assert.equal(verifyPhysicalEvidence(signed, { trustedKeys: new Map([[signingKeyId, publicKey]]), expectedMachineFingerprint: `cabinetmachine1_${'b'.repeat(64)}`, now: new Date('2026-08-04T00:00:00Z') }).status, 'blocked');
  const incomplete = structuredClone(signed);
  incomplete.records.pop();
  assert.equal(verifyPhysicalEvidence(incomplete, { trustedKeys: new Map([[signingKeyId, publicKey]]), expectedMachineFingerprint: signed.machineFingerprint, now: new Date('2026-08-04T00:00:00Z') }).status, 'blocked');
});
