import assert from 'node:assert/strict';
import test from 'node:test';
import { makeRequest, normalizeArmPayload, validateProbe, validateRequest, PROBE_FORMAT, PROVIDER_ID, PROVIDER_VERSION, REQUIRED_CAPABILITIES } from '../src/protocol.mjs';

const token = 'a'.repeat(43);

test('authenticated requests normalize and stale or unknown clients refuse', () => {
  const request = makeRequest('probe', {}, { token, clientRole: 'operator' });
  assert.equal(validateRequest(request, token).status, 'admitted');
  assert.equal(validateRequest({ ...request, auth: { token: 'b'.repeat(43) } }, token).status, 'blocked');
  assert.equal(validateRequest({ ...request, client: { ...request.client, role: 'root' } }, token).status, 'blocked');
  assert.equal(validateRequest({ ...request, sentAt: '2000-01-01T00:00:00.000Z' }, token).status, 'blocked');
});

test('arm payload is bounded and authority modes are explicit', () => {
  assert.equal(normalizeArmPayload({ authorityMode: 'synthetic', leaseTtlMs: 1000 }).authorityMode, 'synthetic');
  assert.throws(() => normalizeArmPayload({ authorityMode: 'magic' }), /Unsupported authorityMode/);
  assert.throws(() => normalizeArmPayload({ leaseTtlMs: 1 }), /between 1000 and 60000/);
});

test('probe validation requires exact provider and every required capability', () => {
  const probe = validateProbe({
    format: PROBE_FORMAT,
    providerId: PROVIDER_ID,
    providerVersion: PROVIDER_VERSION,
    environment: { hmdWornRequired: false },
    capabilities: REQUIRED_CAPABILITIES.map((id) => ({ id, status: 'available', evidenceTier: 'synthetic', source: 'test' })),
  });
  assert.equal(probe.status, 'admitted');
  assert.deepEqual(probe.missingCapabilities, []);
  const missing = validateProbe({ ...probe, capabilities: probe.capabilities.slice(1) });
  assert.equal(missing.status, 'blocked');
});
