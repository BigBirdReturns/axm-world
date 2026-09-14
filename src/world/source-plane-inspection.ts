import { compareCodepoints } from "../engine/determinism.js";
import type { Arc } from "../engine/types.js";
import { RUNTIME_FAMILY_EXTENSION_KEY } from "../engine/runtime-family.js";
import { CANONICAL_STORY_EXTENSION_KEY } from "../canonical-story/types.js";
import { CANONICAL_STORY_TIMED_MEDIA_EXTENSION_KEY } from "../canonical-story/timed-media.js";
import { GODSCAR_EXTENSION_KEY, GODSCAR_POCKET_FORMAT } from "../godscar/types.js";
import { parseGodscarPocket } from "../godscar/schema.js";
import { DARK_TOMB_EXTENSION_KEY, DARK_TOMB_POCKET_FORMAT } from "../dark-tomb/types.js";
import { parseDarkTombPocket } from "../dark-tomb/schema.js";
import { COMMON_SHIP_EXTENSION_KEY, COMMON_SHIP_POCKET_FORMAT } from "../common-ship/types.js";
import { parseCommonShipPocket } from "../common-ship/schema.js";
import { BURN_PROTOCOL_EXTENSION_KEY, BURN_PROTOCOL_SOURCE_FORMAT } from "../burn-protocol/types.js";
import { readBurnProtocolExtension } from "../burn-protocol/schema.js";

export type WorldSourcePlaneId = "godscar-pocket" | "dark-tomb-pocket" | "common-ship-pocket" | "burn-protocol";

export interface WorldKnownSourcePlane {
  id: WorldSourcePlaneId;
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

type ReceiverDefinition = Omit<WorldKnownSourcePlane, "status" | "source" | "errors"> & {
  read(arc: Arc): unknown | null;
};

function readParsedExtension(arc: Arc, key: string, parse: (input: unknown) => unknown): unknown | null {
  const value = arc.extensions?.[key];
  return value === undefined ? null : parse(value);
}

const RECEIVER_SOURCE_PLANES: readonly ReceiverDefinition[] = [
  { id: "godscar-pocket", format: GODSCAR_POCKET_FORMAT, extensionKey: GODSCAR_EXTENSION_KEY,
    label: "Open Universe Pocket", shortLabel: "Pocket",
    read: (arc) => readParsedExtension(arc, GODSCAR_EXTENSION_KEY, parseGodscarPocket) },
  { id: "dark-tomb-pocket", format: DARK_TOMB_POCKET_FORMAT, extensionKey: DARK_TOMB_EXTENSION_KEY,
    label: "Dark Tomb Pocket", shortLabel: "Dark Tomb",
    read: (arc) => readParsedExtension(arc, DARK_TOMB_EXTENSION_KEY, parseDarkTombPocket) },
  { id: "common-ship-pocket", format: COMMON_SHIP_POCKET_FORMAT, extensionKey: COMMON_SHIP_EXTENSION_KEY,
    label: "Common Ship Pocket", shortLabel: "Common Ship",
    read: (arc) => readParsedExtension(arc, COMMON_SHIP_EXTENSION_KEY, parseCommonShipPocket) },
  { id: "burn-protocol", format: BURN_PROTOCOL_SOURCE_FORMAT, extensionKey: BURN_PROTOCOL_EXTENSION_KEY,
    label: "The Burn Protocol", shortLabel: "Burn", read: readBurnProtocolExtension },
];

const RECEIVER_KNOWN_EXTENSION_KEYS = new Set([
  ...RECEIVER_SOURCE_PLANES.map((definition) => definition.extensionKey),
  RUNTIME_FAMILY_EXTENSION_KEY,
  CANONICAL_STORY_EXTENSION_KEY,
  CANONICAL_STORY_TIMED_MEDIA_EXTENSION_KEY,
]);

/** Receiver-only source inspection. It intentionally avoids Arc's creator
 * registry because that registry owns starters and compilers, including large
 * canonical source estates that must never become World runtime payload. */
export function inspectWorldSourcePlanes(arc: Arc): WorldSourcePlaneInspection {
  const extensions = arc.extensions ?? {};
  const known: WorldKnownSourcePlane[] = [];
  for (const definition of RECEIVER_SOURCE_PLANES) {
    if (!(definition.extensionKey in extensions)) continue;
    const { read, ...metadata } = definition;
    try {
      const source = read(arc);
      known.push(source === null
        ? { ...metadata, status: "invalid", errors: [`Arc declares ${definition.extensionKey} but the source could not be recovered.`] }
        : { ...metadata, status: "valid", source, errors: [] });
    } catch (error) {
      known.push({ ...metadata, status: "invalid", errors: [error instanceof Error ? error.message : String(error)] });
    }
  }
  const unknownExtensionKeys = Object.keys(extensions)
    .filter((extensionKey) => !RECEIVER_KNOWN_EXTENSION_KEYS.has(extensionKey))
    .sort(compareCodepoints);
  return { known, unknownExtensionKeys };
}

export function primaryWorldSourcePlane(arc: Arc): WorldKnownSourcePlane | null {
  return inspectWorldSourcePlanes(arc).known[0] ?? null;
}
