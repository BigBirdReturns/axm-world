import { describe, expect, it } from "vitest";
import {
  REPRESENTATION_EVALUATION_FORMAT,
  REPRESENTATION_PLAN_FORMAT,
  REPRESENTATION_PRODUCTION_FORMAT,
  evaluateRepresentationPlan,
  type RepresentationPlan,
  type RepresentationProductionCoverage,
} from "../../src/world/acceptance/representation-completeness.js";

function asset(id: string, kind: RepresentationPlan["assets"][number]["kind"] = "state-mark") {
  return {
    id,
    sourcePath: "assets/fixture-art.svg",
    kind,
    accessibleEquivalent: `${id} accessible description`,
  };
}

function passingPlan(): RepresentationPlan {
  const assets = [
    asset("fixture:emblem", "emblem"),
    asset("fixture:scene-entry", "environment"),
    asset("fixture:scene-action", "environment"),
    asset("fixture:scene-consequence", "environment"),
    asset("fixture:scene-successor", "environment"),
    asset("fixture:record", "record-mark"),
    asset("fixture:hero-portrait", "portrait"),
    asset("fixture:hero-body", "body"),
    asset("fixture:ally-portrait", "portrait"),
    asset("fixture:ally-body", "body"),
    asset("fixture:mechanism-idle", "mechanism"),
    asset("fixture:mechanism-active", "mechanism"),
    asset("fixture:mechanism-complete", "mechanism"),
    asset("fixture:state-water", "state-mark"),
  ];
  return {
    format: REPRESENTATION_PLAN_FORMAT,
    id: "fixture-white-label-v1",
    namespace: "fixture",
    classification: "authored-pilot-candidate",
    candidate: {
      repository: "BigBirdReturns/axm-world",
      authoredIdentity: "cart1_fixture",
      experienceId: "fixture-authored-pilot",
    },
    provenance: {
      format: "rodoh-original-asset-provenance/1",
      path: "assets/provenance.json",
    },
    renderer: { action: "cartridge-assets", neutralFallbackUsed: false },
    requirements: {
      surfaceIds: ["cold-entry", "authored-commitment", "first-action", "accepted-consequence", "playable-successor", "durable-record"],
      personIds: ["hero", "ally"],
      objectiveIds: ["repair-valve"],
      stateIds: ["water"],
    },
    assets,
    bindings: {
      identityAssetId: "fixture:emblem",
      people: [
        { personId: "hero", portraitAssetId: "fixture:hero-portrait", bodyAssetId: "fixture:hero-body" },
        { personId: "ally", portraitAssetId: "fixture:ally-portrait", bodyAssetId: "fixture:ally-body" },
      ],
      objectives: [{
        objectiveId: "repair-valve",
        idleAssetId: "fixture:mechanism-idle",
        activeAssetId: "fixture:mechanism-active",
        completeAssetId: "fixture:mechanism-complete",
      }],
      states: [{ stateId: "water", assetId: "fixture:state-water" }],
    },
    surfaces: [
      { id: "cold-entry", assetIds: ["fixture:emblem", "fixture:scene-entry", "fixture:hero-portrait"], desktop: true, mobile: true, accessibleEquivalent: "Inhabited opening scene." },
      { id: "authored-commitment", assetIds: ["fixture:ally-portrait"], desktop: true, mobile: true, accessibleEquivalent: "Authored commitment and actor method." },
      { id: "first-action", assetIds: ["fixture:scene-action", "fixture:hero-body", "fixture:mechanism-active"], desktop: true, mobile: true, accessibleEquivalent: "Mechanism-driven action." },
      { id: "accepted-consequence", assetIds: ["fixture:scene-consequence", "fixture:state-water"], desktop: true, mobile: true, accessibleEquivalent: "Accepted world change." },
      { id: "playable-successor", assetIds: ["fixture:scene-successor", "fixture:ally-body"], desktop: true, mobile: true, accessibleEquivalent: "Implemented successor." },
      { id: "durable-record", assetIds: ["fixture:record"], desktop: true, mobile: true, accessibleEquivalent: "Durable episode record." },
    ],
  };
}

function completeCoverage(plan: RepresentationPlan): RepresentationProductionCoverage {
  return {
    format: REPRESENTATION_PRODUCTION_FORMAT,
    planId: plan.id,
    status: "complete",
    productionAssetIds: plan.assets.map((entry) => entry.id),
    sources: [{
      id: "fixture-production:complete-pack",
      assetIds: plan.assets.map((entry) => entry.id),
      sourcePaths: ["assets/fixture-art.svg"],
      mediaType: "image/svg+xml",
      sha256: "a".repeat(64),
      width: 1200,
      height: 800,
    }],
  };
}

describe("rodoh-representation-plan/1", () => {
  it("accepts a cartridge-owned pack only when every declared role has exact production custody", () => {
    const plan = passingPlan();
    const result = evaluateRepresentationPlan(plan, completeCoverage(plan));
    expect(result).toEqual({
      format: REPRESENTATION_EVALUATION_FORMAT,
      planId: "fixture-white-label-v1",
      status: "pass",
      blockers: [],
      metrics: {
        declaredRoles: 14,
        productionRoles: 14,
        prototypeRoles: 0,
        productionSources: 1,
        surfaces: 6,
        people: 2,
        objectives: 1,
        states: 1,
      },
    });
  });

  it("refuses a role vocabulary when its production coverage receipt is absent", () => {
    const result = evaluateRepresentationPlan(passingPlan());
    expect(result.status).toBe("fail");
    expect(result.blockers).toContain("Production coverage receipt is absent.");
  });

  it("refuses the exact role-count inflation that mislabeled one production scene as a complete pack", () => {
    const plan = passingPlan();
    const coverage: RepresentationProductionCoverage = {
      format: REPRESENTATION_PRODUCTION_FORMAT,
      planId: plan.id,
      status: "mixed",
      productionAssetIds: ["fixture:scene-action"],
      sources: [{
        id: "fixture-production:one-scene",
        assetIds: ["fixture:scene-action"],
        sourcePaths: ["assets/fixture-action.webp"],
        mediaType: "image/webp",
        sha256: "b".repeat(64),
        width: 960,
        height: 540,
      }],
    };
    const result = evaluateRepresentationPlan(plan, coverage);
    expect(result.status).toBe("fail");
    expect(result.blockers).toContain("Production coverage is mixed: 13 declared roles still use prototype sources.");
    expect(result.metrics).toMatchObject({ declaredRoles: 14, productionRoles: 1, prototypeRoles: 13, productionSources: 1 });
  });

  it("refuses primitive action, neutral fallback, and absent surface roles", () => {
    const plan = passingPlan();
    plan.renderer = { action: "primitive-only", neutralFallbackUsed: true };
    plan.surfaces = plan.surfaces.filter((surface) => surface.id !== "playable-successor");
    plan.bindings.objectives = [];
    const result = evaluateRepresentationPlan(plan, completeCoverage(plan));
    expect(result.status).toBe("fail");
    expect(result.blockers).toEqual(expect.arrayContaining([
      "Final action representation is primitive-only rather than cartridge-owned.",
      "First-party candidate uses the neutral white-label fallback.",
      "Required objective repair-valve has no visible mechanism-state binding.",
      "Required surface playable-successor has no cartridge-owned representation.",
    ]));
  });

  it("refuses placeholder identity and desktop-only evidence", () => {
    const plan = passingPlan();
    plan.assets[0] = { ...plan.assets[0]!, id: "fixture:placeholder-emblem" };
    plan.bindings.identityAssetId = "fixture:placeholder-emblem";
    plan.surfaces[0] = { ...plan.surfaces[0]!, assetIds: ["fixture:placeholder-emblem"], mobile: false };
    const coverage = completeCoverage(plan);
    const result = evaluateRepresentationPlan(plan, coverage);
    expect(result.status).toBe("fail");
    expect(result.blockers).toEqual(expect.arrayContaining([
      "Representation role fixture:placeholder-emblem has placeholder identity.",
      "Surface cold-entry is not represented on both desktop and mobile.",
    ]));
  });
});
