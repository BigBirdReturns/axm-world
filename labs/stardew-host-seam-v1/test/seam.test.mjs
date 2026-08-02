import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildLaunchPlan,
  buildProfileLock,
  digestObject,
  inspectInstallation,
  makeReceipt,
  scanMods,
  snapshotSaves,
  stageProfile,
} from '../src/seam.mjs';

async function fixture() {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'stardew-seam-test-'));
  const gameDir = path.join(root, 'Stardew Valley');
  const modsDir = path.join(gameDir, 'Mods');
  const savesDir = path.join(root, 'Saves');
  await fsp.mkdir(modsDir, { recursive: true });
  await fsp.mkdir(savesDir, { recursive: true });
  await fsp.writeFile(path.join(gameDir, 'Stardew Valley.exe'), 'game');
  await fsp.writeFile(path.join(gameDir, 'StardewModdingAPI.exe'), 'smapi');

  async function addMod(folder, manifest, files = {}) {
    const modDir = path.join(modsDir, folder);
    await fsp.mkdir(modDir, { recursive: true });
    await fsp.writeFile(path.join(modDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    for (const [relative, content] of Object.entries(files)) {
      const target = path.join(modDir, relative);
      await fsp.mkdir(path.dirname(target), { recursive: true });
      await fsp.writeFile(target, content);
    }
    return modDir;
  }

  return {
    root,
    gameDir,
    modsDir,
    savesDir,
    addMod,
    async cleanup() {
      await fsp.rm(root, { recursive: true, force: true });
    },
  };
}

async function addCore(
  fx,
  { bridge = true, renderer = true, gmcm = true, cabinetAdapter = true } = {},
) {
  await fx.addMod(
    'ContentPatcher',
    {
      Name: 'Content Patcher',
      Author: 'Pathoschild',
      Version: '2.0.0',
      UniqueID: 'Pathoschild.ContentPatcher',
      EntryDll: 'ContentPatcher.dll',
      MinimumApiVersion: '4.0.0',
    },
    { 'ContentPatcher.dll': 'cp' },
  );
  if (gmcm) {
    await fx.addMod(
      'GMCM',
      {
        Name: 'Generic Mod Config Menu',
        Author: 'spacechase0',
        Version: '1.0.0',
        UniqueID: 'spacechase0.GenericModConfigMenu',
        EntryDll: 'GMCM.dll',
      },
      { 'GMCM.dll': 'gmcm' },
    );
  }
  if (renderer) {
    await fx.addMod(
      'Stardew3D',
      {
        Name: 'Stardew3D',
        Author: 'GingasVR',
        Version: '2.5.22',
        UniqueID: 'GingasVR.Stardew3D',
        EntryDll: 'Stardew3D.dll',
        Dependencies: [
          { UniqueID: 'spacechase0.GenericModConfigMenu', IsRequired: false },
        ],
      },
      { 'Stardew3D.dll': 'renderer' },
    );
  }
  if (bridge) {
    await fx.addMod(
      'RodohBridge',
      {
        Name: 'RODOH Stardew Bridge',
        Author: 'BigBirdReturns',
        Version: '0.1.0',
        UniqueID: 'BigBirdReturns.RodohStardewBridge',
        EntryDll: 'Rodoh.StardewBridge.dll',
        Dependencies: [{ UniqueID: 'GingasVR.Stardew3D', IsRequired: false }],
      },
      { 'Rodoh.StardewBridge.dll': 'bridge' },
    );
  }
  if (cabinetAdapter && renderer && bridge) {
    await fx.addMod(
      'RodohCabinetAdapterFixture',
      {
        Name: 'RODOH Stardew Cabinet Adapter (qualification fixture)',
        Author: 'BigBirdReturns',
        Version: '0.0.0-fixture',
        UniqueID: 'BigBirdReturns.RodohStardewCabinetAdapter',
        EntryDll: 'Rodoh.StardewCabinetAdapter.dll',
        Dependencies: [
          { UniqueID: 'GingasVR.Stardew3D', IsRequired: true },
          { UniqueID: 'BigBirdReturns.RodohStardewBridge', IsRequired: true },
        ],
      },
      { 'Rodoh.StardewCabinetAdapter.dll': 'fixture-cabinet-adapter' },
    );
  }
}

test('admits a complete host-native graph and all four modes', async () => {
  const fx = await fixture();
  try {
    await addCore(fx);
    await fx.addMod('Expansion/ExamplePack', {
      Name: 'Example expansion',
      Author: 'fixture',
      Version: '1.0.0',
      UniqueID: 'Fixture.ExamplePack',
      ContentPackFor: { UniqueID: 'Pathoschild.ContentPatcher' },
    });

    const inspection = await inspectInstallation({ gameDir: fx.gameDir, savesDir: fx.savesDir });
    assert.equal(inspection.status, 'admitted');
    assert.match(inspection.graph.digest, /^stardewgraph1_[a-f0-9]{64}$/);
    assert.ok(
      inspection.graph.loadOrder.indexOf('Pathoschild.ContentPatcher') <
        inspection.graph.loadOrder.indexOf('Fixture.ExamplePack'),
    );

    for (const mode of ['native-2d', 'desktop-3d', 'hmd-vr', 'cabinet-tv']) {
      const launch = buildLaunchPlan(inspection, { mode });
      assert.equal(launch.status, 'admitted', mode);
      assert.deepEqual(launch.args.slice(0, 1), ['--mods-path']);
      const lock = buildProfileLock(inspection, launch, { profileName: mode });
      assert.equal(lock.status, 'admitted');
      assert.match(lock.profileId, /^stardewprofile1_[a-f0-9]{64}$/);
    }
  } finally {
    await fx.cleanup();
  }
});

test('keeps cabinet-tv blocked until a dedicated renderer adapter is present', async () => {
  const fx = await fixture();
  try {
    await addCore(fx, { cabinetAdapter: false });
    const inspection = await inspectInstallation({ gameDir: fx.gameDir, savesDir: fx.savesDir });
    assert.equal(inspection.status, 'admitted');
    assert.equal(buildLaunchPlan(inspection, { mode: 'desktop-3d' }).status, 'admitted');
    assert.equal(buildLaunchPlan(inspection, { mode: 'hmd-vr' }).status, 'admitted');
    const cabinet = buildLaunchPlan(inspection, { mode: 'cabinet-tv' });
    assert.equal(cabinet.status, 'blocked');
    assert.equal(cabinet.cabinetAdapterPresent, false);
    assert.ok(cabinet.issues.some((item) => item.code === 'mode.cabinet-adapter-missing'));
  } finally {
    await fx.cleanup();
  }
});

test('refuses a missing required dependency but reports a missing optional dependency as info', async () => {
  const fx = await fixture();
  try {
    await fx.addMod(
      'Broken',
      {
        Name: 'Broken',
        Author: 'fixture',
        Version: '1.0.0',
        UniqueID: 'Fixture.Broken',
        EntryDll: 'Broken.dll',
        Dependencies: [
          { UniqueID: 'Fixture.Required', IsRequired: true },
          { UniqueID: 'Fixture.Optional', IsRequired: false },
        ],
      },
      { 'Broken.dll': 'broken' },
    );
    const inspection = await inspectInstallation({ gameDir: fx.gameDir, savesDir: fx.savesDir });
    assert.equal(inspection.status, 'blocked');
    assert.ok(inspection.issues.some((item) => item.code === 'graph.required-dependency-missing'));
    assert.ok(inspection.issues.some((item) => item.code === 'graph.optional-dependency-missing'));
  } finally {
    await fx.cleanup();
  }
});

test('refuses duplicate UniqueIDs and required dependency cycles', async () => {
  const fx = await fixture();
  try {
    await fx.addMod(
      'A',
      {
        Name: 'A',
        Author: 'fixture',
        Version: '1.0.0',
        UniqueID: 'Fixture.A',
        EntryDll: 'A.dll',
        Dependencies: [{ UniqueID: 'Fixture.B', IsRequired: true }],
      },
      { 'A.dll': 'a' },
    );
    await fx.addMod(
      'B',
      {
        Name: 'B',
        Author: 'fixture',
        Version: '1.0.0',
        UniqueID: 'Fixture.B',
        EntryDll: 'B.dll',
        Dependencies: [{ UniqueID: 'Fixture.A', IsRequired: true }],
      },
      { 'B.dll': 'b' },
    );
    await fx.addMod(
      'Duplicate',
      {
        Name: 'Duplicate A',
        Author: 'fixture',
        Version: '1.0.0',
        UniqueID: 'fixture.a',
        EntryDll: 'Duplicate.dll',
      },
      { 'Duplicate.dll': 'duplicate' },
    );
    await fx.addMod(
      'C',
      {
        Name: 'C',
        Author: 'fixture',
        Version: '1.0.0',
        UniqueID: 'Fixture.C',
        EntryDll: 'C.dll',
        Dependencies: [{ UniqueID: 'Fixture.D', IsRequired: true }],
      },
      { 'C.dll': 'c' },
    );
    await fx.addMod(
      'D',
      {
        Name: 'D',
        Author: 'fixture',
        Version: '1.0.0',
        UniqueID: 'Fixture.D',
        EntryDll: 'D.dll',
        Dependencies: [{ UniqueID: 'Fixture.C', IsRequired: true }],
      },
      { 'D.dll': 'd' },
    );
    const inspection = await inspectInstallation({ gameDir: fx.gameDir, savesDir: fx.savesDir });
    assert.equal(inspection.status, 'blocked');
    assert.ok(inspection.issues.some((item) => item.code === 'graph.duplicate-unique-id'));
    assert.ok(inspection.issues.some((item) => item.code === 'graph.required-dependency-cycle'));
  } finally {
    await fx.cleanup();
  }
});

test('refuses the known Stardew3DVR and Clear Glasses renderer collision', async () => {
  const fx = await fixture();
  try {
    await addCore(fx);
    await fx.addMod(
      'ClearGlasses',
      {
        Name: 'Clear Glasses',
        Author: 'aurpine',
        Version: '0.4.2',
        UniqueID: 'aurpine.ClearGlasses',
        EntryDll: 'ClearGlasses.dll',
      },
      { 'ClearGlasses.dll': 'clear' },
    );
    const inspection = await inspectInstallation({ gameDir: fx.gameDir, savesDir: fx.savesDir });
    assert.equal(inspection.status, 'blocked');
    assert.ok(inspection.issues.some((item) => item.code === 'renderer-conflict.clear-glasses'));
  } finally {
    await fx.cleanup();
  }
});

test('admits native 2D without a renderer and blocks renderer-dependent modes', async () => {
  const fx = await fixture();
  try {
    await addCore(fx, { renderer: false, bridge: false });
    const inspection = await inspectInstallation({ gameDir: fx.gameDir, savesDir: fx.savesDir });
    assert.equal(inspection.status, 'admitted');
    assert.equal(buildLaunchPlan(inspection, { mode: 'native-2d' }).status, 'admitted');
    assert.equal(buildLaunchPlan(inspection, { mode: 'desktop-3d' }).status, 'blocked');
    assert.equal(buildLaunchPlan(inspection, { mode: 'hmd-vr' }).status, 'blocked');
    assert.equal(buildLaunchPlan(inspection, { mode: 'cabinet-tv' }).status, 'blocked');
  } finally {
    await fx.cleanup();
  }
});

test('refuses a manifest EntryDll path escape', async () => {
  const fx = await fixture();
  try {
    await fsp.writeFile(path.join(fx.gameDir, 'Outside.dll'), 'outside');
    await fx.addMod('Escape', {
      Name: 'Escape',
      Author: 'fixture',
      Version: '1.0.0',
      UniqueID: 'Fixture.Escape',
      EntryDll: '../../Outside.dll',
    });
    const scan = await scanMods(fx.modsDir);
    assert.ok(scan.issues.some((item) => item.code === 'manifest.entry-dll-path-escape'));
  } finally {
    await fx.cleanup();
  }
});

test('stages an isolated verified-copy profile without mutating source mods', async () => {
  const fx = await fixture();
  try {
    await addCore(fx);
    await fx.addMod(
      'Bundle',
      {
        Name: 'Bundle Host',
        Author: 'fixture',
        Version: '1.0.0',
        UniqueID: 'Fixture.BundleHost',
        EntryDll: 'BundleHost.dll',
      },
      { 'BundleHost.dll': 'bundle-host' },
    );
    await fx.addMod('Bundle/Pack', {
      Name: 'Nested Pack',
      Author: 'fixture',
      Version: '1.0.0',
      UniqueID: 'Fixture.NestedPack',
      ContentPackFor: { UniqueID: 'Fixture.BundleHost' },
    });
    const profileDir = path.join(fx.root, 'profiles', 'family');
    const before = await fsp.readFile(path.join(fx.modsDir, 'Stardew3D', 'manifest.json'), 'utf8');
    const receipt = await stageProfile({
      sourceModsDir: fx.modsDir,
      profileDir,
      mode: 'desktop-3d',
    });
    assert.equal(receipt.kind, 'profile-staged');
    assert.equal(await fsp.readFile(path.join(fx.modsDir, 'Stardew3D', 'manifest.json'), 'utf8'), before);
    assert.ok(await fsp.stat(path.join(profileDir, 'profile.lock.json')));
    const profileLock = JSON.parse(await fsp.readFile(path.join(profileDir, 'profile.lock.json'), 'utf8'));
    assert.equal(profileLock.custody.materialization, 'verified-copy');
    assert.ok(await fsp.stat(path.join(profileDir, 'Mods', 'Bundle', 'Pack', 'manifest.json')));
    const staged = await inspectInstallation({
      gameDir: fx.gameDir,
      modsDir: path.join(profileDir, 'Mods'),
      savesDir: fx.savesDir,
    });
    assert.equal(staged.status, 'admitted');
  } finally {
    await fx.cleanup();
  }
});

test('creates a content-addressed save snapshot without changing the source save', async () => {
  const fx = await fixture();
  try {
    const save = path.join(fx.savesDir, 'Farm_123');
    await fsp.mkdir(save, { recursive: true });
    await fsp.writeFile(path.join(save, 'SaveGameInfo'), '<save>fixture</save>');
    await fsp.writeFile(path.join(save, 'Farm_123'), '<farm>fixture</farm>');
    const backupRoot = path.join(fx.root, 'backups');
    const snapshot = await snapshotSaves({
      savesDir: fx.savesDir,
      backupRoot,
      generatedAt: '2026-08-02T12:00:00.000Z',
    });
    assert.match(snapshot.snapshotId, /^stardewsave1_[a-f0-9]{64}$/);
    assert.equal(snapshot.fileCount, 2);
    assert.equal(await fsp.readFile(path.join(save, 'Farm_123'), 'utf8'), '<farm>fixture</farm>');
    assert.ok(await fsp.stat(path.join(snapshot.snapshotDir, 'snapshot.receipt.json')));
  } finally {
    await fx.cleanup();
  }
});

test('receipt and object digests are deterministic for equal authority', () => {
  const payloadA = { b: [2, 1], a: { z: true, x: 'value' } };
  const payloadB = { a: { x: 'value', z: true }, b: [2, 1] };
  assert.equal(digestObject(payloadA), digestObject(payloadB));
  const first = makeReceipt('fixture', payloadA, { generatedAt: '2026-01-01T00:00:00.000Z' });
  const second = makeReceipt('fixture', payloadB, { generatedAt: '2027-01-01T00:00:00.000Z' });
  assert.equal(first.receiptId, second.receiptId);
  assert.notEqual(first.generatedAt, second.generatedAt);
});

test('refuses an installed dependency below the declared minimum version', async () => {
  const fx = await fixture();
  try {
    await fx.addMod(
      'Framework',
      {
        Name: 'Framework',
        Author: 'fixture',
        Version: '1.4.9',
        UniqueID: 'Fixture.Framework',
        EntryDll: 'Framework.dll',
      },
      { 'Framework.dll': 'framework' },
    );
    await fx.addMod(
      'Consumer',
      {
        Name: 'Consumer',
        Author: 'fixture',
        Version: '1.0.0',
        UniqueID: 'Fixture.Consumer',
        EntryDll: 'Consumer.dll',
        Dependencies: [
          {
            UniqueID: 'Fixture.Framework',
            MinimumVersion: '1.5.0',
            IsRequired: true
          }
        ]
      },
      { 'Consumer.dll': 'consumer' },
    );
    const inspection = await inspectInstallation({ gameDir: fx.gameDir, savesDir: fx.savesDir });
    assert.equal(inspection.status, 'blocked');
    assert.ok(inspection.issues.some((item) => item.code === 'graph.dependency-version-too-old'));
  } finally {
    await fx.cleanup();
  }
});

test(
  'refuses uninspected symlinks in the selected Mods custody graph',
  { skip: process.platform === 'win32' },
  async () => {
    const fx = await fixture();
    try {
      await addCore(fx);
      const outside = path.join(fx.root, 'outside.txt');
      await fsp.writeFile(outside, 'outside');
      await fsp.symlink(outside, path.join(fx.modsDir, 'Stardew3D', 'outside-link.txt'));
      const inspection = await inspectInstallation({ gameDir: fx.gameDir, savesDir: fx.savesDir });
      assert.equal(inspection.status, 'blocked');
      assert.ok(inspection.issues.some((item) => item.code === 'mods.symlink-unadmitted'));
    } finally {
      await fx.cleanup();
    }
  },
);

test('ignores dot-prefixed disabled mod folders to match SMAPI active-graph behavior', async () => {
  const fx = await fixture();
  try {
    await addCore(fx);
    await fx.addMod(
      '.disabled-clear-glasses',
      {
        Name: 'Disabled Clear Glasses',
        Author: 'fixture',
        Version: '0.4.2',
        UniqueID: 'aurpine.ClearGlasses',
        EntryDll: 'ClearGlasses.dll'
      },
      { 'ClearGlasses.dll': 'disabled' },
    );
    const inspection = await inspectInstallation({ gameDir: fx.gameDir, savesDir: fx.savesDir });
    assert.equal(inspection.status, 'admitted');
    assert.equal(inspection.graph.nodes.some((node) => node.uniqueId === 'aurpine.ClearGlasses'), false);
    assert.ok(inspection.issues.some((item) => item.code === 'mods.dot-folders-disabled'));
  } finally {
    await fx.cleanup();
  }
});
