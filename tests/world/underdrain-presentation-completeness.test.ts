import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateRepresentationPlan,
  type RepresentationPlan,
  type RepresentationProductionCoverage,
} from "../../src/world/acceptance/representation-completeness.js";

const ROOT = resolve(import.meta.dirname, "../..");
const DEMO = resolve(ROOT, "demos/underdrain-draft");
const plan = JSON.parse(readFileSync(resolve(DEMO, "presentation.json"), "utf8")) as RepresentationPlan;
const production = JSON.parse(readFileSync(resolve(DEMO, "production.json"), "utf8")) as RepresentationProductionCoverage;
const art = readFileSync(resolve(DEMO, "assets/underdrain-art.js"), "utf8");
const surface = readFileSync(resolve(DEMO, "source/presentation-surface.js"), "utf8");
const builder = readFileSync(resolve(ROOT, "scripts/demos/build-underdrain-draft.mjs"), "utf8");
const verifier = readFileSync(resolve(ROOT, "scripts/demos/verify-underdrain-draft.mjs"), "utf8");
const css = readFileSync(resolve(DEMO, "source/mobile-controls.css"), "utf8");
const body = readFileSync(resolve(DEMO, "source/body.html"), "utf8");

 describe("UNDERDRAIN representation rework", () => {
  it("keeps all 48 representation obligations while refusing to call them 48 production assets", () => {
    const result = evaluateRepresentationPlan(plan, production);
    expect(result.status).toBe("fail");
    expect(result.blockers).toContain("Production coverage is mixed: 47 declared roles still use prototype sources.");
    expect(result.metrics).toEqual({
      declaredRoles: 48,
      productionRoles: 1,
      prototypeRoles: 47,
      productionSources: 1,
      surfaces: 6,
      people: 6,
      objectives: 5,
      states: 7,
    });
    expect(new Set(plan.requirements.personIds)).toEqual(new Set([
      "rhea-venn", "tess-loam", "marta-sump", "morrowcap", "mrs-kett", "dax-venn",
    ]));
    expect(new Set(plan.requirements.objectiveIds)).toEqual(new Set([
      "inspect-living-trap", "restore-kett-water", "diagnose-spore-valves", "operate-purge-wheel", "open-crown-sluice",
    ]));
    expect(plan.surfaces.every((entry) => entry.desktop && entry.mobile && entry.accessibleEquivalent.length > 0)).toBe(true);
  });

  it("binds the one real production scene and exposes every remaining prototype role", () => {
    expect(production).toMatchObject({
      format: "rodoh-representation-production/1",
      planId: "underdrain-white-label-v1",
      status: "mixed",
      productionAssetIds: ["underdrain:scene-pump-seven"],
    });
    expect(production.sources).toHaveLength(1);
    expect(production.sources[0]).toMatchObject({
      id: "underdrain-production:pump-seven-webp",
      assetIds: ["underdrain:scene-pump-seven"],
      mediaType: "image/webp",
      sha256: "c5810b7362b511a8789e26300517ab0156b2593f99c9b45227765f465ef871ca",
      width: 960,
      height: 540,
    });
    expect(production.sources[0]!.sourcePaths).toHaveLength(5);
    for (const path of production.sources[0]!.sourcePaths) expect(existsSync(resolve(DEMO, path))).toBe(true);
    expect(art).toContain("underdrain-white-label-art/1");
    expect(art).not.toMatch(/\bfetch\s*\(/);
    expect(art).not.toContain("Math.random");
    expect(surface).toContain('releaseClassification:"representation-rework"');
    expect(surface).toContain("prototypeRoleCount");
    expect(surface).toContain("productionRoleCount");
    expect(surface).not.toContain("48 cartridge assets");
  });

  it("makes the objective and controls siblings of the stage rather than overlays on the world", () => {
    expect(body).toContain('<div class="stage-shell">');
    expect(body).toContain('<section class="command-deck"');
    expect(body).toMatch(/<\/div>\s*<section class="command-deck"/);
    expect(css).toContain(".stage-shell>.stage");
    expect(css).toContain(".command-deck>.objective-ribbon");
    expect(css).toContain(".command-deck>.touch");
    expect(css).toContain("grid-template-columns:minmax(0,1fr) 238px");
  });

  it("installs exact authoring, role, production, persistence, and runtime custody before boot", () => {
    expect(builder).toContain('readFileSync(resolve(root, "production.json"))');
    expect(builder).toContain('const bootMarker = "const params=new URLSearchParams(location.search);"');
    expect(builder).toContain("const app02Definitions = app02.slice(0, bootIndex);");
    expect(builder).toContain("const app02Boot = app02.slice(bootIndex);");
    expect(builder).toMatch(
      /app02Definitions,\s*readFileSync\(resolve\(source, "presentation-surface\.js"\), "utf8"\),\s*app02Boot,/,
    );
    expect(surface).toContain("buildRepresentationEvidence");
    expect(surface).toContain("drawAction=function(run)");
    expect(surface).toContain("commandDeckOutsideRenderedWorld");
  });

  it("makes production coverage and no-overlay geometry part of exact verification", () => {
    expect(verifier).toContain("--production-sha256");
    expect(verifier).toContain("representation-production-coverage");
    expect(verifier).toContain("productionCoverageComplete");
    expect(verifier).toContain("actionCommandDeck");
    expect(css).toContain("@media(max-height:500px)");
  });
});
