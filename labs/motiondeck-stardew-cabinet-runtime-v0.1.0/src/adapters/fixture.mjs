import path from 'node:path';
import { digestObject } from '../core.mjs';
import { PROBE_FORMAT, PROVIDER_ID, PROVIDER_VERSION, REQUIRED_CAPABILITIES } from '../protocol.mjs';
import { writeDiagnosticPng } from '../png.mjs';

export class FixtureAdapter {
  constructor({ evidenceRoot, frameWidth = 640, frameHeight = 360 } = {}) {
    this.kind = 'fixture';
    this.evidenceRoot = evidenceRoot;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.armed = false;
    this.transactionId = null;
    this.activeFallback = null;
    this.rendererModeValue = 'native-2d';
    this.originVersion = 0;
    this.events = [];
    this.frameCounter = 0;
  }

  #event(kind, payload = {}) {
    const event = { kind, observedAt: new Date().toISOString(), payload };
    this.events.push(event);
    return event;
  }

  async probe() {
    const capabilities = REQUIRED_CAPABILITIES.map((id) => ({
      id,
      status: 'available',
      evidenceTier: 'synthetic',
      source: 'bounded-fixture',
      evidenceDigest: digestObject({ id, fixture: true }, 'fixturecapability1'),
      details: { synthetic: true, operationalAuthority: false },
    }));
    return {
      format: PROBE_FORMAT,
      providerId: PROVIDER_ID,
      providerVersion: PROVIDER_VERSION,
      adapterKind: this.kind,
      environment: {
        platform: process.platform,
        architecture: process.arch,
        synthetic: true,
        hmdWornRequired: false,
        televisionDisplayId: 'fixture-display-1',
        runtimeName: 'fixture-openxr-runtime',
      },
      capabilities,
    };
  }

  async arm(request) {
    this.armed = true;
    this.transactionId = request.transactionId;
    this.activeFallback = null;
    this.rendererModeValue = 'cabinet-tv';
    this.#event('armed', { transactionId: request.transactionId, authorityMode: request.authorityMode });
    return {
      success: true,
      code: 'fixture.arm-passed',
      message: 'Synthetic cabinet fixture armed.',
      state: this.state(),
    };
  }

  async disarm({ transactionId, reason }) {
    const previous = this.transactionId;
    this.armed = false;
    this.transactionId = null;
    this.activeFallback = 'native-2d';
    this.rendererModeValue = 'native-2d';
    this.#event('disarmed', { transactionId: transactionId ?? previous, reason });
    return { success: true, code: 'fixture.disarm-passed', message: 'Synthetic cabinet fixture disarmed.', state: this.state() };
  }

  async recenter({ transactionId }) {
    if (!this.armed || transactionId !== this.transactionId) return { success: false, code: 'fixture.not-armed', message: 'Fixture is not armed for this transaction.', state: this.state() };
    this.originVersion += 1;
    this.#event('recentered', { transactionId, originVersion: this.originVersion });
    return { success: true, code: 'fixture.recenter-passed', message: 'Synthetic tracking origin recentered.', state: this.state() };
  }

  async selectFallback({ transactionId, fallback }) {
    if (!this.armed || transactionId !== this.transactionId) return { success: false, code: 'fixture.not-armed', message: 'Fixture is not armed for this transaction.', state: this.state() };
    this.activeFallback = fallback;
    if (fallback === 'native-2d') this.rendererModeValue = 'native-2d';
    this.#event('fallback-selected', { transactionId, fallback });
    return { success: true, code: 'fixture.fallback-passed', message: `Synthetic fallback selected: ${fallback}.`, state: this.state() };
  }

  async captureFrame({ transactionId, name = 'frame' }) {
    if (!this.armed || transactionId !== this.transactionId) return { success: false, code: 'fixture.not-armed', message: 'Fixture is not armed for this transaction.', state: this.state() };
    this.frameCounter += 1;
    const safeName = String(name).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80) || 'frame';
    const filePath = path.join(this.evidenceRoot, 'frames', `${String(this.frameCounter).padStart(4, '0')}-${safeName}.png`);
    const frame = await writeDiagnosticPng(filePath, { width: this.frameWidth, height: this.frameHeight, seed: this.frameCounter });
    this.#event('frame-captured', { transactionId, frame });
    return { success: true, code: 'fixture.frame-passed', message: 'Synthetic diagnostic frame captured.', state: this.state(), frame };
  }

  async rendererMode({ transactionId, mode }) {
    if (this.armed && transactionId !== this.transactionId) return { success: false, code: 'fixture.transaction-mismatch', message: 'Transaction does not own the fixture.', state: this.state() };
    this.rendererModeValue = mode;
    this.#event('renderer-mode', { transactionId, mode });
    return { success: true, code: 'fixture.renderer-mode-passed', message: `Synthetic renderer mode selected: ${mode}.`, state: this.state() };
  }

  drainEvents() {
    const events = this.events.splice(0, this.events.length);
    return events;
  }

  state() {
    return {
      armed: this.armed,
      hmdWornRequired: false,
      televisionOutputAvailable: true,
      controllerFallbackAvailable: true,
      native2dFallbackAvailable: true,
      trackedInputAvailable: true,
      activeDisplay: 'fixture-display-1',
      activeTrackingRuntime: 'fixture-openxr-runtime',
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
