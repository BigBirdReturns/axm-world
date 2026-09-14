import type { Arc } from "../../engine/types.js";
import { validateArc } from "../../engine/schema.js";
import { selectRuntimeFamily, RUNTIME_FAMILIES } from "../../engine/runtime-family.js";
import { CANONICAL_STORY_EXTENSION_KEY, readCanonicalStoryExtension, type CanonicalStorySource } from "../../canonical-story/index.js";
import { CANONICAL_STORY_TIMED_MEDIA_EXTENSION_KEY, type CanonicalStoryTimedMedia } from "../../canonical-story/timed-media.js";
import { arcCarriesApertureTimedMedia, readApertureTimedMediaForStory } from "../timed-media/receiver.js";

export type RuntimeSelection =
  | { host: "simulation" }
  | { host: "canonical-story"; story: CanonicalStorySource; timedMedia: CanonicalStoryTimedMedia | null };

type HostId = RuntimeSelection["host"];

// Local host capabilities; authored selection belongs to Arc runtime-family.
const HOST_CAPABILITIES: Readonly<Record<HostId, readonly string[]>> = {
  simulation: ["simulation"],
  "canonical-story": ["canonical-story", "canonical-story.timed-media"],
};

/** All requirements must fit exactly one host. No priority or fallback host. */
export function selectRuntimeHost(capabilities: readonly string[]): HostId | null {
  if (capabilities.length === 0) return null;
  if (capabilities.includes("canonical-story.timed-media") && !capabilities.includes("canonical-story")) return null;
  const matches = (Object.keys(HOST_CAPABILITIES) as HostId[]).filter((id) =>
    capabilities.every((capability) => HOST_CAPABILITIES[id].includes(capability)));
  return matches.length === 1 ? matches[0]! : null;
}

export type RuntimeResolution =
  | { ok: true; selection: RuntimeSelection }
  | { ok: false; refusal: { title: string; message: string; testId: string } };

function refuse(title: string, error: unknown, testId: string): RuntimeResolution {
  return { ok: false, refusal: { title, message: error instanceof Error ? error.message : String(error), testId } };
}

/** Read today's authored authority through its existing validators. Never
 * rewrite Arc or feed a validator's normalized copy back into the run. Unknown
 * metadata namespaces remain opaque; newer known runtime versions fail closed.
 * Story precedence over the legacy simulation envelope is intentional. */
export function resolveRuntimeHost(arc: Arc): RuntimeResolution {
  let family;
  try {
    family = selectRuntimeFamily(arc, RUNTIME_FAMILIES);
  } catch (error) {
    return refuse("Runtime family refused", error, "invalid-runtime-family");
  }
  if (family.kind === "unsupported") {
    return refuse("Runtime family refused", `Unsupported runtime-family ${family.reason}; fallback is disabled.`, "unsupported-runtime-family");
  }
  const explicit = family.kind === "selected" ? family.contract.family : null;
  if (explicit === "strategy-board") {
    return refuse(
      "Unsupported runtime host",
      "strategy-board is recognized, but its World projection contract and host are not implemented. Fallback is disabled.",
      "unsupported-runtime-host",
    );
  }

  const known = [CANONICAL_STORY_EXTENSION_KEY, CANONICAL_STORY_TIMED_MEDIA_EXTENSION_KEY];
  const unsupported = Object.keys(arc.extensions ?? {}).sort().filter((key) =>
    known.some((supported) => key.startsWith(supported.split("@")[0] + "@") && key !== supported));
  if (unsupported.length) {
    return refuse("Runtime capability refused", `Unsupported runtime extensions: ${unsupported.join(", ")}`, "invalid-runtime-capability");
  }

  let story: CanonicalStorySource | null;
  try {
    story = readCanonicalStoryExtension(arc);
  } catch (error) {
    return refuse("Canonical story refused", error, "invalid-canonical-story");
  }

  if (story) {
    if (explicit === "encounter-simulation") {
      return refuse(
        "Runtime family mismatch",
        "encounter-simulation conflicts with canonical-story authority carried by this Arc. Explicit authored family selection cannot be overridden by a receiver fallback.",
        "runtime-family-mismatch",
      );
    }
    try {
      const timedMedia = readApertureTimedMediaForStory(arc, story);
      const host = selectRuntimeHost(timedMedia ? ["canonical-story", "canonical-story.timed-media"] : ["canonical-story"]);
      if (host !== "canonical-story") return refuse("Runtime capability refused", "No compatible story host.", "invalid-runtime-capability");
      return { ok: true, selection: { host, story, timedMedia } };
    } catch (error) {
      return refuse("Aperture timed media refused", error, "invalid-aperture-timed-media");
    }
  }

  if (arcCarriesApertureTimedMedia(arc)) {
    return refuse(
      "Orphan Aperture timed media refused",
      "The Arc carries timed-media records without the canonical-story authority they must identify. World will not route an orphan narrative extension into simulation.",
      "invalid-aperture-timed-media",
    );
  }
  if (explicit === "fixed-canonical-sequence") {
    return refuse(
      "Runtime authority refused",
      "fixed-canonical-sequence requires validated canonical-story authority; simulation fallback is disabled.",
      "missing-runtime-authority",
    );
  }

  try {
    validateArc(arc);
    const host = selectRuntimeHost(["simulation"]);
    if (host !== "simulation") return refuse("Runtime capability refused", "No compatible simulation host.", "invalid-runtime-capability");
    return { ok: true, selection: { host } };
  } catch (error) {
    return refuse("Runtime capability refused", error, "invalid-runtime-capability");
  }
}
