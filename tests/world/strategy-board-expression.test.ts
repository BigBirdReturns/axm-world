import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateArc } from "../../src/engine/schema.js";
import { ILYON_CROWN_TIDES } from "../../src/arcs/ilyon-crown-tides.js";
import { compileProjectionManifest, compileWorldForgePlanV2, validateWorldExpressionPackV2 } from "../../src/world/forge/index.js";
import { resolveStrategyBoardExpression } from "../../src/world/runtime/strategy-board-expression.js";

const EXPECTED_DIGEST = "cart1_ebf62fdf66717901d70428983d9da598b37d75ce4c63831546fe3ccfb5964ba4";
const ROOT = resolve(import.meta.dirname, "../..");
const environmentPath = "src/assets/ilyon/observatory/ilyon-observatory-environment.svg";
const foregroundPath = "src/assets/ilyon/observatory/ilyon-observatory-foreground.svg";
const receipt = (slotId: string, path: string) => {
  const bytes = readFileSync(resolve(ROOT, path));
  return {
    slotId, path, previewPath: path, mediaType: "image/svg+xml" as const,
    sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length,
    producer: "world-forge-v2/project-authored-ilyon-materializer", sourceClass: "project-authored" as const,
  };
};

describe("Strategy Board expression materialization", () => {
  it("binds governed material to the exact World Forge v2 projection", () => {
    const pack = resolveStrategyBoardExpression(ILYON_CROWN_TIDES);
    expect(pack).not.toBeNull();
    expect(pack?.cartridgeDigest).toBe(EXPECTED_DIGEST);
    expect(pack?.planDigest).toMatch(/^wf2_[0-9a-f]{64}$/);
    expect(pack?.producer).toContain("world-forge-v2");
    expect(Object.keys(pack?.slotUrls ?? {}).length).toBeGreaterThan(1);
    expect(pack?.environmentUrl.startsWith("data:image/svg+xml")).toBe(true);
    expect(pack?.standards.human).toContain("Uncrowned%20Compact%20standard");
    expect(pack?.standards.automatic).toContain("Benefactor%20mission%20standard");
  });

  it("forms a complete formal expression-pack receipt for every projection slot", () => {
    const plan = compileWorldForgePlanV2(compileProjectionManifest(ILYON_CROWN_TIDES));
    const formal = {
      format: "rodoh-world-expression-pack/2" as const,
      cartridgeDigest: plan.cartridge.digest,
      planDigest: plan.planDigest,
      assets: plan.jobs.map((job) => receipt(job.id, job.contextId === "world" ? environmentPath : foregroundPath)),
    };
    const result = validateWorldExpressionPackV2(formal, plan, "complete");
    expect(result.ok, result.errors.join("\n")).toBe(true);
  });
  it("falls back neutrally when authored identity changes", () => {
    const changed = validateArc({
      ...structuredClone(ILYON_CROWN_TIDES),
      meta: { ...ILYON_CROWN_TIDES.meta, name: "Different Strategy Board" },
    });
    expect(resolveStrategyBoardExpression(changed)).toBeNull();
  });
});
