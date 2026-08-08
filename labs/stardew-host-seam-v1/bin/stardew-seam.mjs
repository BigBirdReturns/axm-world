#!/usr/bin/env node
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_POLICY,
  MODES,
  buildLaunchPlan,
  buildProfileLock,
  discoverInstallations,
  inspectInstallation,
  makeReceipt,
  selftestFixture,
  snapshotSaves,
  stageProfile,
  writeResult,
} from '../src/seam.mjs';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const COMMANDS = new Set([
  'discover',
  'inspect',
  'qualify',
  'plan',
  'stage-profile',
  'snapshot-saves',
  'catalog',
  'selftest',
  'help',
]);

function usage() {
  return `Stardew Host Seam v0.1.0

Usage:
  stardew-seam discover [--out FILE]
  stardew-seam inspect --game-dir DIR [--mods-dir DIR] [--saves-dir DIR] [--deep-hash] [--out FILE]
  stardew-seam qualify --game-dir DIR [--mods-dir DIR] [--mode MODE] [--profile NAME] [--out FILE]
  stardew-seam plan --game-dir DIR [--mods-dir DIR] [--mode MODE] [--receipts-dir DIR] [--out FILE]
  stardew-seam stage-profile --game-dir DIR --source-mods-dir DIR --profile-dir DIR [--mode MODE] [--deep-hash]
  stardew-seam snapshot-saves --saves-dir DIR --backup-root DIR [--out FILE]
  stardew-seam catalog [--out FILE]
  stardew-seam selftest [--out FILE]

Modes:
  ${MODES.join(', ')}

Exit codes:
  0 completed/admitted
  1 execution failure
  2 blocked by discovered state
  64 invalid command line
`;
}

function parseArgs(argv) {
  const [command = 'help', ...rest] = argv;
  if (!COMMANDS.has(command)) {
    throw Object.assign(new Error(`Unknown command: ${command}`), { exitCode: 64 });
  }

  const options = { _: [] };
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) {
      options._.push(token);
      continue;
    }
    const name = token.slice(2);
    if (name === 'deep-hash' || name === 'json') {
      options[name] = true;
      continue;
    }
    const value = rest[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw Object.assign(new Error(`Option --${name} requires a value.`), { exitCode: 64 });
    }
    options[name] = value;
    index += 1;
  }
  return { command, options };
}

function required(options, name) {
  const value = options[name];
  if (!value) {
    throw Object.assign(new Error(`Missing required option --${name}.`), { exitCode: 64 });
  }
  return value;
}

function selectedMode(options) {
  const mode = options.mode ?? 'desktop-3d';
  if (!MODES.includes(mode)) {
    throw Object.assign(new Error(`Invalid --mode ${mode}. Expected: ${MODES.join(', ')}`), {
      exitCode: 64,
    });
  }
  return mode;
}

async function emit(value, options) {
  if (options.out) await writeResult(options.out, value);
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (command === 'help') {
    process.stdout.write(usage());
    return 0;
  }

  if (command === 'discover') {
    const installations = await discoverInstallations();
    const result = makeReceipt('installation-discovery', { installations });
    await emit(result, options);
    return installations.length > 0 ? 0 : 2;
  }

  if (command === 'catalog') {
    const [floor, ecosystem] = await Promise.all([
      fsp.readFile(path.join(PACKAGE_ROOT, 'config', 'stardew-seam-floor.json'), 'utf8').then(JSON.parse),
      fsp.readFile(path.join(PACKAGE_ROOT, 'config', 'ecosystem-map.json'), 'utf8').then(JSON.parse),
    ]);
    const result = {
      format: 'rodoh-stardew-upstream-catalog/1',
      policy: DEFAULT_POLICY,
      modes: MODES,
      floor,
      ecosystem,
    };
    await emit(result, options);
    return 0;
  }

  if (command === 'selftest') {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'stardew-seam-selftest-'));
    try {
      const result = await selftestFixture(root);
      const receipt = makeReceipt('selftest', {
        rootWasTemporary: true,
        inspectionStatus: result.inspection.status,
        launchStatus: result.launch.status,
        profileStatus: result.profile.status,
        graphDigest: result.inspection.graph.digest,
        profileId: result.profile.profileId,
      });
      await emit(receipt, options);
      return result.profile.status === 'admitted' ? 0 : 2;
    } finally {
      await fsp.rm(root, { recursive: true, force: true });
    }
  }

  if (command === 'snapshot-saves') {
    const snapshot = await snapshotSaves({
      savesDir: required(options, 'saves-dir'),
      backupRoot: required(options, 'backup-root'),
    });
    await emit(snapshot, options);
    return 0;
  }

  if (command === 'stage-profile') {
    const gameDir = required(options, 'game-dir');
    const sourceModsDir = required(options, 'source-mods-dir');
    const profileDir = required(options, 'profile-dir');
    const mode = selectedMode(options);
    const inspection = await inspectInstallation({
      gameDir,
      modsDir: sourceModsDir,
      deepHash: options['deep-hash'] === true,
    });
    const launch = buildLaunchPlan(inspection, {
      mode,
      modsDir: path.join(path.resolve(profileDir), 'Mods'),
    });
    const lock = buildProfileLock(inspection, launch, {
      profileName: options.profile ?? path.basename(path.resolve(profileDir)),
      profileModsDir: path.join(path.resolve(profileDir), 'Mods'),
      materialization: 'verified-copy',
    });
    if (lock.status !== 'admitted') {
      await emit(makeReceipt('profile-stage-refused', { profileDir, lock }), options);
      return 2;
    }
    const receipt = await stageProfile({
      sourceModsDir,
      profileDir,
      mode,
      profileLock: lock,
      deepHash: options['deep-hash'] === true,
    });
    await emit(receipt, options);
    return 0;
  }

  const gameDir = required(options, 'game-dir');
  const inspection = await inspectInstallation({
    gameDir,
    modsDir: options['mods-dir'],
    savesDir: options['saves-dir'],
    deepHash: options['deep-hash'] === true,
  });

  if (command === 'inspect') {
    const receipt = makeReceipt('inspection', inspection);
    await emit(receipt, options);
    return inspection.status === 'admitted' ? 0 : 2;
  }

  const mode = selectedMode(options);
  const launch = buildLaunchPlan(inspection, {
    mode,
    modsDir: options['mods-dir'],
    receiptsDir: options['receipts-dir'],
  });

  if (command === 'plan') {
    const receipt = makeReceipt('launch-plan', launch);
    await emit(receipt, options);
    return launch.status === 'admitted' ? 0 : 2;
  }

  if (command === 'qualify') {
    const lock = buildProfileLock(inspection, launch, {
      profileName: options.profile ?? 'stardew-default',
    });
    const receipt = makeReceipt('qualification', lock);
    await emit(receipt, options);
    return lock.status === 'admitted' ? 0 : 2;
  }

  throw Object.assign(new Error(`Unhandled command: ${command}`), { exitCode: 64 });
}

main()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error) => {
    process.stderr.write(`stardew-seam: ${error.message}\n`);
    if (process.env.RODOH_STARDEW_DEBUG === '1' && error.stack) {
      process.stderr.write(`${error.stack}\n`);
    }
    process.exitCode = error.exitCode ?? 1;
  });
