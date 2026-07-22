import { compareCodepoints } from "../engine/determinism.js";
import type { Arc } from "../engine/types.js";
import {
  inspectArcSourcePlanes,
  SOURCE_PLANE_REGISTRY,
  type SourcePlaneId,
} from "../source-planes/index.js";

export interface WorldKnownSourcePlane {
  id: SourcePlaneId;
  format: string;
  extensionKey: string;
  label: string;
  shortLabel: string;
  status: "valid" | "invalid";
  source?: unknown;
  errors: string[];
}

export interface WorldSourcePlaneInspection {
  known: WorldKnownSourcePlane[];
  unknownExtensionKeys: string[];
}

/**
 * Read-only receiver projection of the Arc-owned source-plane registry.
 *
 * This function does not validate an Arc, compile creator source, resolve an
 * action, or infer state. It reports the exact registered source embedded in
 * the already validated cartridge and identifies extension namespaces that
 * World must preserve without pretending to understand.
 */
export function inspectWorldSourcePlanes(arc: Arc): WorldSourcePlaneInspection {
  const known = inspectArcSourcePlanes(arc).map((inspection) => ({
    id: inspection.definition.id,
    format: inspection.definition.format,
    extensionKey: inspection.definition.extensionKey,
    label: inspection.definition.label,
    shortLabel: inspection.definition.shortLabel,
    status: inspection.status,
    ...(inspection.source !== undefined ? { source: inspection.source } : {}),
    errors: inspection.errors ?? [],
  }));

  const registeredKeys = new Set(SOURCE_PLANE_REGISTRY.map((definition) => definition.extensionKey));
  const unknownExtensionKeys = Object.keys(arc.extensions ?? {})
    .filter((extensionKey) => !registeredKeys.has(extensionKey))
    .sort(compareCodepoints);

  return { known, unknownExtensionKeys };
}

export function primaryWorldSourcePlane(arc: Arc): WorldKnownSourcePlane | null {
  return inspectWorldSourcePlanes(arc).known[0] ?? null;
}
