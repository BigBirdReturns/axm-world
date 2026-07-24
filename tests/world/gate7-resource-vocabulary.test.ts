import { describe, expect, it } from "vitest";
import orchard from "../../cartridges/clean-room/orchard-at-low-tide.arc.json";
import { foundOrganization } from "../../src/engine/founding.js";
import { validateArc } from "../../src/engine/schema.js";
import { compileArcToPlayScene } from "../../src/play-pipeline/compile.js";

describe("generic authored resource vocabulary", () => {
  it("projects both the material quantity and cartridge-authored material name", () => {
    const arc = validateArc(orchard);
    const org = foundOrganization(arc, { format: "axm-founding-input/1", seed: 2707 });
    const scene = compileArcToPlayScene(arc, org);
    expect(scene.resources).toMatchObject({
      currencyName: "Civic Credit",
      materialName: "Rootstock",
      tokenName: "Lanterns",
      reputationName: "Season Standing",
      materials: org.resources.materials,
    });
  });
});
