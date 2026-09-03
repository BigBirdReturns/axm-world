import { describe, expect, it } from "vitest";
import {
  InfiniteFabricPatchSchema,
  validateInfiniteFabricPatch,
  validateInfiniteFabricWorld,
} from "../../src/fabric/contracts.js";

const digest = (character: string) => character.repeat(64);

const tinyWorld = {
  format: "axm-infinite-fabric-world/0",
  id: "world:tiny-planet",
  title: "Tiny World",
  branchId: "branch:home",
  revisionSha256: digest("a"),
  rootCellId: "cell:planet:root",
  runtime: {
    renderer: "threejs",
    providerRequiredDuringPlay: false,
    networkRequiredDuringPlay: false,
    hostOwnsPersistence: true,
  },
  controls: {
    semanticActions: ["move", "look", "primary", "secondary", "menu"],
  },
  behaviorSchemas: [
    {
      id: "schema:collectible",
      kind: "collectible",
      version: "0.1.0",
      digestSha256: digest("b"),
    },
    {
      id: "schema:npc",
      kind: "npc",
      version: "0.1.0",
      digestSha256: digest("c"),
    },
  ],
  assets: [
    {
      id: "asset:planet",
      kind: "procedural",
      digestSha256: digest("d"),
      path: "assets/planet.json",
    },
    {
      id: "asset:star",
      kind: "voxel",
      digestSha256: digest("e"),
      path: "assets/star.glb",
    },
    {
      id: "asset:villager",
      kind: "voxel",
      digestSha256: digest("f"),
      path: "assets/villager.glb",
    },
  ],
  cells: [
    {
      id: "cell:planet:root",
      kind: "sphere-patch",
      seed: 7,
      neighbors: [],
      space: {
        anchor: [0, 1, 0],
        extent: [32, 8, 32],
      },
      generation: {
        status: "authored",
        artifactSha256: digest("1"),
      },
      entities: [
        {
          id: "entity:star:001",
          name: "First Star",
          cellId: "cell:planet:root",
          schemaRef: "schema:collectible",
          transform: {
            position: [0, 4, 0],
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
          },
          assetRefs: ["asset:star"],
          state: { collected: false },
          authority: "fabric-host",
        },
      ],
    },
  ],
  ledger: {
    appendOnly: true,
    events: [],
  },
  provenance: {
    sourceCartridgeRef: "cartridge:first-charter",
    builder: "axm-fabric-fixture",
    provider: "none",
    promptSha256: digest("2"),
  },
};

const villagePatch = {
  format: "axm-infinite-fabric-patch/0",
  id: "patch:add-north-village",
  worldId: "world:tiny-planet",
  parentRevisionSha256: digest("a"),
  intent: {
    prompt: "Add a small village on the north side with a shy shopkeeper.",
    promptSha256: digest("3"),
  },
  operations: [
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
          provider: "provider-under-test",
          promptSha256: digest("3"),
          artifactSha256: digest("4"),
        },
        entities: [],
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
        assetRefs: ["asset:villager"],
        state: { mood: "shy", metPlayer: false },
        authority: "fabric-host",
      },
    },
  ],
  provenance: {
    builder: "fabric-compiler",
    provider: "provider-under-test",
    model: "model-under-test",
    runId: "run:village:001",
  },
  authority: {
    proposalOnly: true,
    requiresHostAcceptance: true,
    modifiesLedgerDirectly: false,
    arbitraryRuntimeCode: false,
    networkRequiredDuringPlay: false,
  },
};

describe("AXM Infinite Fabric contracts", () => {
  it("admits the original Tiny World shape as a provider-independent persistent world", () => {
    const result = validateInfiniteFabricWorld(tinyWorld);
    expect(result.success).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.value?.runtime.providerRequiredDuringPlay).toBe(false);
    expect(result.value?.ledger.appendOnly).toBe(true);
  });

  it("admits a generated village as a proposed structured patch", () => {
    const result = validateInfiniteFabricPatch(tinyWorld, villagePatch);
    expect(result.success).toBe(true);
    expect(result.value?.authority.proposalOnly).toBe(true);
    expect(result.value?.authority.arbitraryRuntimeCode).toBe(false);
    expect(result.value?.operations.some((operation) => operation.op === "add-cell")).toBe(true);
  });

  it("refuses a model proposal that asks to become runtime code", () => {
    const unsafe = structuredClone(villagePatch);
    unsafe.authority.arbitraryRuntimeCode = true;
    expect(() => InfiniteFabricPatchSchema.parse(unsafe)).toThrow();
  });

  it("refuses stale patches and unknown behavior schemas", () => {
    const stale = structuredClone(villagePatch);
    stale.parentRevisionSha256 = digest("9");
    const staleResult = validateInfiniteFabricPatch(tinyWorld, stale);
    expect(staleResult.success).toBe(false);
    expect(staleResult.issues.some((issue) => issue.path === "parentRevisionSha256")).toBe(true);

    const unknown = structuredClone(villagePatch);
    const upsert = unknown.operations.find((operation) => operation.op === "upsert-entity");
    if (!upsert || upsert.op !== "upsert-entity") throw new Error("fixture upsert is absent");
    upsert.entity.schemaRef = "schema:unknown";
    const unknownResult = validateInfiniteFabricPatch(tinyWorld, unknown);
    expect(unknownResult.success).toBe(false);
    expect(unknownResult.issues.some((issue) => issue.message.includes("Unknown behavior schema"))).toBe(true);
  });
});
