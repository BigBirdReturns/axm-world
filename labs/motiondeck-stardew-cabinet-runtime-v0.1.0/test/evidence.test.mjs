import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { EvidenceLedger } from '../src/evidence.mjs';
import { temporaryRoot } from './helpers.mjs';

test('evidence ledger persists and verifies a hash chain', async (t) => {
  const root = await temporaryRoot();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const ledger = await new EvidenceLedger({ root }).open();
  const first = await ledger.append('one', 'passed', { token: 'secret', value: 1 }, { evidenceTier: 'synthetic' });
  const second = await ledger.append('two', 'passed', { value: 2 }, { evidenceTier: 'synthetic' });
  assert.equal(second.previousDigest, first.eventDigest);
  assert.equal(first.payload.token, '[REDACTED]');
  const reopened = await new EvidenceLedger({ root }).open();
  assert.equal(reopened.summary().entries, 2);
  assert.equal(reopened.summary().headDigest, second.eventDigest);
});

test('evidence ledger refuses tampering', async (t) => {
  const root = await temporaryRoot();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const ledger = await new EvidenceLedger({ root }).open();
  await ledger.append('one', 'passed', { value: 1 });
  const file = path.join(root, 'events.jsonl');
  const text = await fsp.readFile(file, 'utf8');
  await fsp.writeFile(file, text.replace('"value":1', '"value":2'));
  await assert.rejects(() => new EvidenceLedger({ root }).open(), /digest mismatch/);
});
