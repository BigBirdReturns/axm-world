import {
  type InfiniteFabricPatch,
  type InfiniteFabricWorld,
  validateInfiniteFabricPatch,
  validateInfiniteFabricWorld,
} from "../contracts.js";
import { sealWorldRevision } from "./revision.js";

export interface FabricPatchPreview {
  patchId: string;
  parentRevisionSha256: string;
  operationCount: number;
  addedAssets: string[];
  addedCells: string[];
  upsertedEntities: string[];
  removedEntities: string[];
  linkedCells: Array<[string, string]>;
  stateChanges: string[];
  changesLaw: false;
  modifiesLedgerDirectly: false;
  arbitraryRuntimeCode: false;
  requiresHostAcceptance: true;
}

function requireCell(world: InfiniteFabricWorld, cellId: string): InfiniteFabricWorld["cells"][number] {
  const cell = world.cells.find((candidate) => candidate.id === cellId);
  if (!cell) throw new Error(`Fabric cell is absent during accepted patch application: ${cellId}`);
  return cell;
}

function requireEntity(
  cell: InfiniteFabricWorld["cells"][number],
  entityId: string,
): InfiniteFabricWorld["cells"][number]["entities"][number] {
  const entity = cell.entities.find((candidate) => candidate.id === entityId);
  if (!entity) throw new Error(`Fabric entity is absent during accepted patch application: ${entityId}`);
  return entity;
}

export function previewInfiniteFabricPatch(
  worldInput: unknown,
  patchInput: unknown,
): FabricPatchPreview {
  const validation = validateInfiniteFabricPatch(worldInput, patchInput);
  if (!validation.success || !validation.value) {
    const detail = validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
    throw new Error(`Fabric patch is not previewable: ${detail}`);
  }

  const patch = validation.value;
  const preview: FabricPatchPreview = {
    patchId: patch.id,
    parentRevisionSha256: patch.parentRevisionSha256,
    operationCount: patch.operations.length,
    addedAssets: [],
    addedCells: [],
    upsertedEntities: [],
    removedEntities: [],
    linkedCells: [],
    stateChanges: [],
    changesLaw: false,
    modifiesLedgerDirectly: false,
    arbitraryRuntimeCode: false,
    requiresHostAcceptance: true,
  };

  for (const operation of patch.operations) {
    if (operation.op === "add-asset") preview.addedAssets.push(operation.asset.id);
    if (operation.op === "add-cell") preview.addedCells.push(operation.cell.id);
    if (operation.op === "upsert-entity") preview.upsertedEntities.push(operation.entity.id);
    if (operation.op === "remove-entity") preview.removedEntities.push(operation.entityId);
    if (operation.op === "link-cells") preview.linkedCells.push([operation.fromCellId, operation.toCellId]);
    if (operation.op === "set-entity-state") {
      preview.stateChanges.push(`${operation.entityId}.${operation.key}`);
    }
  }

  preview.addedAssets.sort();
  preview.addedCells.sort();
  preview.upsertedEntities.sort();
  preview.removedEntities.sort();
  preview.linkedCells.sort(([leftA, leftB], [rightA, rightB]) =>
    `${leftA}:${leftB}`.localeCompare(`${rightA}:${rightB}`));
  preview.stateChanges.sort();
  return preview;
}

export async function applyAcceptedInfiniteFabricPatch(
  worldInput: InfiniteFabricWorld,
  patchInput: InfiniteFabricPatch,
  acceptedBy: string,
): Promise<InfiniteFabricWorld> {
  const validation = validateInfiniteFabricPatch(worldInput, patchInput);
  if (!validation.success || !validation.value) {
    const detail = validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
    throw new Error(`Fabric patch is not admissible: ${detail}`);
  }
  if (!acceptedBy.trim()) throw new Error("Fabric patch acceptance requires an attributed host seat");

  const patch = validation.value;
  const next: InfiniteFabricWorld = structuredClone(worldInput);
  const parentRevisionSha256 = next.revisionSha256;

  for (const operation of patch.operations) {
    switch (operation.op) {
      case "add-asset":
        next.assets.push(structuredClone(operation.asset));
        break;
      case "add-cell":
        next.cells.push(structuredClone(operation.cell));
        break;
      case "upsert-entity": {
        const cell = requireCell(next, operation.cellId);
        const index = cell.entities.findIndex((entity) => entity.id === operation.entity.id);
        if (index >= 0) cell.entities[index] = structuredClone(operation.entity);
        else cell.entities.push(structuredClone(operation.entity));
        break;
      }
      case "remove-entity": {
        const cell = requireCell(next, operation.cellId);
        const index = cell.entities.findIndex((entity) => entity.id === operation.entityId);
        if (index < 0) throw new Error(`Fabric entity is absent: ${operation.entityId}`);
        cell.entities.splice(index, 1);
        break;
      }
      case "link-cells": {
        const from = requireCell(next, operation.fromCellId);
        const to = requireCell(next, operation.toCellId);
        if (!from.neighbors.includes(to.id)) from.neighbors.push(to.id);
        if (!to.neighbors.includes(from.id)) to.neighbors.push(from.id);
        from.neighbors.sort();
        to.neighbors.sort();
        break;
      }
      case "set-entity-state": {
        const cell = requireCell(next, operation.cellId);
        const entity = requireEntity(cell, operation.entityId);
        entity.state[operation.key] = structuredClone(operation.value);
        break;
      }
    }
  }

  next.cells.sort((left, right) => left.id.localeCompare(right.id));
  next.assets.sort((left, right) => left.id.localeCompare(right.id));
  next.provenance = {
    ...next.provenance,
    sourceWorldRevisionSha256: parentRevisionSha256,
    builder: patch.provenance.builder,
    provider: patch.provenance.provider,
    promptSha256: patch.intent.promptSha256,
  };
  next.ledger.events.push({
    id: `event:authoring:${patch.id}`,
    sequence: next.ledger.events.length,
    type: "authoring.patch.accepted",
    actorRef: acceptedBy,
    targetRefs: [patch.id],
    data: {
      patchId: patch.id,
      operationCount: patch.operations.length,
      provider: patch.provenance.provider,
      model: patch.provenance.model,
      runId: patch.provenance.runId,
    },
    worldRevisionSha256: parentRevisionSha256,
  });

  const sealed = await sealWorldRevision(next);
  const result = validateInfiniteFabricWorld(sealed);
  if (!result.success || !result.value) {
    const detail = result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
    throw new Error(`Accepted Fabric patch produced an invalid world: ${detail}`);
  }
  return result.value;
}
