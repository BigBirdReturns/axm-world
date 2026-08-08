import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { inspectPng, writeDiagnosticPng } from '../src/png.mjs';
import { temporaryRoot } from './helpers.mjs';

test('diagnostic PNG is non-empty, dimensioned, and content-addressed', async (t) => {
  const root = await temporaryRoot();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const file = path.join(root, 'frame.png');
  const written = await writeDiagnosticPng(file, { width: 128, height: 96, seed: 7 });
  const inspected = await inspectPng(file);
  assert.equal(inspected.width, 128);
  assert.equal(inspected.height, 96);
  assert.equal(inspected.sha256, written.sha256);
  assert.ok(inspected.bytes > 1000);
});
