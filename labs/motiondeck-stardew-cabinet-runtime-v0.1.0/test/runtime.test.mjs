import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import test from 'node:test';
import { makeRequest } from '../src/protocol.mjs';
import { fixtureRuntime, temporaryRoot } from './helpers.mjs';

function request(token, operation, payload = {}, transactionId = null, options = {}) {
  return makeRequest(operation, payload, {
    token,
    transactionId,
    clientId: options.clientId ?? 'runtime-test',
    clientRole: options.clientRole ?? 'test',
    requestId: options.requestId,
  });
}

test('synthetic fixture arms only in synthetic mode and never emits authority', async (t) => {
  const root = await temporaryRoot();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const { runtime, token } = await fixtureRuntime(root);
  t.after(() => runtime.close());
  const transactionId = 'fixture-transaction';
  const refused = await runtime.handle(request(token, 'arm', { authorityMode: 'operational', leaseTtlMs: 2000 }, transactionId));
  assert.equal(refused.success, false);
  assert.equal(refused.code, 'arm.gate-blocked');
  const armed = await runtime.handle(request(token, 'arm', { authorityMode: 'synthetic', leaseTtlMs: 2000 }, transactionId));
  assert.equal(armed.success, true);
  assert.equal(armed.state.armed, true);
  assert.equal(armed.state.authority, 'none');
  assert.equal(armed.state.authorityMode, 'synthetic');
  const frame = await runtime.handle(request(token, 'capture-frame', { name: 'runtime' }, transactionId));
  assert.equal(frame.success, true);
  assert.equal(frame.payload.frame.width, 160);
  const disarmed = await runtime.handle(request(token, 'disarm', { reason: 'done' }, transactionId));
  assert.equal(disarmed.success, true);
  assert.equal(disarmed.state.armed, false);
});

test('request IDs are idempotent but collisions refuse', async (t) => {
  const root = await temporaryRoot();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const { runtime, token } = await fixtureRuntime(root);
  t.after(() => runtime.close());
  const firstRequest = request(token, 'probe', {}, null, { requestId: 'same-request' });
  const first = await runtime.handle(firstRequest);
  const second = await runtime.handle(firstRequest);
  assert.deepEqual(second, first);
  const collision = await runtime.handle({ ...firstRequest, operation: 'hello' });
  assert.equal(collision.success, false);
  assert.equal(collision.code, 'request.id-collision');
});

test('lease watchdog automatically disarms an abandoned synthetic transaction', async (t) => {
  const root = await temporaryRoot();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const { runtime, token, ledger } = await fixtureRuntime(root);
  t.after(() => runtime.close());
  const transactionId = 'lease-test';
  const armed = await runtime.handle(request(token, 'arm', { authorityMode: 'synthetic', leaseTtlMs: 1000 }, transactionId));
  assert.equal(armed.success, true);
  await new Promise((resolve) => setTimeout(resolve, 1300));
  assert.equal(runtime.snapshot().armed, false);
  assert.ok(ledger.tail(10).some((event) => event.kind === 'lease-expired' && event.status === 'passed'));
});

test('foreign adapter cannot disarm but operator can invoke fail-safe disarm', async (t) => {
  const root = await temporaryRoot();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const { runtime, token } = await fixtureRuntime(root);
  t.after(() => runtime.close());
  await runtime.handle(request(token, 'arm', { authorityMode: 'synthetic', leaseTtlMs: 5000 }, 'owner'));
  const refused = await runtime.handle(request(token, 'disarm', { reason: 'foreign' }, 'foreign', { clientRole: 'adapter' }));
  assert.equal(refused.success, false);
  assert.equal(refused.code, 'disarm.not-owner');
  const operator = await runtime.handle(request(token, 'disarm', { reason: 'fail-safe' }, 'foreign', { clientRole: 'operator' }));
  assert.equal(operator.success, true);
  assert.equal(operator.state.armed, false);
});
