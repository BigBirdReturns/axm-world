import { describe, expect, it } from "vitest";
import type { InfiniteFabricPatch } from "../../src/fabric/contracts.js";
import { applyFabricSemanticAction } from "../../src/fabric/runtime/action-transaction.js";
import {
  applyAcceptedInfiniteFabricPatch,
  previewInfiniteFabricPatch,
} from "../../src/fabric/runtime/patch-transaction.js";
import { sha256Hex } from "../../src/fabric/runtime/revision.js";
import { createFabricV0SchemaRegistry } from "../../src/fabric/runtime/schema-registry.js";
import { MemoryFabricWorldStore } from "../../src/fabric/runtime/world-store.js";
import { createFirstCharterTinyWorld } from "../../src/fabric/tiny-world/first-charter-world.js";

async function villagePatch(parentRevisionSha256: string): Promise<InfiniteFabricPatch> {
  const prompt = "Add a small village on the north side with a bridge and a shy shopkeeper.";
  return {
    format: "axm-infinite-fabric-patch/0",
    id: "patch:add-north-village",
    worldId: "world:tiny-planet",
    parentRevisionSha256,
    intent: {
      prompt,
      promptSha256: await sha256Hex(prompt),
    },
    operations: [
      {
        op: "add-asset",
        asset: {
          id: "asset:village:north",
          kind: "voxel",
          digestSha256: await sha256Hex("asset:village:north:v0"),
          path: "assets/village-north.glb",
        },
      },
      {
        op: "add-asset",
        asset: {
          id: "asset:shopkeeper",
          kind: "voxel",
          digestSha256: await sha256Hex("asset:shopkeeper:v0"),
          path: "assets/shopkeeper.glb",
        },
      },
      {
        op: "add-cell",
        cell: {
          id: "cell:village:north",
          kind: "sphere-patch",
          seed: 11,
          neighbors: [],
          space: {
            anchor: [0, 0.8, 0.6],
            extent: [20, 8, 20],
          },
          generation: {
            status: "generated",
            provider: "provider-a",
            promptSha256: await sha256Hex(prompt),
            artifactSha256: await sha256Hex("cell:village:north:v0"),
          },
          entities: [
            {
              id: "entity:village:north",
              name: "North Village",
              cellId: "cell:village:north",
              schemaRef: "schema:static",
              transform: {
                position: [0, 0, 0],
                rotation: [0, 0, 0, 1],
                scale: [1, 1, 1],
              },
              assetRefs: ["asset:village:north"],
              state: { visible: true },
              authority: "fabric-host",
            },
          ],
        },
      },
      {
        op: "link-cells",
        fromCellId: "cell:planet:root",
        toCellId: "cell:village:north",
      },
      {
        op: "upsert-entity",
        cellId: "cell:village:north",
        entity: {
          id: "entity:npc:shopkeeper",
          name: "Shy Shopkeeper",
          cellId: "cell:village:north",
          schemaRef: "schema:npc",
          transform: {
            position: [2, 1, 3],
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
          },
          assetRefs: ["asset:shopkeeper"],
          state: { mood: "shy", metPlayer: false, relationship: 0 },
          authority: "fabric-host",
        },
      },
      {
        op: "upsert-entity",
        cellId: "cell:village:north",
        entity: {
          id: "entity:quest:bridge-repair",
          name: "Repair the Village Bridge",
          cellId: "cell:village:north",
          schemaRef: "schema:quest",
          transform: {
            position: [3, 1, 3],
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
          },
          assetRefs: ["asset:contract-marker"],
          state: { status: "offered", objective: "repair-bridge" },
          authority: "fabric-host",
        },
      },
    ],
    provenance: {
      builder: "fabric-compiler",
      provider: "provider-a",
      model: "model-a",
      runId: "run:village:001",
    },
    authority: {
      proposalOnly: true,
      requiresHostAcceptance: true,
      changesLaw: false,
      modifiesLedgerDirectly: false,
      arbitraryRuntimeCode: false,
      networkRequiredDuringPlay: false,
    },
  };
}

describe("Infinite Fabric runtime floor", () => {
  it("materializes The First Charter Tiny World as one ARC-bound offline revision", async () => {
    const world = await createFirstCharterTinyWorld();
    expect(world.id).toBe("world:tiny-planet");
    expect(world.law.mode).toBe("arc");
    expect(world.law.receiverMayAuthorOutcomes).toBe(false);
    expect(world.runtime.providerRequiredDuringPlay).toBe(false);
    expect(world.runtime.networkRequiredDuringPlay).toBe(false);
    expect(world.cells).toHaveLength(1);
    expect(world.revisionSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes schema-owned state and appends a host event for a player action", async () => {
    const world = await createFirstCharterTinyWorld();
    const registry = createFabricV0SchemaRegistry();
    const result = await applyFabricSemanticAction(
      world,
      registry,
      "entity:star:first",
      "primary",
      "player:home",
    );

    const star = result.world.cells[0]?.entities.find((entity) => entity.id === "entity:star:first");
    expect(result.receipt.status).toBe("changed");
    expect(star?.state.collected).toBe(true);
    expect(result.world.ledger.events).toHaveLength(1);
    expect(result.world.ledger.events[0]?.type).toBe("collectible.collected");
    expect(result.world.revisionSha256).not.toBe(world.revisionSha256);
  });

  it("previews, accepts, branches, and retains the prior Tiny World revision", async () => {
    const store = new MemoryFabricWorldStore();
    const initial = await store.initialize(await createFirstCharterTinyWorld());
    const patch = await villagePatch(initial.revisionSha256);
    const preview = previewInfiniteFabricPatch(initial, patch);

    expect(preview.addedCells).toEqual(["cell:village:north"]);
    expect(preview.upsertedEntities).toContain("entity:npc:shopkeeper");
    expect(preview.changesLaw).toBe(false);
    expect(preview.arbitraryRuntimeCode).toBe(false);

    const accepted = await applyAcceptedInfiniteFabricPatch(initial, patch, "seat:home-creator");
    const committed = await store.commit(accepted, initial.revisionSha256);

    expect(committed.cells.some((cell) => cell.id === "cell:village:north")).toBe(true);
    expect(committed.ledger.events.at(-1)?.type).toBe("authoring.patch.accepted");
    expect(committed.law).toEqual(initial.law);
    expect(store.get(initial.revisionSha256)?.cells).toHaveLength(1);
    expect(store.records()).toHaveLength(2);
  });

  it("refuses to commit a patch against a stale parent revision", async () => {
    const store = new MemoryFabricWorldStore();
    const initial = await store.initialize(await createFirstCharterTinyWorld());
    const patch = await villagePatch(initial.revisionSha256);
    const accepted = await applyAcceptedInfiniteFabricPatch(initial, patch, "seat:home-creator");
    await store.commit(accepted, initial.revisionSha256);

    await expect(store.commit(accepted, initial.revisionSha256)).rejects.toThrow("stale");
  });
});
