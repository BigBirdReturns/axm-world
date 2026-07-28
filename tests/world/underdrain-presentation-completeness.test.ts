import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateRepresentationPlan,
  type RepresentationPlan,
} from "../../src/world/acceptance/representation-completeness.js";

const ROOT = resolve(import.meta.dirname, "../..");
const DEMO = resolve(ROOT, "demos/underdrain-draft");
const plan = JSON.parse(readFileSync(resolve(DEMO, "presentation.json"), "utf8")) as RepresentationPlan;
const art = readFileSync(resolve(DEMO, "assets/underdrain-art.js"), "utf8");
const surface = readFileSync(resolve(DEMO, "source/presentation-surface.js"), "utf8");
const builder = readFileSync(resolve(ROOT, "scripts/demos/build-underdrain-draft.mjs"), "utf8");
const verifier = readFileSync(resolve(ROOT, "scripts/demos/verify-underdrain-draft.mjs"), "utf8");
const css = readFileSync(resolve(DEMO, "source/head.html"), "utf8");

describe("UNDERDRAIN cartridge-owned representation", () => {
  it("closes the cast, mechanism, state, surface, device, and accessibility planes", () => {
    const result = evaluateRepresentationPlan(plan);
    expect(result, result.blockers.join("\n")).toEqual({
      format: "rodoh-representation-evaluation/1",
      planId: "underdrain-white-label-v1",
      status: "pass",
      blockers: [],
      metrics: {
        assets: 48,
        surfaces: 6,
        people: 6,
        objectives: 5,
        states: 7,
      },
    });
    expect(new Set(plan.requirements.personIds)).toEqual(new Set([
      "rhea-venn", "tess-loam", "marta-sump", "morrowcap", "mrs-kett", "dax-venn",
    ]));
    expect(new Set(plan.requirements.objectiveIds)).toEqual(new Set([
      "inspect-living-trap", "restore-kett-water", "diagnose-spore-valves", "operate-purge-wheel", "open-crown-sluice",
    ]));
    expect(plan.surfaces.every((entry) => entry.desktop && entry.mobile && entry.accessibleEquivalent.length > 0)).toBe(true);
  });

  it("uses original local art rather than network, randomness, or another cartridge's identity", () => {
    expect(art).toContain("underdrain-white-label-art/1");
    expect(art).toContain("drawScene");
    expect(art).toContain("drawMechanism");
    expect(art).toContain("drawEnemy");
    expect(art).toContain("drawPlayer");
    expect(art).not.toMatch(/\bfetch\s*\(/);
    expect(art).not.toContain("Math.random");
    expect(art).not.toContain("kind-gods-of-ilyon");
    expect(art).not.toContain("waking-tower");
    expect(plan.renderer).toEqual({ action: "cartridge-assets", neutralFallbackUsed: false });
  });

  it("installs the governed representation between runtime definitions and every boot path", () => {
    expect(builder).toContain('const bootMarker = "const params=new URLSearchParams(location.search);"');
    expect(builder).toContain("const app02Definitions = app02.slice(0, bootIndex);");
    expect(builder).toContain("const app02Boot = app02.slice(bootIndex);");
    expect(builder).toMatch(
      /app02Definitions,\s*readFileSync\(resolve\(source, "presentation-surface\.js"\), "utf8"\),\s*app02Boot,/,
    );
    expect(surface).toContain("actionRendererUsesCartridgeAssets");
    expect(surface).toContain("neutralFallbackAbsent");
    expect(surface).toContain("buildRepresentationEvidence");
    expect(surface).toContain("drawAction=function(run)");
  });

  it("makes representation part of exact static custody and responsive product acceptance", () => {
    expect(verifier).toContain("--presentation-sha256");
    expect(verifier).toContain("representation-before-boot");
    expect(verifier).toContain("cartridgeOwnedRepresentation");
    expect(verifier).toContain("representationDesktopMobile");
    expect(verifier).toContain("representationAccessibility");
    expect(css).toContain(".underdrain-hero");
    expect(css).toContain(".underdrain-person-art");
    expect(css).toContain(".underdrain-state-art");
    expect(css).toContain("@media(forced-colors:active)");
    expect(css).toContain("@media(prefers-reduced-motion:reduce)");
  });
});
