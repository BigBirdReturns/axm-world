import assert from 'node:assert/strict';
import test from 'node:test';
import { boundedInteger, boundedString, digestObject, parseBoundedJson, redactObject, stableStringify } from '../src/core.mjs';

test('stable object digests ignore key insertion order', () => {
  assert.equal(stableStringify({ b: 2, a: 1 }), stableStringify({ a: 1, b: 2 }));
  assert.equal(digestObject({ b: 2, a: 1 }), digestObject({ a: 1, b: 2 }));
});

test('bounded JSON and scalar helpers fail closed', () => {
  assert.deepEqual(parseBoundedJson('{"ok":true}'), { ok: true });
  assert.throws(() => parseBoundedJson('{'), /invalid JSON/);
  assert.equal(boundedString(' x ', 'name'), 'x');
  assert.throws(() => boundedString('', 'name'), /must not be empty/);
  assert.equal(boundedInteger(5, 'count', 1, 10), 5);
  assert.throws(() => boundedInteger(11, 'count', 1, 10), /between 1 and 10/);
});

test('credential-like values are redacted recursively', () => {
  assert.deepEqual(redactObject({ token: 'x', nested: { Password: 'y', value: 3 } }), {
    token: '[REDACTED]', nested: { Password: '[REDACTED]', value: 3 },
  });
});
