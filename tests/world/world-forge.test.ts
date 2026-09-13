import { describe, expect, it } from "vitest";
import { FIRST_CHARTER } from "../../src/arcs/index.js";
import { cartridgeDigest } from "../../src/engine/cartridge-digest.js";
import type { Arc } from "../../src/engine/types.js";
import {
  WORLD_EXPRESSION_PACK_FORMAT,
  compileWorldForgePlan,
  validateWorldExpressionPack,
  type WorldExpressionPack,
  type WorldForgePlan,
} from "../../src/world/forge/index.js";

function receiptPack(plan: WorldForgePlan): WorldExpressionPack {
  return {
    format: WORLD_EXPRESSION_PACK_FORMAT,
    cartridgeDigest: plan.cartridge.digest,
    planDigest: plan.planDigest,
    assets: plan.jobs.map((job, index) => ({
      slotId: job.id,
      path: `assets/${job.id.replaceAll(":", "-")}.glb`,
      previewPath: `previews/${job.id.replaceAll(":", "-")}.png`,
      mediaType: "model/gltf-binary",
      sha256: index.toString(16).padStart(64, "0"),
      bytes: 1000 + index,
      producer: "test-producer",
      sourceClass: "generated",
    })),
  };
}

describe("World Forge commodity expression contract", () => {
  it("compiles every authored world concern into provider-neutral jobs", () => {
    const plan = compileWorldForgePlan(FIRST_CHARTER);
    expect(plan.cartridge.digest).toBe(cartridgeDigest(FIRST_CHARTER));
    expect(plan.scope).toBe("presentation-only");
    expect(plan.jobs).toHaveLength(
      FIRST_CHARTER.progressionTiers.length
      + FIRST_CHARTER.roles.length
      + FIRST_CHARTER.challenges.length
      + FIRST_CHARTER.items.length,
    );
    expect(plan.jobs.filter((job) => job.kind === "region-environment")).toHaveLength(FIRST_CHARTER.progressionTiers.length);
    expect(plan.jobs.filter((job) => job.kind === "role-actor")).toHaveLength(FIRST_CHARTER.roles.length);
    expect(plan.jobs.filter((job) => job.kind === "encounter-setpiece")).toHaveLength(FIRST_CHARTER.challenges.length);
    expect(plan.jobs.filter((job) => job.kind === "item-prop")).toHaveLength(FIRST_CHARTER.items.length);

    const serialized = JSON.stringify(plan).toLowerCase();
    for (const provider of ["openai", "gpt", "astra", "blender", "meshy", "dream-loop"]) {
      expect(serialized).not.toContain(provider);
    }
    expect(plan.jobs.every((job) => job.output.localOnly && job.output.presentationOnly)).toBe(true);
    expect(plan.jobs.every((job) => job.output.acceptedMediaTypes.join(",") === "model/gltf-binary,image/png,image/svg+xml")).toBe(true);
    expect(plan.jobs.every((job) => job.acceptance.mayCarryRules === false)).toBe(true);
  });

  it("binds expression work to authored bytes without making expression part of cartridge identity", () => {
    const first = compileWorldForgePlan(FIRST_CHARTER);
    const changed = structuredClone(FIRST_CHARTER) as Arc;
    changed.meta.description = `${changed.meta.description} Changed authored sentence.`;
    const second = compileWorldForgePlan(changed);

    expect(second.cartridge.digest).not.toBe(first.cartridge.digest);
    expect(second.planDigest).not.toBe(first.planDigest);
    expect(second.jobs.map((entry) => entry.id)).toEqual(first.jobs.map((entry) => entry.id));
  });
  it("generalizes to an unbundled cartridge without acquiring a bundled skin", () => {
    const imported = structuredClone(FIRST_CHARTER) as Arc;
    imported.meta.id = "outside-clean-room-proof";
    imported.meta.name = "Outside Clean Room Proof";
    imported.meta.author = "External Creator";
    const plan = compileWorldForgePlan(imported);

    expect(plan.cartridge.id).toBe("outside-clean-room-proof");
    expect(plan.cartridge.name).toBe("Outside Clean Room Proof");
    expect(plan.jobs.some((entry) => entry.id.startsWith("region:"))).toBe(true);
    expect(plan.jobs.some((entry) => entry.id.startsWith("role:"))).toBe(true);
    expect(plan.jobs.some((entry) => entry.id.startsWith("encounter:"))).toBe(true);
    expect(JSON.stringify(plan)).not.toContain("first-charter");
  });

  it("accepts a complete digest-bound local expression pack", () => {
    const plan = compileWorldForgePlan(FIRST_CHARTER);
    const result = validateWorldExpressionPack(receiptPack(plan), plan);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.pack?.assets).toHaveLength(plan.jobs.length);
  });

  it("accepts mixed GLB, raster, and governed vector producer lanes under one slot contract", () => {
    const plan = compileWorldForgePlan(FIRST_CHARTER);
    const pack = receiptPack(plan);
    pack.assets[0]!.mediaType = "image/png";
    pack.assets[0]!.path = "assets/region.png";
    pack.assets[1]!.mediaType = "image/svg+xml";
    pack.assets[1]!.path = "assets/role.svg";

    const result = validateWorldExpressionPack(pack, plan);
    expect(result.ok).toBe(true);
    expect(result.pack?.assets.map((asset) => asset.mediaType)).toContain("image/png");
    expect(result.pack?.assets.map((asset) => asset.mediaType)).toContain("image/svg+xml");
  });

  it("rejects missing slots, wrong digests, remote paths, and unreceipted licensed inputs", () => {
    const plan = compileWorldForgePlan(FIRST_CHARTER);
    const pack = receiptPack(plan);
    pack.cartridgeDigest = `cart1_${"f".repeat(64)}`;
    pack.assets = pack.assets.slice(1);
    pack.assets[0]!.path = "https://cdn.example.com/model.glb";
    pack.assets[0]!.sourceClass = "licensed";

    const result = validateWorldExpressionPack(pack, plan);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toMatch(/cartridgeDigest/);
    expect(result.errors.join("\n")).toMatch(/missing required slot/);
    expect(result.errors.join("\n")).toMatch(/local and relative/);
    expect(result.errors.join("\n")).toMatch(/requires license and sourceUri/);
  });
  it("supports incremental producer returns without weakening the complete-pack gate", () => {
    const plan = compileWorldForgePlan(FIRST_CHARTER);
    const partial = receiptPack(plan);
    partial.assets = partial.assets.slice(0, 1);
    expect(validateWorldExpressionPack(partial, plan, "partial").ok).toBe(true);
    expect(validateWorldExpressionPack(partial, plan, "complete").ok).toBe(false);
  });
});
