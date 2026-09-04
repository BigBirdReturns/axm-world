import type { InfiniteFabricPatch, InfiniteFabricWorld } from "../contracts.js";
import { sha256Hex } from "../runtime/revision.js";

const VILLAGE_PROMPT = "Add a small village on the north side with a bridge and a shy shopkeeper.";
const RAIN_PROMPT = "Make heavy rain wash out the bridge unless the player repairs it.";

export const TINY_WORLD_CANARY_PROMPTS = [VILLAGE_PROMPT, RAIN_PROMPT] as const;

async function villagePatch(world: InfiniteFabricWorld, prompt: string): Promise<InfiniteFabricPatch> {
  if (world.cells.some((cell) => cell.id === "cell:village:north")) {
    throw new Error("The north village already exists in this world revision");
  }
  const promptSha256 = await sha256Hex(prompt);
  return {
    format: "axm-infinite-fabric-patch/0",
    id: "patch:add-north-village",
    worldId: world.id,
    parentRevisionSha256: world.revisionSha256,
    intent: { prompt, promptSha256 },
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
            anchor: [0.52, 0.81, 0.27],
            extent: [20, 8, 20],
          },
          generation: {
            status: "generated",
            provider: "local-canary-compiler",
            promptSha256,
            artifactSha256: await sha256Hex("cell:village:north:v0"),
          },
          entities: [
            {
              id: "entity:village:north",
              name: "North Village",
              cellId: "cell:village:north",
              schemaRef: "schema:static",
              transform: {
                position: [12, 20, 6],
                rotation: [0, 0, 0, 1],
                scale: [1, 1, 1],
              },
              assetRefs: ["asset:village:north"],
              state: { visible: true, buildingCount: 5 },
              authority: "fabric-host",
            },
          ],
        },
      },
      {
        op: "link-cells",
        fromCellId: world.rootCellId,
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
            position: [13, 20, 6],
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
          },
          assetRefs: ["asset:shopkeeper"],
          state: { mood: "shy", metPlayer: false, engaged: false, relationship: 0 },
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
            position: [14, 20, 6],
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
      builder: "axm-fabric-canary-compiler",
      provider: "local-canary-compiler",
      model: "deterministic-fixture",
      runId: `run:village:${world.revisionSha256.slice(0, 12)}`,
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

async function rainPatch(world: InfiniteFabricWorld, prompt: string): Promise<InfiniteFabricPatch> {
  if (!world.cells.some((cell) => cell.id === "cell:village:north")) {
    throw new Error("The rain revision requires the accepted north village branch");
  }
  const promptSha256 = await sha256Hex(prompt);
  return {
    format: "axm-infinite-fabric-patch/0",
    id: "patch:rain-bridge-repair",
    worldId: world.id,
    parentRevisionSha256: world.revisionSha256,
    intent: { prompt, promptSha256 },
    operations: [
      {
        op: "set-entity-state",
        cellId: "cell:planet:root",
        entityId: "entity:weather:storm-front",
        key: "active",
        value: true,
      },
      {
        op: "set-entity-state",
        cellId: "cell:planet:root",
        entityId: "entity:bridge:control",
        key: "requires-repair",
        value: true,
      },
      {
        op: "set-entity-state",
        cellId: "cell:planet:root",
        entityId: "entity:bridge:control",
        key: "active",
        value: false,
      },
      {
        op: "set-entity-state",
        cellId: "cell:village:north",
        entityId: "entity:quest:bridge-repair",
        key: "status",
        value: "offered",
      },
    ],
    provenance: {
      builder: "axm-fabric-canary-compiler",
      provider: "local-canary-compiler",
      model: "deterministic-fixture",
      runId: `run:rain:${world.revisionSha256.slice(0, 12)}`,
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

export async function compileTinyWorldCanaryPatch(
  world: InfiniteFabricWorld,
  prompt: string,
): Promise<InfiniteFabricPatch> {
  const normalized = prompt.trim().toLocaleLowerCase();
  if (normalized.includes("village") || normalized.includes("shopkeeper")) {
    return villagePatch(world, prompt);
  }
  if (normalized.includes("rain") || normalized.includes("bridge")) {
    return rainPatch(world, prompt);
  }
  throw new Error("The local canary compiler currently supports the village and rain proving prompts only");
}
