import { describe, expect, it } from "vitest";
import { FIRST_CHARTER, RELIEF_CIRCUIT, KARAZHAN, LAMP_DISTRICT } from "../../src/arcs/index.js";
import { cartridgeDigest } from "../../src/engine/cartridge-digest.js";
import { foundOrganization } from "../../src/engine/founding.js";
import { runCycle } from "../../src/engine/cycle.js";
import { recommendAgentsForChallenge } from "../../src/play-pipeline/compile.js";
import { compileProjectionManifest, compileWorldForgePlanV2, validateProjectionManifest, validateWorldExpressionPackV2, type WorldExpressionPackV2 } from "../../src/world/forge/index.js";

describe("presentation projection and World Forge v2", () => {
  it.each([FIRST_CHARTER, RELIEF_CIRCUIT, LAMP_DISTRICT])("preserves identity and actual run results for $meta.name", (arc) => {
    const authoredBefore = JSON.stringify(arc);
    const org = foundOrganization(arc);
    const runBefore = JSON.stringify(org);
    const challenge = arc.challenges[0]!;
    const assignments = [{ challengeId: challenge.id, agentIds: recommendAgentsForChallenge(challenge, org, arc), tokensSpent: 0 }];
    const before = runCycle({ arc, org, assignments });
    expect(before.reports.length).toBeGreaterThan(0);
    const manifest = compileProjectionManifest(arc);
    const original = compileWorldForgePlanV2(manifest);
    manifest.expressionSlots.forEach((slot) => { slot.brief = `Minimal monochrome tactile presentation: ${slot.brief}`; });
    manifest.contexts.forEach((context) => { context.label = `Alternate expression: ${context.label}`; });
    const revised = compileWorldForgePlanV2(manifest);
    expect(revised.planDigest).not.toBe(original.planDigest);
    expect(revised.cartridge.digest).toBe(original.cartridge.digest);
    expect(revised.cartridge.digest).toBe(cartridgeDigest(arc));
    expect(runCycle({ arc, org, assignments })).toEqual(before);
    expect(JSON.stringify(arc)).toBe(authoredBefore);
    expect(JSON.stringify(org)).toBe(runBefore);
  });

  it("exposes actionable bindings rather than converting mechanic flavor into fake controls", () => {
    const manifest = compileProjectionManifest(FIRST_CHARTER);
    for (const challenge of FIRST_CHARTER.challenges) {
      const actions = manifest.verbs.filter((verb) => verb.contextId === `encounter:${challenge.id}`);
      expect(actions.map((verb) => verb.operation)).toEqual(expect.arrayContaining(["inspect", "select-party", "commit", "review-result"]));
      expect(actions.some((verb) => /suppress|survive|attack|cleanse/i.test(verb.operation))).toBe(false);
      expect(actions.find((verb) => verb.operation === "select-party")?.input).toBe("assignments[].agentIds");
      expect(actions.find((verb) => verb.operation === "select-party")?.guards).toContain("eligible roster alternatives exist");
      for (const action of actions) {
        expect(manifest.interactables.find((entry) => entry.id === action.targetId)?.verbIds).toContain(action.id);
        expect(action.feedbackIds.every((id) => manifest.feedback.some((feedback) => feedback.id === id))).toBe(true);
      }
    }
    expect(manifest.terminalConditions.every((entry) => entry.scope === "encounter" && entry.source.path.endsWith("/completionCriteria"))).toBe(true);
    const jobs = compileWorldForgePlanV2(manifest).jobs;
    expect(jobs.flatMap((job) => job.requirements.verbs).map((verb) => verb.id).sort()).toEqual(manifest.verbs.map((verb) => verb.id).sort());
    expect(jobs.filter((job) => job.requirements.verbs.length).every((job) => job.brief.includes("Player actions:"))).toBe(true);
  });

  it("projects unrelated composition/state and raid shapes without identity dispatch", () => {
    const raid = compileProjectionManifest(FIRST_CHARTER);
    const ship = compileProjectionManifest(RELIEF_CIRCUIT);
    expect(raid.signals.some((signal) => signal.semantics === "composition")).toBe(false);
    expect(ship.signals.filter((signal) => signal.semantics === "composition").length).toBeGreaterThan(0);
    expect(ship.signals.filter((signal) => signal.semantics === "state")).toHaveLength(RELIEF_CIRCUIT.stateDefinitions!.filter((state) => state.visibility !== "private").length);
    expect(ship.signals.some((signal) => signal.description.includes("single points of failure"))).toBe(true);
    const foreign = structuredClone(RELIEF_CIRCUIT);
    foreign.meta.id = "unbundled-operation";
    const imported = compileProjectionManifest(foreign);
    expect(imported.verbs).toEqual(ship.verbs);
    expect(imported.signals).toEqual(ship.signals);
    expect(compileProjectionManifest(KARAZHAN).verbs.some((verb) => verb.operation === "select-mode")).toBe(true);
  });

  it("only offers a coherent authored spend lever and hides private state", () => {
    const arc = structuredClone(FIRST_CHARTER);
    arc.meta.engineVersion = "1.3.0";
    const challenge = arc.challenges[0]!;
    challenge.resourceSpend = { maxTokens: 2, minSteadiness: 0.5, steadinessPerToken: 0.2 };
    arc.stateDefinitions = [{ id: "secret", label: "Private", description: "Hidden fact", kind: "boolean", initial: false, visibility: "private" }];
    const manifest = compileProjectionManifest(arc);
    expect(manifest.verbs.filter((verb) => verb.operation === "allocate-resource")).toHaveLength(1);
    expect(manifest.verbs.find((verb) => verb.operation === "allocate-resource")?.guards).toContain("spendOffer.available");
    expect(JSON.stringify(manifest)).not.toContain("Hidden fact");
    delete challenge.resourceSpend;
    challenge.mechanicChecks = [0, 1].map((index) => ({ ...challenge.mechanicChecks[0]!, id: `check-${index}`, resourceSpend: { maxTokens: index + 1, minSteadiness: 0.5, steadinessPerToken: 0.2 } }));
    expect(compileProjectionManifest(arc).verbs.some((verb) => verb.operation === "allocate-resource")).toBe(false);
  });

  it("rejects missing, duplicate, cyclic, unbound and uncovered requirements", () => {
    const good = compileProjectionManifest(RELIEF_CIRCUIT);
    const badTarget = structuredClone(good);
    badTarget.verbs[0]!.targetId = "missing";
    expect(() => validateProjectionManifest(badTarget)).toThrow(/reference/);
    const duplicate = structuredClone(good);
    duplicate.verbs.push(duplicate.verbs[0]!);
    expect(() => validateProjectionManifest(duplicate)).toThrow(/Duplicate/);
    const cycle = structuredClone(good);
    cycle.contexts[0]!.parentId = cycle.contexts[0]!.id;
    expect(() => validateProjectionManifest(cycle)).toThrow(/Cyclic/);
    const uncovered = structuredClone(good);
    uncovered.expressionSlots = [];
    expect(() => compileWorldForgePlanV2(uncovered)).toThrow(/Uncovered/);
    expect(() => compileWorldForgePlanV2({ ...good, resolver: "invented law" })).toThrow();
  });

  it("keeps authored provenance resolvable and split production jobs actionable", () => {
    const manifest = compileProjectionManifest(RELIEF_CIRCUIT);
    for (const entry of [...manifest.contexts, ...manifest.verbs, ...manifest.interactables, ...manifest.signals, ...manifest.feedback, ...manifest.terminalConditions]) {
      if (entry.source.authority !== "authored") continue;
      let value: unknown = RELIEF_CIRCUIT;
      for (const token of entry.source.path.slice(1).split("/")) value = (value as Record<string, unknown>)[token.replaceAll("~1", "/").replaceAll("~0", "~")];
      expect(value).toBeDefined();
    }
    const action = manifest.verbs.find((verb) => verb.operation === "commit")!;
    manifest.expressionSlots.push({ id: "separate-commit-control", contextId: action.contextId, brief: "A tactile commit affordance", requirementIds: [action.id] });
    const job = compileWorldForgePlanV2(manifest).jobs.at(-1)!;
    expect(job.requirements.interactables.map((entry) => entry.id)).toContain(action.targetId);
    expect(job.requirements.feedback.map((entry) => entry.id)).toEqual(expect.arrayContaining(action.feedbackIds));
    expect(job.requirements.contexts.map((entry) => entry.id)).toContain("world");
  });

  it("accepts v2 receipts and rejects mismatched plans, versions and incomplete returns", () => {
    const plan = compileWorldForgePlanV2(compileProjectionManifest(RELIEF_CIRCUIT));
    expect(compileWorldForgePlanV2(JSON.parse(JSON.stringify(plan.manifest)))).toEqual(plan);
    const pack: WorldExpressionPackV2 = {
      format: "rodoh-world-expression-pack/2", cartridgeDigest: plan.cartridge.digest, planDigest: plan.planDigest,
      assets: plan.jobs.map((job) => ({ slotId: job.id, path: "asset.glb", previewPath: "preview.png", mediaType: "model/gltf-binary", sha256: "0".repeat(64), bytes: 100, producer: "local", sourceClass: "generated" })),
    };
    expect(validateWorldExpressionPackV2(pack, plan).ok).toBe(true);
    expect(validateWorldExpressionPackV2({ ...pack, format: "rodoh-world-expression-pack/1" }, plan).ok).toBe(false);
    expect(validateWorldExpressionPackV2({ ...pack, assets: [] }, plan).ok).toBe(false);
    expect(validateWorldExpressionPackV2({ ...pack, assets: [] }, plan, "partial").ok).toBe(true);
    const altered = structuredClone(plan);
    altered.jobs[0]!.brief = "omit all actions";
    expect(validateWorldExpressionPackV2(pack, altered).ok).toBe(false);
    pack.assets[0]!.path = "../escape.glb";
    expect(validateWorldExpressionPackV2(pack, plan).ok).toBe(false);
  });
});
