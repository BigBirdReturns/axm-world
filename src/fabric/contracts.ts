import { z } from "zod";

const FabricIdSchema = z.string().regex(/^[a-z0-9][a-z0-9:._/-]{0,191}$/);
const Sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);
const NumberSchema = z.number().finite();
const Vec3Schema = z.tuple([NumberSchema, NumberSchema, NumberSchema]);
const QuaternionSchema = z.tuple([NumberSchema, NumberSchema, NumberSchema, NumberSchema]);
const LocalPathSchema = z.string().min(1).max(512).refine((value) => {
  const normalized = value.replaceAll("\\", "/");
  return !normalized.startsWith("/")
    && !/^[a-zA-Z]:/.test(normalized)
    && !/^[a-zA-Z]+:\/\//.test(normalized)
    && !normalized.split("/").includes("..");
}, "Path must remain relative and beneath the world package");

const StateScalarSchema = z.union([
  z.string().max(512),
  NumberSchema,
  z.boolean(),
  z.null(),
]);

export const FabricStateValueSchema = z.union([
  StateScalarSchema,
  z.array(StateScalarSchema).max(64),
]);

export const FABRIC_V0_BEHAVIOR_KINDS = [
  "static",
  "collectible",
  "hazard",
  "chaser",
  "interactable",
  "portal",
  "npc",
  "quest",
  "vehicle",
  "resource",
  "weather",
] as const;

export const FabricLawSchema = z.object({
  mode: z.enum(["arc", "fabric-schema"]),
  authorityRef: FabricIdSchema,
  authorityDigestSha256: Sha256Schema,
  receiverMayAuthorOutcomes: z.literal(false),
}).strict();

export const FabricBehaviorSchemaRefSchema = z.object({
  id: FabricIdSchema,
  kind: z.enum(FABRIC_V0_BEHAVIOR_KINDS),
  version: z.string().regex(/^0\.[0-9]+\.[0-9]+$/),
  digestSha256: Sha256Schema,
}).strict();

export const FabricAssetRefSchema = z.object({
  id: FabricIdSchema,
  kind: z.enum([
    "procedural",
    "voxel",
    "mesh",
    "splat",
    "texture",
    "shape-field",
    "audio",
  ]),
  digestSha256: Sha256Schema,
  path: LocalPathSchema,
  collisionAssetRef: FabricIdSchema.optional(),
}).strict();

export const FabricTransformSchema = z.object({
  position: Vec3Schema,
  rotation: QuaternionSchema,
  scale: Vec3Schema,
}).strict();

export const FabricEntitySchema = z.object({
  id: FabricIdSchema,
  name: z.string().min(1).max(160),
  cellId: FabricIdSchema,
  schemaRef: FabricIdSchema,
  transform: FabricTransformSchema,
  assetRefs: z.array(FabricIdSchema).max(16),
  state: z.record(FabricStateValueSchema),
  authority: z.literal("fabric-host"),
}).strict();

export const FabricCellSchema = z.object({
  id: FabricIdSchema,
  kind: z.enum(["sphere-patch", "local-volume", "interior", "connector"]),
  seed: z.number().int().nonnegative(),
  neighbors: z.array(FabricIdSchema).max(32),
  space: z.object({
    anchor: Vec3Schema,
    extent: Vec3Schema,
  }).strict(),
  generation: z.object({
    status: z.enum(["authored", "generated", "materialized"]),
    provider: z.string().min(1).max(128).optional(),
    promptSha256: Sha256Schema.optional(),
    artifactSha256: Sha256Schema,
  }).strict(),
  entities: z.array(FabricEntitySchema).max(4096),
}).strict();

export const FabricLedgerEventSchema = z.object({
  id: FabricIdSchema,
  sequence: z.number().int().nonnegative(),
  type: FabricIdSchema,
  actorRef: FabricIdSchema.optional(),
  targetRefs: z.array(FabricIdSchema).max(32),
  data: z.record(FabricStateValueSchema),
  worldRevisionSha256: Sha256Schema,
}).strict();

export const InfiniteFabricWorldSchema = z.object({
  format: z.literal("axm-infinite-fabric-world/0"),
  id: FabricIdSchema,
  title: z.string().min(1).max(160),
  branchId: FabricIdSchema,
  revisionSha256: Sha256Schema,
  rootCellId: FabricIdSchema,
  law: FabricLawSchema,
  runtime: z.object({
    renderer: z.enum(["threejs", "playcanvas", "unity"]),
    providerRequiredDuringPlay: z.literal(false),
    networkRequiredDuringPlay: z.literal(false),
    hostOwnsPersistence: z.literal(true),
  }).strict(),
  controls: z.object({
    semanticActions: z.array(FabricIdSchema).min(1).max(64),
  }).strict(),
  behaviorSchemas: z.array(FabricBehaviorSchemaRefSchema).min(1).max(256),
  assets: z.array(FabricAssetRefSchema).max(16384),
  cells: z.array(FabricCellSchema).min(1).max(4096),
  ledger: z.object({
    appendOnly: z.literal(true),
    events: z.array(FabricLedgerEventSchema).max(100000),
  }).strict(),
  provenance: z.object({
    sourceCartridgeRef: FabricIdSchema.optional(),
    sourceWorldRevisionSha256: Sha256Schema.optional(),
    builder: z.string().min(1).max(128),
    provider: z.string().min(1).max(128),
    promptSha256: Sha256Schema,
  }).strict(),
}).strict();

const AddAssetOperationSchema = z.object({
  op: z.literal("add-asset"),
  asset: FabricAssetRefSchema,
}).strict();

const AddCellOperationSchema = z.object({
  op: z.literal("add-cell"),
  cell: FabricCellSchema,
}).strict();

const UpsertEntityOperationSchema = z.object({
  op: z.literal("upsert-entity"),
  cellId: FabricIdSchema,
  entity: FabricEntitySchema,
}).strict();

const RemoveEntityOperationSchema = z.object({
  op: z.literal("remove-entity"),
  cellId: FabricIdSchema,
  entityId: FabricIdSchema,
}).strict();

const LinkCellsOperationSchema = z.object({
  op: z.literal("link-cells"),
  fromCellId: FabricIdSchema,
  toCellId: FabricIdSchema,
}).strict();

const SetEntityStateOperationSchema = z.object({
  op: z.literal("set-entity-state"),
  cellId: FabricIdSchema,
  entityId: FabricIdSchema,
  key: FabricIdSchema,
  value: FabricStateValueSchema,
}).strict();

export const FabricPatchOperationSchema = z.discriminatedUnion("op", [
  AddAssetOperationSchema,
  AddCellOperationSchema,
  UpsertEntityOperationSchema,
  RemoveEntityOperationSchema,
  LinkCellsOperationSchema,
  SetEntityStateOperationSchema,
]);

export const InfiniteFabricPatchSchema = z.object({
  format: z.literal("axm-infinite-fabric-patch/0"),
  id: FabricIdSchema,
  worldId: FabricIdSchema,
  parentRevisionSha256: Sha256Schema,
  intent: z.object({
    prompt: z.string().min(1).max(8000),
    promptSha256: Sha256Schema,
  }).strict(),
  operations: z.array(FabricPatchOperationSchema).min(1).max(1024),
  provenance: z.object({
    builder: z.string().min(1).max(128),
    provider: z.string().min(1).max(128),
    model: z.string().min(1).max(128),
    runId: z.string().min(1).max(192),
  }).strict(),
  authority: z.object({
    proposalOnly: z.literal(true),
    requiresHostAcceptance: z.literal(true),
    changesLaw: z.literal(false),
    modifiesLedgerDirectly: z.literal(false),
    arbitraryRuntimeCode: z.literal(false),
    networkRequiredDuringPlay: z.literal(false),
  }).strict(),
}).strict();

export type InfiniteFabricWorld = z.infer<typeof InfiniteFabricWorldSchema>;
export type InfiniteFabricPatch = z.infer<typeof InfiniteFabricPatchSchema>;

export interface FabricValidationIssue {
  path: string;
  message: string;
}

export interface FabricValidationResult<T> {
  success: boolean;
  value?: T;
  issues: FabricValidationIssue[];
}

function zodIssues(error: z.ZodError): FabricValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function validateInfiniteFabricWorld(input: unknown): FabricValidationResult<InfiniteFabricWorld> {
  const parsed = InfiniteFabricWorldSchema.safeParse(input);
  if (!parsed.success) return { success: false, issues: zodIssues(parsed.error) };

  const world = parsed.data;
  const issues: FabricValidationIssue[] = [];
  const schemaIds = new Set<string>();
  const assetIds = new Set<string>();
  const cellIds = new Set<string>();
  const entityIds = new Set<string>();

  for (const schema of world.behaviorSchemas) {
    if (schemaIds.has(schema.id)) {
      issues.push({ path: "behaviorSchemas", message: `Duplicate behavior schema: ${schema.id}` });
    }
    schemaIds.add(schema.id);
  }

  for (const asset of world.assets) {
    if (assetIds.has(asset.id)) {
      issues.push({ path: "assets", message: `Duplicate asset: ${asset.id}` });
    }
    assetIds.add(asset.id);
  }

  for (const asset of world.assets) {
    if (asset.collisionAssetRef && !assetIds.has(asset.collisionAssetRef)) {
      issues.push({
        path: `assets.${asset.id}.collisionAssetRef`,
        message: `Unknown collision asset: ${asset.collisionAssetRef}`,
      });
    }
  }

  for (const cell of world.cells) {
    if (cellIds.has(cell.id)) {
      issues.push({ path: "cells", message: `Duplicate cell: ${cell.id}` });
    }
    cellIds.add(cell.id);
  }

  if (!cellIds.has(world.rootCellId)) {
    issues.push({ path: "rootCellId", message: `Root cell does not exist: ${world.rootCellId}` });
  }

  const cellsById = new Map(world.cells.map((cell) => [cell.id, cell]));
  for (const cell of world.cells) {
    for (const neighbor of cell.neighbors) {
      if (!cellIds.has(neighbor)) {
        issues.push({ path: `cells.${cell.id}.neighbors`, message: `Unknown neighbor: ${neighbor}` });
      }
      const reciprocal = cellsById.get(neighbor);
      if (reciprocal && !reciprocal.neighbors.includes(cell.id)) {
        issues.push({
          path: `cells.${cell.id}.neighbors`,
          message: `Neighbor link is not reciprocal: ${cell.id} -> ${neighbor}`,
        });
      }
    }

    for (const entity of cell.entities) {
      if (entity.cellId !== cell.id) {
        issues.push({
          path: `cells.${cell.id}.entities.${entity.id}.cellId`,
          message: `Entity cellId ${entity.cellId} differs from containing cell ${cell.id}`,
        });
      }
      if (entityIds.has(entity.id)) {
        issues.push({ path: "cells.entities", message: `Duplicate entity: ${entity.id}` });
      }
      entityIds.add(entity.id);
      if (!schemaIds.has(entity.schemaRef)) {
        issues.push({
          path: `cells.${cell.id}.entities.${entity.id}.schemaRef`,
          message: `Unknown behavior schema: ${entity.schemaRef}`,
        });
      }
      for (const assetRef of entity.assetRefs) {
        if (!assetIds.has(assetRef)) {
          issues.push({
            path: `cells.${cell.id}.entities.${entity.id}.assetRefs`,
            message: `Unknown asset: ${assetRef}`,
          });
        }
      }
    }
  }

  for (const [index, event] of world.ledger.events.entries()) {
    if (event.sequence !== index) {
      issues.push({
        path: `ledger.events.${index}.sequence`,
        message: `Ledger sequence must be contiguous from zero; observed ${event.sequence}`,
      });
    }
  }

  return {
    success: issues.length === 0,
    value: issues.length === 0 ? world : undefined,
    issues,
  };
}

export function validateInfiniteFabricPatch(
  worldInput: unknown,
  patchInput: unknown,
): FabricValidationResult<InfiniteFabricPatch> {
  const worldResult = validateInfiniteFabricWorld(worldInput);
  if (!worldResult.success || !worldResult.value) {
    return { success: false, issues: worldResult.issues };
  }

  const parsed = InfiniteFabricPatchSchema.safeParse(patchInput);
  if (!parsed.success) return { success: false, issues: zodIssues(parsed.error) };

  const world = worldResult.value;
  const patch = parsed.data;
  const issues: FabricValidationIssue[] = [];

  if (patch.worldId !== world.id) {
    issues.push({ path: "worldId", message: `Patch targets ${patch.worldId}, expected ${world.id}` });
  }
  if (patch.parentRevisionSha256 !== world.revisionSha256) {
    issues.push({ path: "parentRevisionSha256", message: "Patch parent revision is stale" });
  }

  const knownSchemas = new Set(world.behaviorSchemas.map((schema) => schema.id));
  const existingCells = new Map(world.cells.map((cell) => [cell.id, cell]));
  const stagedCells = new Set(existingCells.keys());
  const stagedAssets = new Set(world.assets.map((asset) => asset.id));

  for (const operation of patch.operations) {
    if (operation.op === "add-asset") {
      if (stagedAssets.has(operation.asset.id)) {
        issues.push({ path: "operations.add-asset", message: `Asset already exists: ${operation.asset.id}` });
      }
      stagedAssets.add(operation.asset.id);
    }
    if (operation.op === "add-cell") stagedCells.add(operation.cell.id);
  }

  for (const operation of patch.operations) {
    if (operation.op === "add-asset") continue;

    if (operation.op === "add-cell") {
      if (existingCells.has(operation.cell.id)) {
        issues.push({ path: "operations.add-cell", message: `Cell already exists: ${operation.cell.id}` });
      }
      for (const entity of operation.cell.entities) {
        if (!knownSchemas.has(entity.schemaRef)) {
          issues.push({
            path: `operations.add-cell.${operation.cell.id}.entities.${entity.id}.schemaRef`,
            message: `Unknown behavior schema: ${entity.schemaRef}`,
          });
        }
        for (const assetRef of entity.assetRefs) {
          if (!stagedAssets.has(assetRef)) {
            issues.push({
              path: `operations.add-cell.${operation.cell.id}.entities.${entity.id}.assetRefs`,
              message: `Unknown asset: ${assetRef}`,
            });
          }
        }
      }
      continue;
    }

    if (operation.op === "upsert-entity") {
      if (!stagedCells.has(operation.cellId)) {
        issues.push({
          path: "operations.upsert-entity.cellId",
          message: `Unknown cell: ${operation.cellId}`,
        });
      }
      if (operation.entity.cellId !== operation.cellId) {
        issues.push({
          path: "operations.upsert-entity.entity.cellId",
          message: "Entity cellId differs from operation cellId",
        });
      }
      if (!knownSchemas.has(operation.entity.schemaRef)) {
        issues.push({
          path: "operations.upsert-entity.entity.schemaRef",
          message: `Unknown behavior schema: ${operation.entity.schemaRef}`,
        });
      }
      for (const assetRef of operation.entity.assetRefs) {
        if (!stagedAssets.has(assetRef)) {
          issues.push({
            path: "operations.upsert-entity.entity.assetRefs",
            message: `Unknown asset: ${assetRef}`,
          });
        }
      }
      continue;
    }

    if (operation.op === "link-cells") {
      if (operation.fromCellId === operation.toCellId) {
        issues.push({ path: "operations.link-cells", message: "A cell cannot link to itself" });
      }
      for (const cellId of [operation.fromCellId, operation.toCellId]) {
        if (!stagedCells.has(cellId)) {
          issues.push({ path: "operations.link-cells", message: `Unknown cell: ${cellId}` });
        }
      }
      continue;
    }

    const cell = existingCells.get(operation.cellId);
    if (!cell) {
      issues.push({
        path: `operations.${operation.op}.cellId`,
        message: `Unknown existing cell: ${operation.cellId}`,
      });
      continue;
    }
    if (!cell.entities.some((entity) => entity.id === operation.entityId)) {
      issues.push({
        path: `operations.${operation.op}.entityId`,
        message: `Unknown existing entity: ${operation.entityId}`,
      });
    }
  }

  return {
    success: issues.length === 0,
    value: issues.length === 0 ? patch : undefined,
    issues,
  };
}
