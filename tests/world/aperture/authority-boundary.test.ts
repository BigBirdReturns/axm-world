import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../../..");

function source(path: string): string {
  return readFileSync(resolve(ROOT, path), "utf8");
}

describe("AP-400 World authority boundary", () => {
  it("contains no daemon transport, query, or playback actuation call site", () => {
    const host = source("src/world/aperture/ApertureHost.tsx");
    const session = source("src/world/aperture/session.ts");
    const implementation = `${host}\n${session}`;

    const forbiddenCallSites = [
      /\bfetch\s*\(/,
      /\bnew\s+WebSocket\s*\(/,
      /\bnew\s+EventSource\s*\(/,
      /\bnew\s+XMLHttpRequest\s*\(/,
      /\bsendBeacon\s*\(/,
      /\bpostMessage\s*\(/,
      /\bchrome\.runtime\b/,
      /\bbrowser\.runtime\b/,
      /\.currentTime\s*=/,
      /\.play\s*\(/,
      /\.pause\s*\(/,
      /\bhealth\s*\(/,
      /\bcurrent_anchor\s*\(/,
      /\bquery\s*\(/,
      /\bselect\s*\(/,
      /\bactuate\s*\(/,
    ];

    for (const pattern of forbiddenCallSites) {
      expect(implementation).not.toMatch(pattern);
    }
  });

  it("persists only digest scope and the selected read-only surface", () => {
    const session = source("src/world/aperture/session.ts");
    expect(session).toContain('export const APERTURE_HOST_SESSION_FORMAT = "rodoh-aperture-host-session/1"');
    expect(session).toContain("storyPackageDigest: string;");
    expect(session).toContain("viewerProfileDigest: string;");
    expect(session).toContain("activeSurface: ApertureHostSurface;");

    for (const forbiddenField of [
      "anchorId:",
      "providerPosition:",
      "canonicalPosition:",
      "exposureEvent:",
      "knowledgeEvent:",
      "answerBody:",
      "factId:",
      "command:",
      "actuation:",
    ]) {
      expect(session).not.toContain(forbiddenField);
    }
  });

  it("keeps the fixed-story host separate from the Rodoh simulation aperture", () => {
    const host = source("src/world/aperture/ApertureHost.tsx");
    const simulation = source("src/world/aperture/RodohAperture.tsx");
    expect(host).not.toContain("RodohAperture");
    expect(simulation).not.toContain("ApertureHost");
  });
});
