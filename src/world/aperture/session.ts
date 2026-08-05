export const APERTURE_HOST_SESSION_FORMAT = "rodoh-aperture-host-session/1" as const;
const PREFIX = "axm-world:aperture-host:v1:";

export type ApertureHostSurface = "position" | "answer" | "selection" | "provenance";

export interface ApertureHostSessionScope {
  storyPackageDigest: string;
  viewerProfileDigest: string;
}

export interface ApertureHostSession {
  format: typeof APERTURE_HOST_SESSION_FORMAT;
  storyPackageDigest: string;
  viewerProfileDigest: string;
  activeSurface: ApertureHostSurface;
}

export interface ApertureHostSessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type ApertureHostSessionRestoration = "fresh" | "restored" | "reset";

export interface LoadedApertureHostSession {
  session: ApertureHostSession;
  restoration: ApertureHostSessionRestoration;
  reason: "none" | "invalid-json" | "invalid-shape" | "scope-mismatch" | "surface-unavailable";
}

const SHA256 = /^[0-9a-f]{64}$/;
const SURFACES = new Set<ApertureHostSurface>([
  "position",
  "answer",
  "selection",
  "provenance",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactSessionKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value).sort();
  return keys.length === 4
    && keys[0] === "activeSurface"
    && keys[1] === "format"
    && keys[2] === "storyPackageDigest"
    && keys[3] === "viewerProfileDigest";
}

function validScope(scope: ApertureHostSessionScope): boolean {
  return SHA256.test(scope.storyPackageDigest)
    && SHA256.test(scope.viewerProfileDigest);
}

function firstSurface(availableSurfaces: readonly ApertureHostSurface[]): ApertureHostSurface {
  return availableSurfaces[0] ?? "provenance";
}

export function apertureHostSessionKey(scope: ApertureHostSessionScope): string {
  if (!validScope(scope)) throw new Error("ApertureHost session scope requires exact SHA-256 digests.");
  return `${PREFIX}${scope.storyPackageDigest}:${scope.viewerProfileDigest}`;
}

export function initialApertureHostSession(
  scope: ApertureHostSessionScope,
  activeSurface: ApertureHostSurface = "position",
): ApertureHostSession {
  if (!validScope(scope)) throw new Error("ApertureHost session scope requires exact SHA-256 digests.");
  if (!SURFACES.has(activeSurface)) throw new Error("Unsupported ApertureHost surface.");
  return {
    format: APERTURE_HOST_SESSION_FORMAT,
    storyPackageDigest: scope.storyPackageDigest,
    viewerProfileDigest: scope.viewerProfileDigest,
    activeSurface,
  };
}

export function validateApertureHostSession(
  value: unknown,
  scope: ApertureHostSessionScope,
  availableSurfaces: readonly ApertureHostSurface[],
): ApertureHostSession | null {
  if (!isRecord(value) || !exactSessionKeys(value)) return null;
  if (value.format !== APERTURE_HOST_SESSION_FORMAT
      || value.storyPackageDigest !== scope.storyPackageDigest
      || value.viewerProfileDigest !== scope.viewerProfileDigest
      || typeof value.activeSurface !== "string"
      || !SURFACES.has(value.activeSurface as ApertureHostSurface)
      || !availableSurfaces.includes(value.activeSurface as ApertureHostSurface)) return null;
  return initialApertureHostSession(scope, value.activeSurface as ApertureHostSurface);
}

export function loadApertureHostSession(
  storage: ApertureHostSessionStorage,
  scope: ApertureHostSessionScope,
  availableSurfaces: readonly ApertureHostSurface[],
): LoadedApertureHostSession {
  const fallback = initialApertureHostSession(scope, firstSurface(availableSurfaces));
  const raw = storage.getItem(apertureHostSessionKey(scope));
  if (!raw) return { session: fallback, restoration: "fresh", reason: "none" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { session: fallback, restoration: "reset", reason: "invalid-json" };
  }

  if (isRecord(parsed)
      && parsed.storyPackageDigest !== undefined
      && parsed.viewerProfileDigest !== undefined
      && (parsed.storyPackageDigest !== scope.storyPackageDigest
        || parsed.viewerProfileDigest !== scope.viewerProfileDigest)) {
    return { session: fallback, restoration: "reset", reason: "scope-mismatch" };
  }

  const candidate = validateApertureHostSession(parsed, scope, availableSurfaces);
  if (candidate) return { session: candidate, restoration: "restored", reason: "none" };

  if (isRecord(parsed)
      && parsed.format === APERTURE_HOST_SESSION_FORMAT
      && parsed.storyPackageDigest === scope.storyPackageDigest
      && parsed.viewerProfileDigest === scope.viewerProfileDigest
      && typeof parsed.activeSurface === "string"
      && SURFACES.has(parsed.activeSurface as ApertureHostSurface)
      && !availableSurfaces.includes(parsed.activeSurface as ApertureHostSurface)) {
    return { session: fallback, restoration: "reset", reason: "surface-unavailable" };
  }

  return { session: fallback, restoration: "reset", reason: "invalid-shape" };
}

export function saveApertureHostSession(
  storage: ApertureHostSessionStorage,
  session: ApertureHostSession,
): void {
  const scope = {
    storyPackageDigest: session.storyPackageDigest,
    viewerProfileDigest: session.viewerProfileDigest,
  };
  const validated = validateApertureHostSession(session, scope, [
    "position",
    "answer",
    "selection",
    "provenance",
  ]);
  if (!validated) throw new Error("Refusing to persist an invalid ApertureHost session.");
  storage.setItem(apertureHostSessionKey(scope), JSON.stringify(validated));
}

export function clearApertureHostSession(
  storage: ApertureHostSessionStorage,
  scope: ApertureHostSessionScope,
): void {
  storage.removeItem(apertureHostSessionKey(scope));
}
