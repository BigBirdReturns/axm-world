import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { digestObject, parseBoundedJson, pathExists } from '../core.mjs';
import { loadTrustedKeys, machineFingerprint, readAndVerifyPhysicalEvidence } from '../attestation.mjs';
import { PROBE_FORMAT, PROVIDER_ID, PROVIDER_VERSION, REQUIRED_CAPABILITIES } from '../protocol.mjs';
import { inspectPng } from '../png.mjs';
import { normalizeHook, runHook } from '../hooks.mjs';

const MAX_PROBE_OUTPUT = 1024 * 1024;

async function runProgram(executable, args, timeoutMs = 15_000) {
  return await new Promise((resolve) => {
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let settled = false;
    const child = spawn(executable, args, { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const append = (current, chunk) => {
      const combined = Buffer.concat([current, chunk]);
      return combined.length > MAX_PROBE_OUTPUT ? combined.subarray(combined.length - MAX_PROBE_OUTPUT) : combined;
    };
    child.stdout.on('data', (chunk) => { stdout = append(stdout, chunk); });
    child.stderr.on('data', (chunk) => { stderr = append(stderr, chunk); });
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ...result, stdout: stdout.toString('utf8'), stderr: stderr.toString('utf8') });
    };
    child.on('error', (error) => finish({ success: false, code: 'spawn-failed', message: error.message, exitCode: null }));
    child.on('close', (exitCode, signal) => finish({ success: exitCode === 0, code: exitCode === 0 ? 'passed' : 'failed', message: `Process exited with ${exitCode ?? signal}.`, exitCode, signal }));
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish({ success: false, code: 'timeout', message: `Process exceeded ${timeoutMs} ms.`, exitCode: null });
    }, timeoutMs);
    timer.unref?.();
  });
}

async function nativeProbe(filePath) {
  if (!filePath || !(await pathExists(filePath))) return { status: 'unavailable', reason: 'native-probe-missing', path: filePath ?? null };
  const result = await runProgram(filePath, ['--probe']);
  if (!result.success) return { status: 'unavailable', reason: result.code, path: filePath, stderr: result.stderr.slice(0, 4096) };
  try {
    const parsed = parseBoundedJson(result.stdout, 'native OpenXR probe output', MAX_PROBE_OUTPUT);
    return { ...parsed, status: parsed.status === 'passed' ? 'available' : 'degraded', nativeStatus: parsed.status, path: filePath };
  } catch (error) {
    return { status: 'unavailable', reason: 'native-probe-invalid-json', path: filePath, error: error.message };
  }
}

async function probeDisplays(packageRoot) {
  if (process.platform !== 'win32') return { status: 'unavailable', reason: 'windows-only', displays: [] };
  const script = path.join(packageRoot, 'powershell', 'Probe-Displays.ps1');
  const shell = process.env.PWSH_EXE || 'pwsh.exe';
  let result = await runProgram(shell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', script]);
  if (!result.success && shell === 'pwsh.exe') result = await runProgram('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script]);
  if (!result.success) return { status: 'unavailable', reason: result.code, displays: [], stderr: result.stderr.slice(0, 4096) };
  try {
    const parsed = parseBoundedJson(result.stdout, 'display probe output', MAX_PROBE_OUTPUT);
    return { status: 'available', ...parsed };
  } catch (error) {
    return { status: 'unavailable', reason: 'display-probe-invalid-json', displays: [], error: error.message };
  }
}

function capability(id, status, evidenceTier, source, details = {}) {
  return {
    id,
    status,
    evidenceTier,
    source,
    evidenceDigest: digestObject({ id, status, evidenceTier, source, details }, 'cabinetcapability1'),
    details,
  };
}

export class WindowsAdapter {
  constructor({ packageRoot, evidenceRoot, config }) {
    this.kind = 'windows';
    this.packageRoot = packageRoot;
    this.evidenceRoot = evidenceRoot;
    this.config = config;
    this.events = [];
    this.armed = false;
    this.transactionId = null;
    this.activeFallback = null;
    this.rendererModeValue = 'native-2d';
    this.originVersion = 0;
    this.lastProbe = null;
    this.physicalVerification = null;
  }

  #event(kind, payload = {}) {
    const event = { kind, observedAt: new Date().toISOString(), payload };
    this.events.push(event);
    return event;
  }

  #hook(name) {
    return this.config.hooks?.[name] ?? null;
  }

  async probe() {
    const openxr = await nativeProbe(this.config.nativeProbePath);
    const displayProbe = await probeDisplays(this.packageRoot);
    const selectedDisplay = Array.isArray(displayProbe.displays)
      ? displayProbe.displays.find((display) => display.id === this.config.televisionDisplayId) ?? null
      : null;
    const environment = {
      platform: process.platform,
      architecture: process.arch,
      hostname: os.hostname(),
      runtimeManifest: openxr.activeRuntimeManifest ?? null,
      runtimeName: openxr.runtime?.name ?? null,
      runtimeVersion: openxr.runtime?.version ?? null,
      headlessExtensionAvailable: openxr.extensions?.includes?.('XR_MND_headless') === true,
      hmdSystemAvailable: openxr.system?.available === true,
      hmdWornRequired: null,
      displayId: selectedDisplay?.id ?? this.config.televisionDisplayId ?? null,
      selectedDisplay,
      displays: displayProbe.displays ?? [],
      hooks: Object.fromEntries(Object.keys(this.config.hooks ?? {}).map((name) => [name, Boolean(this.#hook(name))])),
      nativeProbe: openxr,
    };
    environment.machineFingerprint = machineFingerprint(environment);

    const capabilities = [
      capability('openxr.tracking.unworn-hmd', openxr.status === 'available' ? 'degraded' : 'unavailable', openxr.status === 'available' ? 'probed' : 'declared', 'openxr-native-probe', {
        runtimeDiscovered: openxr.status === 'available',
        headlessExtensionAvailable: environment.headlessExtensionAvailable,
        hmdSystemAvailable: environment.hmdSystemAvailable,
        note: 'Runtime discovery and XR_MND_headless never prove unworn-HMD tracking.',
      }),
      capability('display.television.monoscopic', selectedDisplay ? 'degraded' : 'unavailable', selectedDisplay ? 'probed' : 'declared', 'windows-display-probe', { selectedDisplay }),
      capability('input.quest-controller', 'unavailable', 'declared', 'physical-evidence-required', { note: 'A real tracked-input round trip is required.' }),
      capability('input.gamepad-fallback', this.#hook('controllerFallback') ? 'degraded' : 'unavailable', this.#hook('controllerFallback') ? 'probed' : 'declared', 'configured-hook', { configured: Boolean(this.#hook('controllerFallback')) }),
      capability('presentation.native-2d-fallback', this.#hook('native2dFallback') ? 'degraded' : 'unavailable', this.#hook('native2dFallback') ? 'probed' : 'declared', 'configured-hook', { configured: Boolean(this.#hook('native2dFallback')) }),
      capability('tracking.recenter', this.#hook('recenter') ? 'degraded' : 'unavailable', this.#hook('recenter') ? 'probed' : 'declared', 'configured-hook', { configured: Boolean(this.#hook('recenter')) }),
      capability('evidence.frame-capture', this.#hook('captureFrame') ? 'degraded' : 'unavailable', this.#hook('captureFrame') ? 'probed' : 'declared', 'configured-hook', { configured: Boolean(this.#hook('captureFrame')) }),
    ];

    this.physicalVerification = null;
    if (this.config.physicalEvidencePath) {
      try {
        const trustedKeys = await loadTrustedKeys(this.config.trustedEvidenceKeys ?? {});
        const verified = await readAndVerifyPhysicalEvidence(this.config.physicalEvidencePath, {
          trustedKeys,
          expectedMachineFingerprint: environment.machineFingerprint,
        });
        this.physicalVerification = verified.verification;
        if (verified.verification.status === 'admitted') {
          for (const entry of capabilities) {
            const record = verified.verification.records.get(entry.id);
            if (!record) continue;
            entry.status = 'available';
            entry.evidenceTier = 'physical';
            entry.source = 'signed-physical-evidence';
            entry.evidenceDigest = record.evidenceDigest;
            entry.details = { ...entry.details, physicalRecord: record };
          }
          environment.hmdWornRequired = false;
        }
      } catch (error) {
        this.physicalVerification = { status: 'blocked', findings: ['read-failed'], error: error.message };
      }
    }

    this.lastProbe = {
      format: PROBE_FORMAT,
      providerId: PROVIDER_ID,
      providerVersion: PROVIDER_VERSION,
      adapterKind: this.kind,
      environment,
      capabilities,
      physicalEvidence: this.physicalVerification,
    };
    return this.lastProbe;
  }

  async #execute(name, environment = {}) {
    const result = await runHook(this.#hook(name), { name, environment });
    this.#event('hook', { name, result });
    return result;
  }

  async arm(request) {
    const result = await this.#execute('arm', {
      MOTIONDECK_TRANSACTION_ID: request.transactionId,
      MOTIONDECK_AUTHORITY_MODE: request.authorityMode,
      MOTIONDECK_DISPLAY_ROLE: request.displayRole,
      MOTIONDECK_TRACKING_ROLE: request.trackingRole,
    });
    if (!result.success) return { ...result, state: this.state() };
    this.armed = true;
    this.transactionId = request.transactionId;
    this.activeFallback = null;
    this.rendererModeValue = 'cabinet-tv';
    return { success: true, code: 'windows.arm-passed', message: 'Configured cabinet arm transaction completed.', state: this.state(), hook: result };
  }

  async disarm({ transactionId, reason }) {
    const result = await this.#execute('disarm', {
      MOTIONDECK_TRANSACTION_ID: transactionId ?? this.transactionId ?? '',
      MOTIONDECK_REASON: reason ?? 'unspecified',
    });
    if (!result.success && this.armed) return { ...result, state: this.state() };
    this.armed = false;
    this.transactionId = null;
    this.activeFallback = 'native-2d';
    this.rendererModeValue = 'native-2d';
    return { success: true, code: 'windows.disarm-passed', message: 'Configured cabinet disarm transaction completed.', state: this.state(), hook: result };
  }

  async recenter({ transactionId }) {
    if (!this.armed || transactionId !== this.transactionId) return { success: false, code: 'windows.not-armed', message: 'Cabinet runtime is not armed for this transaction.', state: this.state() };
    const result = await this.#execute('recenter', { MOTIONDECK_TRANSACTION_ID: transactionId });
    if (result.success) this.originVersion += 1;
    return { ...result, code: result.success ? 'windows.recenter-passed' : result.code, state: this.state() };
  }

  async selectFallback({ transactionId, fallback }) {
    if (!this.armed || transactionId !== this.transactionId) return { success: false, code: 'windows.not-armed', message: 'Cabinet runtime is not armed for this transaction.', state: this.state() };
    const hookName = fallback === 'controller' ? 'controllerFallback' : 'native2dFallback';
    const result = await this.#execute(hookName, { MOTIONDECK_TRANSACTION_ID: transactionId, MOTIONDECK_FALLBACK: fallback });
    if (result.success) {
      this.activeFallback = fallback;
      if (fallback === 'native-2d') this.rendererModeValue = 'native-2d';
    }
    return { ...result, code: result.success ? 'windows.fallback-passed' : result.code, state: this.state() };
  }

  async captureFrame({ transactionId, name = 'frame' }) {
    if (!this.armed || transactionId !== this.transactionId) return { success: false, code: 'windows.not-armed', message: 'Cabinet runtime is not armed for this transaction.', state: this.state() };
    const safeName = String(name).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80) || 'frame';
    const filePath = path.join(this.evidenceRoot, 'frames', `${Date.now()}-${safeName}.png`);
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    const result = await this.#execute('captureFrame', {
      MOTIONDECK_TRANSACTION_ID: transactionId,
      MOTIONDECK_OUTPUT_PATH: filePath,
      MOTIONDECK_DISPLAY_ID: this.config.televisionDisplayId ?? '',
    });
    if (!result.success) return { ...result, state: this.state() };
    if (!(await pathExists(filePath))) return { success: false, code: 'windows.frame-missing', message: 'Capture hook returned success without producing the requested PNG.', state: this.state() };
    const frame = await inspectPng(filePath);
    return { success: true, code: 'windows.frame-passed', message: 'Configured frame capture completed.', state: this.state(), frame, hook: result };
  }

  async rendererMode({ transactionId, mode }) {
    if (this.armed && transactionId !== this.transactionId) return { success: false, code: 'windows.transaction-mismatch', message: 'Transaction does not own cabinet presentation.', state: this.state() };
    const map = {
      'native-2d': 'rendererNative2d',
      'desktop-3d': 'rendererDesktop3d',
      'hmd-vr': 'rendererHmdVr',
      'cabinet-tv': 'rendererCabinetTv',
    };
    const result = await this.#execute(map[mode], { MOTIONDECK_TRANSACTION_ID: transactionId ?? '', MOTIONDECK_RENDERER_MODE: mode });
    if (result.success) this.rendererModeValue = mode;
    return { ...result, code: result.success ? 'windows.renderer-mode-passed' : result.code, state: this.state() };
  }

  drainEvents() {
    return this.events.splice(0, this.events.length);
  }

  state() {
    const capabilities = this.lastProbe?.capabilities ?? [];
    const has = (id) => capabilities.find((entry) => entry.id === id)?.status === 'available';
    return {
      armed: this.armed,
      hmdWornRequired: this.lastProbe?.environment?.hmdWornRequired ?? true,
      televisionOutputAvailable: has('display.television.monoscopic'),
      controllerFallbackAvailable: has('input.gamepad-fallback'),
      native2dFallbackAvailable: has('presentation.native-2d-fallback'),
      trackedInputAvailable: has('input.quest-controller'),
      activeDisplay: this.lastProbe?.environment?.displayId ?? null,
      activeTrackingRuntime: this.lastProbe?.environment?.runtimeName ?? null,
      activeFallback: this.activeFallback,
      rendererMode: this.rendererModeValue,
      transactionId: this.transactionId,
      originVersion: this.originVersion,
    };
  }

  async close() {
    if (this.armed) await this.disarm({ transactionId: this.transactionId, reason: 'adapter-close' });
  }
}
