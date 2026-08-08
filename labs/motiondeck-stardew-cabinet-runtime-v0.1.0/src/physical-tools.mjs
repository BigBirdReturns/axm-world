import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { parseBoundedJson, writeJsonAtomic } from './core.mjs';
import { publicKeyId, signPhysicalEvidence, verifyPhysicalEvidence } from './attestation.mjs';

export async function generateEvidenceKeyPair({ privateKeyPath, publicKeyPath }) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  await fsp.mkdir(path.dirname(privateKeyPath), { recursive: true, mode: 0o700 });
  await fsp.mkdir(path.dirname(publicKeyPath), { recursive: true, mode: 0o700 });
  await fsp.writeFile(privateKeyPath, privatePem, { flag: 'wx', mode: 0o600 });
  await fsp.writeFile(publicKeyPath, publicPem, { flag: 'wx', mode: 0o644 });
  return { signingKeyId: publicKeyId(publicKey), privateKeyPath, publicKeyPath };
}

export async function signEvidenceFile({ inputPath, privateKeyPath, outputPath }) {
  const unsigned = parseBoundedJson(await fsp.readFile(inputPath, 'utf8'), inputPath);
  const privatePem = await fsp.readFile(privateKeyPath, 'utf8');
  const privateKey = crypto.createPrivateKey(privatePem);
  const signingKeyId = publicKeyId(crypto.createPublicKey(privateKey));
  const signed = signPhysicalEvidence({ ...unsigned, signingKeyId }, privateKey);
  await writeJsonAtomic(outputPath, signed);
  return { signingKeyId, attestationDigest: signed.attestationDigest, outputPath };
}

export async function verifyEvidenceFile({ inputPath, publicKeyPath, expectedMachineFingerprint, now = new Date() }) {
  const document = parseBoundedJson(await fsp.readFile(inputPath, 'utf8'), inputPath);
  const publicPem = await fsp.readFile(publicKeyPath, 'utf8');
  const publicKey = crypto.createPublicKey(publicPem);
  const signingKeyId = publicKeyId(publicKey);
  return verifyPhysicalEvidence(document, {
    trustedKeys: new Map([[signingKeyId, publicKey]]),
    expectedMachineFingerprint,
    now,
  });
}
