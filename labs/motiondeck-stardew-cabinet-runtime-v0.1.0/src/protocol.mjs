import crypto from 'node:crypto';
import { boundedInteger, boundedString, digestObject, isPlainObject, issue, randomId, sortIssues, statusFromIssues } from './core.mjs';

export const REQUEST_FORMAT = 'motiondeck-cabinet-ipc-request/1';
export const RESPONSE_FORMAT = 'motiondeck-cabinet-ipc-response/1';
export const STATE_FORMAT = 'motiondeck-cabinet-state/1';
export const PROBE_FORMAT = 'motiondeck-cabinet-probe/1';
export const PROVIDER_ID = 'BigBirdReturns.MotionDeckCabinetRuntime';
export const PROVIDER_VERSION = '0.1.0';

export const OPERATIONS = Object.freeze([
  'hello',
  'probe',
  'arm',
  'heartbeat',
  'disarm',
  'recenter',
  'select-fallback',
  'capture-frame',
  'renderer-mode',
  'drain-events',
  'shutdown',
]);

export const REQUIRED_CAPABILITIES = Object.freeze([
  'openxr.tracking.unworn-hmd',
  'display.television.monoscopic',
  'input.quest-controller',
  'input.gamepad-fallback',
  'presentation.native-2d-fallback',
  'tracking.recenter',
  'evidence.frame-capture',
]);

const TIERS = new Set(['declared', 'probed', 'synthetic', 'physical']);
const CAPABILITY_STATES = new Set(['available', 'degraded', 'unavailable']);
const AUTHORITY_MODES = new Set(['operational', 'commissioning', 'synthetic']);
const CLIENT_ROLES = new Set(['adapter', 'operator', 'test']);

export function initialState() {
  return {
    format: STATE_FORMAT,
    providerId: PROVIDER_ID,
    providerVersion: PROVIDER_VERSION,
    status: 'ready',
    armed: false,
    authority: 'none',
    authorityMode: null,
    hmdWornRequired: false,
    televisionOutputAvailable: false,
    controllerFallbackAvailable: true,
    native2dFallbackAvailable: true,
    trackedInputAvailable: false,
    activeDisplay: null,
    activeTrackingRuntime: null,
    activeFallback: null,
    transactionId: null,
    lease: null,
    originVersion: 0,
    lastError: null,
  };
}

export function validateCapability(raw, index = 0) {
  const findings = [];
  if (!isPlainObject(raw)) return { status: 'blocked', findings: [issue('blocker', 'capability.not-object', `Capability ${index} is not an object.`)] };
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  if (!id || !/^[a-z0-9][a-z0-9._-]{1,127}$/.test(id)) findings.push(issue('blocker', 'capability.id-invalid', 'Capability ID is invalid.', { index }));
  if (!CAPABILITY_STATES.has(raw.status)) findings.push(issue('blocker', 'capability.status-invalid', 'Capability status is invalid.', { index, id: id || null }));
  if (!TIERS.has(raw.evidenceTier)) findings.push(issue('blocker', 'capability.tier-invalid', 'Capability evidence tier is invalid.', { index, id: id || null }));
  const normalized = {
    id,
    status: raw.status,
    evidenceTier: raw.evidenceTier,
    source: typeof raw.source === 'string' ? raw.source.slice(0, 256) : null,
    evidenceDigest: typeof raw.evidenceDigest === 'string' ? raw.evidenceDigest.slice(0, 256) : null,
    details: isPlainObject(raw.details) ? raw.details : {},
  };
  return { ...normalized, findings: sortIssues(findings), validationStatus: statusFromIssues(findings) };
}

export function validateProbe(raw) {
  const findings = [];
  if (!isPlainObject(raw)) return { status: 'blocked', findings: [issue('blocker', 'probe.not-object', 'Probe must be an object.')] };
  if (raw.format !== PROBE_FORMAT) findings.push(issue('blocker', 'probe.format', 'Probe format is not supported.'));
  if (raw.providerId !== PROVIDER_ID) findings.push(issue('blocker', 'probe.provider', 'Probe provider identity does not match the required runtime.'));
  const capabilities = Array.isArray(raw.capabilities) ? raw.capabilities.map(validateCapability) : [];
  if (!Array.isArray(raw.capabilities)) findings.push(issue('blocker', 'probe.capabilities-not-array', 'Probe capabilities must be an array.'));
  for (const capability of capabilities) findings.push(...capability.findings);
  const ids = new Set();
  for (const capability of capabilities) {
    if (ids.has(capability.id)) findings.push(issue('blocker', 'probe.capability-duplicate', 'Probe contains duplicate capability IDs.', { id: capability.id }));
    ids.add(capability.id);
  }
  const missingCapabilities = REQUIRED_CAPABILITIES.filter((id) => {
    const capability = capabilities.find((entry) => entry.id === id);
    return !capability || capability.status !== 'available';
  });
  const result = {
    format: PROBE_FORMAT,
    providerId: raw.providerId,
    providerVersion: typeof raw.providerVersion === 'string' ? raw.providerVersion : null,
    environment: isPlainObject(raw.environment) ? raw.environment : {},
    capabilities: capabilities.map(({ findings: _f, validationStatus: _s, ...capability }) => capability),
    missingCapabilities,
    findings: sortIssues(findings),
  };
  result.status = statusFromIssues([...result.findings, ...missingCapabilities.map((id) => issue('blocker', 'probe.capability-missing', 'Required capability is not available.', { id }))]);
  result.probeDigest = digestObject(result, 'cabinetprobe1');
  return result;
}

export function makeRequest(operation, payload = {}, options = {}) {
  if (!OPERATIONS.includes(operation)) throw new Error(`Unsupported operation: ${operation}`);
  const request = {
    format: REQUEST_FORMAT,
    requestId: options.requestId ?? randomId('cabinetrequest1'),
    client: {
      id: options.clientId ?? 'motiondeck-operator',
      role: options.clientRole ?? 'operator',
      version: options.clientVersion ?? '0.1.0',
    },
    auth: { token: options.token ?? '' },
    operation,
    transactionId: options.transactionId ?? null,
    sentAt: options.sentAt ?? new Date().toISOString(),
    payload,
  };
  return request;
}

export function validateRequest(raw, expectedToken = null) {
  const findings = [];
  if (!isPlainObject(raw)) return { status: 'blocked', findings: [issue('blocker', 'request.not-object', 'Request must be an object.')] };
  if (raw.format !== REQUEST_FORMAT) findings.push(issue('blocker', 'request.format', 'Request format is unsupported.'));
  let requestId = null;
  let operation = null;
  try { requestId = boundedString(raw.requestId, 'requestId', 128); } catch (error) { findings.push(issue('blocker', 'request.id', error.message)); }
  try { operation = boundedString(raw.operation, 'operation', 64); } catch (error) { findings.push(issue('blocker', 'request.operation', error.message)); }
  if (operation && !OPERATIONS.includes(operation)) findings.push(issue('blocker', 'request.operation-unsupported', 'Operation is unsupported.', { operation }));
  const token = raw.auth?.token;
  if (expectedToken !== null) {
    const actual = typeof token === 'string' ? Buffer.from(token, 'utf8') : Buffer.alloc(0);
    const expected = Buffer.from(expectedToken, 'utf8');
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) findings.push(issue('blocker', 'request.auth', 'Request authentication failed.'));
  }
  if (!isPlainObject(raw.client)) findings.push(issue('blocker', 'request.client', 'Client descriptor is required.'));
  if (isPlainObject(raw.client) && !CLIENT_ROLES.has(raw.client.role)) findings.push(issue('blocker', 'request.client-role', 'Client role is unsupported.'));
  const sentAtMs = Date.parse(raw.sentAt ?? '');
  if (!Number.isFinite(sentAtMs)) findings.push(issue('blocker', 'request.sent-at', 'Request sentAt must be an ISO timestamp.'));
  else if (Math.abs(Date.now() - sentAtMs) > 10 * 60_000) findings.push(issue('blocker', 'request.sent-at-window', 'Request timestamp is outside the ten-minute replay window.')); 
  if (!isPlainObject(raw.payload)) findings.push(issue('blocker', 'request.payload', 'Payload must be an object.'));
  const normalized = {
    format: REQUEST_FORMAT,
    requestId,
    client: {
      id: typeof raw.client?.id === 'string' ? raw.client.id.slice(0, 128) : null,
      role: typeof raw.client?.role === 'string' ? raw.client.role.slice(0, 64) : null,
      version: typeof raw.client?.version === 'string' ? raw.client.version.slice(0, 64) : null,
    },
    operation,
    transactionId: typeof raw.transactionId === 'string' ? raw.transactionId.slice(0, 128) : null,
    sentAt: typeof raw.sentAt === 'string' ? raw.sentAt.slice(0, 64) : null,
    payload: isPlainObject(raw.payload) ? raw.payload : {},
    findings: sortIssues(findings),
  };
  normalized.status = statusFromIssues(normalized.findings);
  return normalized;
}

export function normalizeArmPayload(payload) {
  const mode = payload.authorityMode ?? 'operational';
  if (!AUTHORITY_MODES.has(mode)) throw new Error(`Unsupported authorityMode: ${mode}`);
  const ttlMs = boundedInteger(payload.leaseTtlMs ?? 5000, 'leaseTtlMs', 1000, 60_000);
  return {
    authorityMode: mode,
    leaseTtlMs: ttlMs,
    gameUniqueId: boundedString(payload.gameUniqueId ?? 'StardewValley', 'gameUniqueId', 128),
    rendererUniqueId: boundedString(payload.rendererUniqueId ?? 'GingasVR.Stardew3D', 'rendererUniqueId', 128),
    displayRole: boundedString(payload.displayRole ?? 'television-primary-monoscopic', 'displayRole', 128),
    trackingRole: boundedString(payload.trackingRole ?? 'openxr-unworn-hmd', 'trackingRole', 128),
    requireControllerFallback: payload.requireControllerFallback !== false,
    requireNative2dFallback: payload.requireNative2dFallback !== false,
  };
}

export function makeResponse(request, { success, code, message, state, probe = null, evidence = [], payload = {} }) {
  const envelope = {
    format: RESPONSE_FORMAT,
    requestId: request?.requestId ?? null,
    operation: request?.operation ?? null,
    success: Boolean(success),
    code: String(code),
    message: String(message),
    observedAt: new Date().toISOString(),
    state,
    probe,
    evidence,
    payload,
  };
  return { ...envelope, responseDigest: digestObject(envelope, 'cabinetresponse1') };
}
