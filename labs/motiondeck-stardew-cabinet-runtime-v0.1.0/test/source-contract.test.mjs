import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('SMAPI provider API is one JSON string method with no provider-owned record parameters', async () => {
  const provider = await fsp.readFile(path.join(root, 'smapi', 'MotionDeck.CabinetRuntimeProvider', 'RuntimeApi.cs'), 'utf8');
  const consumer = await fsp.readFile(path.join(root, 'smapi', 'Rodoh.StardewCabinetAdapter.v0.2', 'RuntimeApi.cs'), 'utf8');
  assert.match(provider, /public string Invoke\(string requestJson\)/);
  assert.match(consumer, /string Invoke\(string requestJson\)/);
  assert.doesNotMatch(provider + consumer, /CabinetArmRequest|CabinetRuntimeState|CabinetProbe/);
});

test('native build pins exact OpenXR SDK 1.1.62 source commit and does not claim physical authority', async () => {
  const cmake = await fsp.readFile(path.join(root, 'native', 'CMakeLists.txt'), 'utf8');
  const source = await fsp.readFile(path.join(root, 'native', 'src', 'main.cpp'), 'utf8');
  assert.match(cmake, /GIT_TAG 57af7fc61f9f2d492580cb28aab6d0ea59d8d417/);
  assert.match(source, /provesUnwornHmdTracking\\\":false/);
  assert.match(source, /productAuthority\\\":\\\"none/);
});

test('all JSON protocol and configuration files parse', async () => {
  const files = [];
  for (const directory of ['config', 'protocol']) {
    for (const name of await fsp.readdir(path.join(root, directory))) if (name.endsWith('.json')) files.push(path.join(root, directory, name));
  }
  for (const file of files) {
    const text = await fsp.readFile(file, 'utf8');
    assert.doesNotThrow(() => JSON.parse(text), file);
  }
});
