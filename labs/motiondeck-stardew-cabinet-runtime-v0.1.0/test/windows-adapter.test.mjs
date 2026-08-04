import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { WindowsAdapter } from '../src/adapters/windows.mjs';
import { temporaryRoot } from './helpers.mjs';

function makeAdapter(root, nativeProbePath) {
  return new WindowsAdapter({
    packageRoot: path.resolve(root),
    evidenceRoot: path.join(root, 'evidence'),
    config: { nativeProbePath, televisionDisplayId: null, physicalEvidencePath: null, trustedEvidenceKeys: {}, hooks: {} },
  });
}

test('missing native probe leaves unworn-HMD capability unavailable on every platform', async (t) => {
  const root = await temporaryRoot();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const probe = await makeAdapter(root, path.join(root, 'missing-probe.exe')).probe();
  const unworn = probe.capabilities.find((entry) => entry.id === 'openxr.tracking.unworn-hmd');
  assert.equal(unworn.status, 'unavailable');
  assert.notEqual(unworn.status, 'available');
});

test('native OpenXR discovery never self-promotes into unworn-HMD capability', { skip: process.platform === 'win32' }, async (t) => {
  const root = await temporaryRoot();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const native = path.join(root, 'probe.mjs');
  await fsp.writeFile(native, '#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({format:"motiondeck-openxr-native-probe/1",status:"passed",activeRuntimeManifest:"runtime.json",runtime:{name:"FixtureXR",version:"1.0.0"},extensions:["XR_MND_headless"],system:{available:true}}));\n', { mode: 0o700 });
  await fsp.chmod(native, 0o700);
  const probe = await makeAdapter(root, native).probe();
  const unworn = probe.capabilities.find((entry) => entry.id === 'openxr.tracking.unworn-hmd');
  assert.equal(unworn.status, 'degraded');
  assert.equal(unworn.evidenceTier, 'probed');
  assert.equal(unworn.details.note.includes('never prove'), true);
  assert.notEqual(unworn.status, 'available');
});
