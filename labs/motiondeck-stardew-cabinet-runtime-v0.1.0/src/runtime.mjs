import { digestObject, isPlainObject, randomId } from './core.mjs';
import { makeResponse, normalizeArmPayload, REQUIRED_CAPABILITIES, validateProbe, validateRequest, initialState } from './protocol.mjs';

const TIER_RANK = { declared: 0, synthetic: 1, probed: 2, physical: 3 };
const RENDERER_MODES = new Set(['native-2d', 'desktop-3d', 'hmd-vr', 'cabinet-tv']);
const FALLBACKS = new Set(['controller', 'native-2d']);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export class CabinetRuntime {
  constructor({ adapter, ledger, token, idempotenceLimit = 512 }) {
    this.adapter = adapter;
    this.ledger = ledger;
    this.token = token;
    this.idempotenceLimit = idempotenceLimit;
    this.state = initialState();
    this.probe = null;
    this.idempotence = new Map();
    this.serial = Promise.resolve();
    this.closed = false;
    this.leaseTimer = setInterval(() => this.#checkLease().catch(() => {}), 200);
    this.leaseTimer.unref?.();
  }

  snapshot() {
    return clone(this.state);
  }

  async #record(kind, status, payload = {}, options = {}) {
    return await this.ledger.append(kind, status, payload, options);
  }

  #syncAdapterState(adapterState = {}) {
    const retained = {
      status: this.state.status,
      authority: this.state.authority,
      authorityMode: this.state.authorityMode,
      lease: this.state.lease,
      lastError: this.state.lastError,
    };
    this.state = {
      ...this.state,
      ...adapterState,
      ...retained,
      format: this.state.format,
      providerId: this.state.providerId,
      providerVersion: this.state.providerVersion,
    };
  }

  async #refreshProbe() {
    const raw = await this.adapter.probe();
    this.probe = validateProbe(raw);
    const adapterState = this.adapter.state?.() ?? {};
    this.#syncAdapterState(adapterState);
    return this.probe;
  }

  #gateArm(probe, authorityMode) {
    const findings = [];
    const byId = new Map(probe.capabilities.map((entry) => [entry.id, entry]));
    for (const id of REQUIRED_CAPABILITIES) {
      const capability = byId.get(id);
      if (!capability || capability.status !== 'available') findings.push({ code: 'capability-unavailable', capabilityId: id });
    }
    if (authorityMode === 'synthetic') {
      if (this.adapter.kind !== 'fixture') findings.push({ code: 'synthetic-adapter-required' });
      for (const id of REQUIRED_CAPABILITIES) {
        const capability = byId.get(id);
        if (capability && capability.evidenceTier !== 'synthetic') findings.push({ code: 'synthetic-tier-required', capabilityId: id, actual: capability.evidenceTier });
      }
    } else if (authorityMode === 'commissioning') {
      if (this.adapter.kind === 'fixture') findings.push({ code: 'fixture-cannot-commission' });
      for (const id of REQUIRED_CAPABILITIES) {
        const capability = byId.get(id);
        if (capability && (TIER_RANK[capability.evidenceTier] ?? -1) < TIER_RANK.probed) findings.push({ code: 'probed-tier-required', capabilityId: id, actual: capability.evidenceTier });
      }
    } else if (authorityMode === 'operational') {
      if (probe.environment?.hmdWornRequired !== false) findings.push({ code: 'unworn-hmd-not-proven' });
      for (const id of REQUIRED_CAPABILITIES) {
        const capability = byId.get(id);
        if (capability && capability.evidenceTier !== 'physical') findings.push({ code: 'physical-tier-required', capabilityId: id, actual: capability.evidenceTier });
      }
    }
    return { admitted: findings.length === 0, findings };
  }

  async handle(rawRequest) {
    const task = async () => {
      const validated = validateRequest(rawRequest, this.token);
      if (validated.status !== 'admitted') {
        const state = this.snapshot();
        return makeResponse(validated, {
          success: false,
          code: 'request.blocked',
          message: 'Request validation failed.',
          state,
          evidence: [],
          payload: { findings: validated.findings },
        });
      }

      const requestDigest = digestObject({ ...validated, findings: undefined, status: undefined }, 'cabinetrequestdigest1');
      const existing = this.idempotence.get(validated.requestId);
      if (existing) {
        if (existing.requestDigest !== requestDigest) {
          return makeResponse(validated, {
            success: false,
            code: 'request.id-collision',
            message: 'The request ID was already used for different content.',
            state: this.snapshot(),
            evidence: [],
          });
        }
        return existing.response;
      }

      const received = await this.#record('request-received', 'observed', {
        requestId: validated.requestId,
        operation: validated.operation,
        client: validated.client,
        transactionId: validated.transactionId,
        payload: validated.payload,
        requestDigest,
      }, { evidenceTier: this.adapter.kind === 'fixture' ? 'synthetic' : 'probed', transactionId: validated.transactionId });

      let response;
      try {
        response = await this.#dispatch(validated, received);
      } catch (error) {
        this.state.status = 'error';
        this.state.lastError = error.message;
        const failure = await this.#record('operation-failed', 'failed', {
          operation: validated.operation,
          requestId: validated.requestId,
          error: error.message,
        }, { evidenceTier: this.adapter.kind === 'fixture' ? 'synthetic' : 'probed', transactionId: validated.transactionId });
        response = makeResponse(validated, {
          success: false,
          code: 'operation.exception',
          message: error.message,
          state: this.snapshot(),
          probe: this.probe,
          evidence: [received.eventDigest, failure.eventDigest],
        });
      }

      this.idempotence.set(validated.requestId, { requestDigest, response });
      while (this.idempotence.size > this.idempotenceLimit) this.idempotence.delete(this.idempotence.keys().next().value);
      return response;
    };
    const result = this.serial.then(task, task);
    this.serial = result.then(() => undefined, () => undefined);
    return await result;
  }

  async #dispatch(request, received) {
    switch (request.operation) {
      case 'hello': {
        const evidence = await this.#record('hello', 'passed', { client: request.client }, { evidenceTier: 'declared' });
        return makeResponse(request, {
          success: true,
          code: 'hello.passed',
          message: 'MotionDeck cabinet runtime protocol is available.',
          state: this.snapshot(),
          evidence: [received.eventDigest, evidence.eventDigest],
          payload: {
            providerId: this.state.providerId,
            providerVersion: this.state.providerVersion,
            adapterKind: this.adapter.kind,
            productAuthority: 'none',
          },
        });
      }
      case 'probe': {
        const probe = await this.#refreshProbe();
        const evidence = await this.#record('probe', probe.status === 'admitted' ? 'passed' : 'blocked', probe, {
          evidenceTier: this.adapter.kind === 'fixture' ? 'synthetic' : 'probed',
        });
        return makeResponse(request, {
          success: probe.status === 'admitted',
          code: probe.status === 'admitted' ? 'probe.passed' : 'probe.blocked',
          message: probe.status === 'admitted' ? 'All required cabinet capabilities are available at some evidence tier.' : 'One or more cabinet capabilities are unavailable.',
          state: this.snapshot(),
          probe,
          evidence: [received.eventDigest, evidence.eventDigest],
        });
      }
      case 'arm': {
        if (this.state.armed) {
          const same = request.transactionId && request.transactionId === this.state.transactionId;
          return makeResponse(request, {
            success: Boolean(same),
            code: same ? 'arm.already-owned' : 'arm.already-armed',
            message: same ? 'Transaction already owns the cabinet lease.' : 'Another transaction owns the cabinet lease.',
            state: this.snapshot(),
            probe: this.probe,
            evidence: [received.eventDigest],
          });
        }
        const payload = normalizeArmPayload(request.payload);
        const transactionId = request.transactionId ?? randomId('cabinettransaction1');
        const probe = await this.#refreshProbe();
        const gate = this.#gateArm(probe, payload.authorityMode);
        if (!gate.admitted) {
          const evidence = await this.#record('arm-gate', 'blocked', { authorityMode: payload.authorityMode, findings: gate.findings, probeDigest: probe.probeDigest }, {
            evidenceTier: this.adapter.kind === 'fixture' ? 'synthetic' : 'probed', transactionId,
          });
          return makeResponse(request, {
            success: false,
            code: 'arm.gate-blocked',
            message: 'Cabinet arm authority was refused by the evidence gate.',
            state: this.snapshot(),
            probe,
            evidence: [received.eventDigest, evidence.eventDigest],
            payload: { transactionId, gate },
          });
        }
        const result = await this.adapter.arm({ ...payload, transactionId });
        this.#syncAdapterState(result.state ?? this.adapter.state?.() ?? {});
        if (result.success) {
          const now = Date.now();
          this.state.status = payload.authorityMode === 'operational' ? 'armed-operational' : `armed-${payload.authorityMode}`;
          this.state.armed = true;
          this.state.authorityMode = payload.authorityMode;
          this.state.authority = payload.authorityMode === 'operational' ? 'local-device-display-lease' : 'none';
          this.state.transactionId = transactionId;
          this.state.lease = { ttlMs: payload.leaseTtlMs, renewedAt: new Date(now).toISOString(), expiresAt: new Date(now + payload.leaseTtlMs).toISOString() };
          this.state.lastError = null;
        } else {
          this.state.status = 'ready';
          this.state.authorityMode = null;
          this.state.authority = 'none';
          this.state.lease = null;
          this.state.lastError = result.message;
        }
        const evidence = await this.#record('arm', result.success ? 'passed' : 'failed', { payload, transactionId, result, gate }, {
          evidenceTier: payload.authorityMode === 'operational' ? 'physical' : payload.authorityMode === 'synthetic' ? 'synthetic' : 'probed', transactionId,
        });
        return makeResponse(request, {
          success: result.success,
          code: result.success ? 'arm.passed' : result.code,
          message: result.message,
          state: this.snapshot(),
          probe,
          evidence: [received.eventDigest, evidence.eventDigest],
          payload: { transactionId, gate, adapter: result },
        });
      }
      case 'heartbeat': {
        const transactionId = request.transactionId;
        if (!this.state.armed || !transactionId || transactionId !== this.state.transactionId) {
          return makeResponse(request, { success: false, code: 'heartbeat.not-owner', message: 'Transaction does not own an active cabinet lease.', state: this.snapshot(), evidence: [received.eventDigest] });
        }
        const ttlMs = this.state.lease?.ttlMs ?? 5000;
        const now = Date.now();
        this.state.lease = { ttlMs, renewedAt: new Date(now).toISOString(), expiresAt: new Date(now + ttlMs).toISOString() };
        const evidence = await this.#record('heartbeat', 'passed', { transactionId, lease: this.state.lease }, {
          evidenceTier: this.state.authorityMode === 'operational' ? 'physical' : this.state.authorityMode === 'synthetic' ? 'synthetic' : 'probed', transactionId,
        });
        return makeResponse(request, { success: true, code: 'heartbeat.passed', message: 'Cabinet lease renewed.', state: this.snapshot(), evidence: [received.eventDigest, evidence.eventDigest] });
      }
      case 'disarm': {
        const transactionId = request.transactionId ?? this.state.transactionId;
        if (!this.state.armed) return makeResponse(request, { success: true, code: 'disarm.already-safe', message: 'Cabinet runtime is already disarmed.', state: this.snapshot(), evidence: [received.eventDigest] });
        if (request.transactionId && request.transactionId !== this.state.transactionId && request.client.role !== 'operator') {
          return makeResponse(request, { success: false, code: 'disarm.not-owner', message: 'Only the lease owner or an operator may disarm.', state: this.snapshot(), evidence: [received.eventDigest] });
        }
        const result = await this.adapter.disarm({ transactionId, reason: request.payload.reason ?? 'requested' });
        this.#syncAdapterState(result.state ?? this.adapter.state?.() ?? {});
        if (result.success) this.#clearLease('ready');
        else this.state.lastError = result.message;
        const evidence = await this.#record('disarm', result.success ? 'passed' : 'failed', { transactionId, result, reason: request.payload.reason ?? 'requested' }, {
          evidenceTier: this.state.authorityMode === 'operational' ? 'physical' : this.adapter.kind === 'fixture' ? 'synthetic' : 'probed', transactionId,
        });
        return makeResponse(request, { success: result.success, code: result.success ? 'disarm.passed' : result.code, message: result.message, state: this.snapshot(), evidence: [received.eventDigest, evidence.eventDigest] });
      }
      case 'recenter': {
        const result = await this.adapter.recenter({ transactionId: request.transactionId });
        this.#syncAdapterState(result.state ?? this.adapter.state?.() ?? {});
        const evidence = await this.#record('recenter', result.success ? 'passed' : 'failed', { result }, { evidenceTier: this.state.authorityMode === 'operational' ? 'physical' : this.adapter.kind === 'fixture' ? 'synthetic' : 'probed', transactionId: request.transactionId });
        return makeResponse(request, { success: result.success, code: result.success ? 'recenter.passed' : result.code, message: result.message, state: this.snapshot(), evidence: [received.eventDigest, evidence.eventDigest] });
      }
      case 'select-fallback': {
        const fallback = request.payload.fallback;
        if (!FALLBACKS.has(fallback)) return makeResponse(request, { success: false, code: 'fallback.invalid', message: 'Fallback must be controller or native-2d.', state: this.snapshot(), evidence: [received.eventDigest] });
        const result = await this.adapter.selectFallback({ transactionId: request.transactionId, fallback });
        this.#syncAdapterState(result.state ?? this.adapter.state?.() ?? {});
        const evidence = await this.#record('fallback', result.success ? 'passed' : 'failed', { fallback, result }, { evidenceTier: this.state.authorityMode === 'operational' ? 'physical' : this.adapter.kind === 'fixture' ? 'synthetic' : 'probed', transactionId: request.transactionId });
        return makeResponse(request, { success: result.success, code: result.success ? 'fallback.passed' : result.code, message: result.message, state: this.snapshot(), evidence: [received.eventDigest, evidence.eventDigest] });
      }
      case 'capture-frame': {
        const result = await this.adapter.captureFrame({ transactionId: request.transactionId, name: request.payload.name ?? 'frame' });
        this.#syncAdapterState(result.state ?? this.adapter.state?.() ?? {});
        const evidence = await this.#record('frame-capture', result.success ? 'passed' : 'failed', { frame: result.frame ?? null, result: { success: result.success, code: result.code, message: result.message } }, { evidenceTier: this.state.authorityMode === 'operational' ? 'physical' : this.adapter.kind === 'fixture' ? 'synthetic' : 'probed', transactionId: request.transactionId });
        return makeResponse(request, { success: result.success, code: result.success ? 'frame.passed' : result.code, message: result.message, state: this.snapshot(), evidence: [received.eventDigest, evidence.eventDigest], payload: { frame: result.frame ?? null } });
      }
      case 'renderer-mode': {
        const mode = request.payload.mode;
        if (!RENDERER_MODES.has(mode)) return makeResponse(request, { success: false, code: 'renderer-mode.invalid', message: 'Renderer mode is invalid.', state: this.snapshot(), evidence: [received.eventDigest] });
        const result = await this.adapter.rendererMode({ transactionId: request.transactionId, mode });
        this.#syncAdapterState(result.state ?? this.adapter.state?.() ?? {});
        const evidence = await this.#record('renderer-mode', result.success ? 'passed' : 'failed', { mode, result }, { evidenceTier: this.state.authorityMode === 'operational' ? 'physical' : this.adapter.kind === 'fixture' ? 'synthetic' : 'probed', transactionId: request.transactionId });
        return makeResponse(request, { success: result.success, code: result.success ? 'renderer-mode.passed' : result.code, message: result.message, state: this.snapshot(), evidence: [received.eventDigest, evidence.eventDigest] });
      }
      case 'drain-events': {
        const adapterEvents = this.adapter.drainEvents?.() ?? [];
        const limit = Math.max(0, Math.min(Number(request.payload.limit ?? 50), 500));
        return makeResponse(request, { success: true, code: 'events.passed', message: 'Runtime events returned.', state: this.snapshot(), evidence: [received.eventDigest], payload: { adapterEvents, evidenceEvents: this.ledger.tail(limit), ledger: this.ledger.summary() } });
      }
      case 'shutdown': {
        if (!['operator', 'test'].includes(request.client.role)) return makeResponse(request, { success: false, code: 'shutdown.role-refused', message: 'Shutdown requires operator or test role.', state: this.snapshot(), evidence: [received.eventDigest] });
        if (this.state.armed) {
          const result = await this.adapter.disarm({ transactionId: this.state.transactionId, reason: 'shutdown' });
          this.#syncAdapterState(result.state ?? this.adapter.state?.() ?? {});
          if (!result.success) return makeResponse(request, { success: false, code: 'shutdown.disarm-failed', message: result.message, state: this.snapshot(), evidence: [received.eventDigest] });
          this.#clearLease('ready');
        }
        this.closed = true;
        const evidence = await this.#record('shutdown', 'passed', { client: request.client }, { evidenceTier: this.adapter.kind === 'fixture' ? 'synthetic' : 'probed' });
        return makeResponse(request, { success: true, code: 'shutdown.passed', message: 'Runtime shutdown admitted.', state: this.snapshot(), evidence: [received.eventDigest, evidence.eventDigest] });
      }
      default:
        throw new Error(`Unhandled operation: ${request.operation}`);
    }
  }

  #clearLease(status = 'ready') {
    this.state.status = status;
    this.state.armed = false;
    this.state.authority = 'none';
    this.state.authorityMode = null;
    this.state.transactionId = null;
    this.state.lease = null;
    this.state.lastError = null;
  }

  async #checkLease() {
    if (!this.state.armed || !this.state.lease?.expiresAt) return;
    if (Date.now() < Date.parse(this.state.lease.expiresAt)) return;
    const transactionId = this.state.transactionId;
    const mode = this.state.authorityMode;
    const result = await this.adapter.disarm({ transactionId, reason: 'lease-expired' });
    this.#syncAdapterState(result.state ?? this.adapter.state?.() ?? {});
    if (result.success) this.#clearLease('ready');
    else {
      this.state.status = 'fail-safe-error';
      this.state.authority = 'none';
      this.state.lastError = result.message;
    }
    await this.#record('lease-expired', result.success ? 'passed' : 'failed', { transactionId, result }, { evidenceTier: mode === 'operational' ? 'physical' : mode === 'synthetic' ? 'synthetic' : 'probed', transactionId });
  }

  async close() {
    clearInterval(this.leaseTimer);
    if (this.state.armed) {
      const result = await this.adapter.disarm({ transactionId: this.state.transactionId, reason: 'runtime-close' });
      if (result.success) this.#clearLease('closed');
    }
    await this.adapter.close?.();
    this.closed = true;
  }
}
