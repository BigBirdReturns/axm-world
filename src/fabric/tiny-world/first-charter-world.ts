import type { InfiniteFabricWorld } from "../contracts.js";
import { sealWorldRevision, sha256Hex } from "../runtime/revision.js";

const behaviorKinds = [
  ["schema:static", "static"],
  ["schema:collectible", "collectible"],
  ["schema:hazard", "hazard"],
  ["schema:chaser", "chaser"],
  ["schema:interactable", "interactable"],
  ["schema:portal", "portal"],
  ["schema:npc", "npc"],
  ["schema:quest", "quest"],
] as const;

const assetDefinitions = [
  ["asset:tiny-planet", "procedural", "assets/tiny-planet.json"],
  ["asset:first-star", "voxel", "assets/first-star.glb"],
  ["asset:guide", "voxel", "assets/guide.glb"],
  ["asset:contract-marker", "procedural", "assets/contract-marker.json"],
  ["asset:bridge-control", "voxel", "assets/bridge-control.glb"],
  ["asset:storm-front", "procedural", "assets/storm-front.json"],
] as const;

export async function createFirstCharterTinyWorld(): Promise<InfiniteFabricWorld> {
  const behaviorSchemas: InfiniteFabricWorld["behaviorSchemas"] = await Promise.all(
    behaviorKinds.map(async ([id, kind]) => ({
      id,
      kind,
      version: "0.1.0",
      digestSha256: await sha256Hex(`axm-fabric-schema:${id}:0.1.0`),
    })),
  );

  const assets: InfiniteFabricWorld["assets"] = await Promise.all(
    assetDefinitions.map(async ([id, kind, path]) => ({
      id,
      kind,
      path,
      digestSha256: await sha256Hex(`axm-fabric-asset:${id}:v0`),
    })),
  );

  const lawDigest = await sha256Hex("axm-arc:first-charter:tiny-world:v0");
  const promptDigest = await sha256Hex("The First Charter Tiny World authored root");
  const cellDigest = await sha256Hex("The First Charter Tiny World root sphere cell");

  const world: InfiniteFabricWorld = {
    format: "axm-infinite-fabric-world/0",
    id: "world:tiny-planet",
    title: "The First Charter: Tiny World",
    branchId: "branch:first-charter:home",
    revisionSha256: "0".repeat(64),
    rootCellId: "cell:planet:root",
    law: {
      mode: "arc",
      authorityRef: "arc:first-charter",
      authorityDigestSha256: lawDigest,
      receiverMayAuthorOutcomes: false,
    },
    runtime: {
      renderer: "threejs",
      providerRequiredDuringPlay: false,
      networkRequiredDuringPlay: false,
      hostOwnsPersistence: true,
    },
    controls: {
      semanticActions: [
        "move",
        "look",
        "primary",
        "secondary",
        "menu",
        "system.activate",
        "system.acquire",
      ],
    },
    behaviorSchemas,
    assets,
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
          artifactSha256: cellDigest,
        },
        entities: [
          {
            id: "entity:planet:root",
            name: "Tiny World",
            cellId: "cell:planet:root",
            schemaRef: "schema:static",
            transform: {
              position: [0, 0, 0],
              rotation: [0, 0, 0, 1],
              scale: [1, 1, 1],
            },
            assetRefs: ["asset:tiny-planet"],
            state: { visible: true, radius: 24 },
            authority: "fabric-host",
          },
          {
            id: "entity:star:first",
            name: "First Star",
            cellId: "cell:planet:root",
            schemaRef: "schema:collectible",
            transform: {
              position: [0, 25, 0],
              rotation: [0, 0, 0, 1],
              scale: [1, 1, 1],
            },
            assetRefs: ["asset:first-star"],
            state: { collected: false, value: 1 },
            authority: "fabric-host",
          },
          {
            id: "entity:npc:guide",
            name: "Charter Guide",
            cellId: "cell:planet:root",
            schemaRef: "schema:npc",
            transform: {
              position: [4, 23, 2],
              rotation: [0, 0, 0, 1],
              scale: [1, 1, 1],
            },
            assetRefs: ["asset:guide"],
            state: { metPlayer: false, engaged: false, relationship: 0 },
            authority: "fabric-host",
          },
          {
            id: "entity:quest:first-contract",
            name: "The First Contract",
            cellId: "cell:planet:root",
            schemaRef: "schema:quest",
            transform: {
              position: [5, 23, 2],
              rotation: [0, 0, 0, 1],
              scale: [1, 1, 1],
            },
            assetRefs: ["asset:contract-marker"],
            state: { status: "offered", objective: "collect-first-star" },
            authority: "fabric-host",
          },
          {
            id: "entity:bridge:control",
            name: "Bridge Control",
            cellId: "cell:planet:root",
            schemaRef: "schema:interactable",
            transform: {
              position: [-5, 23, 1],
              rotation: [0, 0, 0, 1],
              scale: [1, 1, 1],
            },
            assetRefs: ["asset:bridge-control"],
            state: { active: false, activations: 0 },
            authority: "fabric-host",
          },
          {
            id: "entity:weather:storm-front",
            name: "Dormant Storm Front",
            cellId: "cell:planet:root",
            schemaRef: "schema:hazard",
            transform: {
              position: [0, 32, 0],
              rotation: [0, 0, 0, 1],
              scale: [1, 1, 1],
            },
            assetRefs: ["asset:storm-front"],
            state: { active: false },
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
      builder: "axm-world",
      provider: "none",
      promptSha256: promptDigest,
    },
  };

  return sealWorldRevision(world);
}
