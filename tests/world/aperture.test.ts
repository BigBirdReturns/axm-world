import { createHash } from "node:crypto";
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  normalizedPins,
  selectBudgetedItems,
  semanticLevelForScale,
  stableRingPosition,
} from "../../src/world/aperture/vendor/aperture-kit-core.mjs";
import {
  buildApertureKitUrl,
  readApertureKitState,
} from "../../src/world/aperture/vendor/aperture-kit-state.mjs";
import { getPresentations } from "../../src/world/presentations.js";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(read(path)).digest("hex");
}

describe("neutral Aperture kit", () => {
  it("keeps semantic zoom stable at boundaries and layout deterministic", () => {
    expect(semanticLevelForScale(1.46, "corpus")).toBe("corpus");
    expect(semanticLevelForScale(1.7, "corpus")).toBe("machine");
    expect(semanticLevelForScale(1.43, "machine")).toBe("machine");
    expect(semanticLevelForScale(1.1, "machine")).toBe("corpus");
    expect(stableRingPosition(2, 8, 50, 50, 30)).toEqual(stableRingPosition(2, 8, 50, 50, 30));
  });

  it("keeps explicit pins visible through query and budget pressure", () => {
    const items = Array.from({ length: 20 }, (_, index) => ({ id: `person-${index}`, label: `Person ${index}` }));
    const result = selectBudgetedItems(items, {
      query: "Person 1",
      budget: 6,
      pinnedIds: ["person-19", "person-19"],
      idFor: (item) => item.id,
      textFor: (item) => item.label,
    });
    expect(result.visible.map((item) => item.id)).toContain("person-19");
    expect(result.visible).toHaveLength(6);
    expect(normalizedPins(["b", "a", "b"])).toEqual(["a", "b"]);
  });

  it("round-trips an exact view without disturbing unrelated URL state", () => {
    const href = buildApertureKitUrl({
      version: "1",
      mode: "surface",
      scale: 4.4,
      level: "evidence",
      focus: "contract:cellar",
      query: "mender",
      budget: 12,
      pins: ["founder:b", "founder:a"],
    }, "https://example.test/world/?lang=zh-Hant#run", "rodoh_ap_");
    const url = new URL(href);
    expect(url.searchParams.get("lang")).toBe("zh-Hant");
    expect(url.hash).toBe("#run");
    expect(readApertureKitState(url.search, "rodoh_ap_")).toEqual({
      version: "1",
      mode: "surface",
      scale: 4.4,
      level: "evidence",
      focus: "contract:cellar",
      query: "mender",
      budget: 12,
      pins: ["founder:a", "founder:b"],
    });
  });
});

describe("Rodoh Aperture adapter", () => {
  it("is a first-class player representation beside Board, Map, Hall, and World", () => {
    const ids = getPresentations().map((presentation) => presentation.id);
    expect(ids).toContain("aperture");
    expect(ids).toEqual(expect.arrayContaining(["board", "map", "hall", "globe"]));
  });

  it("projects authored structure and receipts without manufacturing pairwise adjacency or routes", () => {
    const source = read("src/world/aperture/RodohAperture.tsx");
    expect(source).toContain("No pairwise lines, routes, outcomes, or choices are manufactured.");
    expect(source).toContain("Authorship and receipt trace only");
    expect(source).toContain("world.ledger.entries");
    expect(source).toContain("node?.requirements");
    expect(source).not.toContain("shortestFilteredPath");
    expect(source).not.toMatch(/participant.*participant.*line/i);
  });

  it("vendors the Clifford primitives byte-exactly under recorded hashes", () => {
    const provenance = read("src/world/aperture/VENDORED_FROM");
    const coreHash = sha256("src/world/aperture/vendor/aperture-kit-core.mjs");
    const stateHash = sha256("src/world/aperture/vendor/aperture-kit-state.mjs");
    expect(provenance).toContain(`aperture-kit-core.mjs: ${coreHash}`);
    expect(provenance).toContain(`aperture-kit-state.mjs: ${stateHash}`);
    expect(provenance).toContain("BigBirdReturns/clifford-number");
  });

  it("has mobile and reduced-motion contracts", () => {
    const css = read("src/world/aperture/rodoh-aperture.css");
    expect(css).toContain("@media (max-width: 900px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
