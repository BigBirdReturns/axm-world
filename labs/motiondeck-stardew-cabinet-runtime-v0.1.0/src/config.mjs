import os from 'node:os';
import path from 'node:path';
import { isPlainObject, readBoundedJson } from './core.mjs';

export const CONFIG_FORMAT = 'motiondeck-cabinet-config/1';

function defaultSocketPath() {
  return process.platform === 'win32'
    ? String.raw`\\.\pipe\BigBirdReturns.MotionDeckCabinetRuntime.v1`
    : path.join(os.tmpdir(), 'bigbirdreturns-motiondeck-cabinet-runtime-v1.sock');
}

function defaultStateRoot() {
  const base = process.platform === 'win32'
    ? (process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'))
    : (process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state'));
  return path.join(base, 'BigBirdReturns', 'MotionDeckCabinetRuntime');
}

export function defaultConfig(packageRoot = process.cwd()) {
  const stateRoot = defaultStateRoot();
  return {
    format: CONFIG_FORMAT,
    adapter: 'windows',
    stateRoot,
    ipc: {
      socketPath: defaultSocketPath(),
      tokenFile: path.join(stateRoot, 'ipc-token.txt'),
      maxConnections: 8,
      idleTimeoutMs: 10_000,
      maxMessageBytes: 256 * 1024,
    },
    evidence: {
      root: path.join(stateRoot, 'evidence'),
      maximumLedgerBytes: 32 * 1024 * 1024,
      maximumLedgerEntries: 100_000,
    },
    fixture: {
      frameWidth: 640,
      frameHeight: 360,
    },
    windows: {
      nativeProbePath: path.join(packageRoot, 'native', 'build', 'Release', 'motiondeck-openxr-probe.exe'),
      televisionDisplayId: null,
      physicalEvidencePath: null,
      trustedEvidenceKeys: {},
      hooks: {
        arm: null,
        disarm: null,
        recenter: null,
        controllerFallback: null,
        native2dFallback: null,
        rendererNative2d: null,
        rendererDesktop3d: null,
        rendererHmdVr: null,
        rendererCabinetTv: null,
        captureFrame: null,
      },
    },
  };
}

function mergeObject(base, overlay) {
  if (!isPlainObject(overlay)) return base;
  const output = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    if (isPlainObject(value) && isPlainObject(base[key])) output[key] = mergeObject(base[key], value);
    else output[key] = value;
  }
  return output;
}

export async function loadConfig({ packageRoot = process.cwd(), configPath = null, overrides = {} } = {}) {
  const base = defaultConfig(packageRoot);
  const fileConfig = configPath ? await readBoundedJson(configPath) : {};
  const merged = mergeObject(mergeObject(base, fileConfig), overrides);
  if (merged.format !== CONFIG_FORMAT) throw new Error(`Unsupported config format: ${merged.format}`);
  if (!['fixture', 'windows'].includes(merged.adapter)) throw new Error(`Unsupported adapter: ${merged.adapter}`);
  return merged;
}
