import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import os from 'node:os';
import { digestObject, isPlainObject, parseBoundedJson, sha256Bytes, stableStringify } from './core.mjs';
import { REQUIRED_CAPABILITIES } from './protocol.mjs';

export const PHYSICAL_EVIDENCE_FORMAT = 'motiondeck-cabinet-physical-evidence/1';

export function publicKeyId(publicKey) {
  const key = publicKey?.type === 'public' ? publicKey : crypto.createPublicKey(publicKey);
  const der = key.export({ type: 'spki', format: 'der' });
  return `ed25519_${sha256Bytes(der)}`;
}

export function machineFingerprint(environment = {}) {
  const body = {
    platform: process.platform,
    arch: process.arch,
    hostname: os.hostname(),
    runtimeManifest: environment.runtimeManifest ?? null,
    runtimeName: environment.runtimeName ?? null,
    displayId: environment.displayId ?? null,
  };
  return digestObject(body, 'cabinetmachine1');
}

export function signPhysicalEvidence(unsigned, privateKey) {
  const body = { ...unsigned };
  delete body.signature;
  delete body.attestationDigest;
  body.attestationDigest = digestObject(body, 'physicalevidence1');
  const signature = crypto.sign(null, Buffer.from(stableStringify(body), 'utf8'), privateKey).toString('base64');
  return { ...body, signature };
}

export async function loadTrustedKeys(entries = {}) {
  const keys = new Map();
  for (const [declaredId, value] of Object.entries(entries || {})) {
    const pem = typeof value === 'string' && value.includes('BEGIN PUBLIC KEY')
      ? value
      : await fsp.readFile(value, 'utf8');
    const actualId = publicKeyId(pem);
    if (declaredId !== actualId) throw new Error(`Trusted key ID mismatch for ${declaredId}: ${actualId}`);
    keys.set(actualId, crypto.createPublicKey(pem));
  }
  return keys;
}

export function verifyPhysicalEvidence(document, { trustedKeys, expectedMachineFingerprint, now = new Date() }) {
  const findings = [];
  if (!isPlainObject(document) || document.format !== PHYSICAL_EVIDENCE_FORMAT) findings.push('format');
  if (document.machineFingerprint !== expectedMachineFingerprint) findings.push('machine-fingerprint');
  const issuedAt = Date.parse(document.issuedAt ?? '');
  const expiresAt = Date.parse(document.expiresAt ?? '');
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= issuedAt) findings.push('time-range');
  if (Number.isFinite(issuedAt) && issuedAt > now.getTime() + 5 * 60_000) findings.push('issued-in-future');
  if (Number.isFinite(expiresAt) && expiresAt < now.getTime()) findings.push('expired');
  if (!Array.isArray(document.records)) findings.push('records');
  const body = { ...document };
  delete body.signature;
  const expectedDigest = body.attestationDigest;
  delete body.attestationDigest;
  const actualDigest = digestObject(body, 'physicalevidence1');
  if (expectedDigest !== actualDigest) findings.push('digest');
  const key = trustedKeys.get(document.signingKeyId);
  if (!key) findings.push('untrusted-key');
  else {
    const signedBody = { ...body, attestationDigest: expectedDigest };
    let verified = false;
    try {
      verified = crypto.verify(null, Buffer.from(stableStringify(signedBody), 'utf8'), key, Buffer.from(document.signature ?? '', 'base64'));
    } catch {
      verified = false;
    }
    if (!verified) findings.push('signature');
  }

  const recordMap = new Map();
  for (const record of Array.isArray(document.records) ? document.records : []) {
    if (!isPlainObject(record) || !REQUIRED_CAPABILITIES.includes(record.capabilityId) || record.status !== 'passed') {
      findings.push('record');
      continue;
    }
    if (recordMap.has(record.capabilityId)) findings.push('duplicate-record');
    recordMap.set(record.capabilityId, record);
  }
  const missing = REQUIRED_CAPABILITIES.filter((id) => !recordMap.has(id));
  if (missing.length > 0) findings.push('missing-capabilities');
  return {
    status: findings.length === 0 ? 'admitted' : 'blocked',
    findings: [...new Set(findings)].sort(),
    records: recordMap,
    missingCapabilities: missing,
    attestationDigest: expectedDigest ?? null,
    signingKeyId: document.signingKeyId ?? null,
  };
}

export async function readAndVerifyPhysicalEvidence(filePath, options) {
  const text = await fsp.readFile(filePath, 'utf8');
  const document = parseBoundedJson(text, filePath);
  return { document, verification: verifyPhysicalEvidence(document, options) };
}
