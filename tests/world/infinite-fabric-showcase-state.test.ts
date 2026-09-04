import { describe, expect, it } from "vitest";
import { applyFabricSemanticAction } from "../../src/fabric/runtime/action-transaction.js";
import { applyAcceptedInfiniteFabricPatch } from "../../src/fabric/runtime/patch-transaction.js";
import { createFabricV0SchemaRegistry } from "../../src/fabric/runtime/schema-registry.js";
import {
  compileTinyWorldCanaryPatch,
  TINY_WORLD_CANARY_PROMPTS,
} from "../../src/fabric/tiny-world/canary-patches.js";
import { createFirstCharterTinyWorld } from "../../src/fabric/tiny-world/first-charter-world.js";

describe("Infinite Fabric showcase moments", () => {
  it("materializes root, star, village, and rain revisions through valid host transactions", async () => {
    const root = await createFirstCharterTinyWorld();
    const registry = createFabricV0SchemaRegistry();

    const starResult = await applyFabricSemanticAction(
      root,
      registry,
      "entity:star:first",
      "primary",
      "player:showcase",
    );
    expect(starResult.receipt.status).toBe("changed");
    expect(starResult.world.ledger.events.at(-1)?.type).toBe("collectible.collected");

    const villagePatch = await compileTinyWorldCanaryPatch(
      starResult.world,
      TINY_WORLD_CANARY_PROMPTS[0],
    );
    const village = await applyAcceptedInfiniteFabricPatch(
      starResult.world,
      villagePatch,
      "seat:showcase-director",
    );
    expect(village.cells.some((cell) => cell.id === "cell:village:north")).toBe(true);
    expect(village.ledger.events.at(-1)?.type).toBe("authoring.patch.accepted");

    const rainPatch = await compileTinyWorldCanaryPatch(
      village,
      TINY_WORLD_CANARY_PROMPTS[1],
    );
    expect(rainPatch.operations).toContainEqual({
      op: "set-entity-state",
      cellId: "cell:planet:root",
      entityId: "entity:bridge:control",
      key: "requires-repair",
      value: true,
    });

    const rain = await applyAcceptedInfiniteFabricPatch(
      village,
      rainPatch,
      "seat:showcase-director",
    );
    const rootCell = rain.cells.find((cell) => cell.id === "cell:planet:root");
    const bridge = rootCell?.entities.find((entity) => entity.id === "entity:bridge:control");
    const storm = rootCell?.entities.find((entity) => entity.id === "entity:weather:storm-front");

    expect(bridge?.state["requires-repair"]).toBe(true);
    expect(bridge?.state.active).toBe(false);
    expect(storm?.state.active).toBe(true);
    expect(rain.ledger.events.filter((event) => event.type === "authoring.patch.accepted")).toHaveLength(2);
    expect(rain.revisionSha256).not.toBe(village.revisionSha256);
  });
});
