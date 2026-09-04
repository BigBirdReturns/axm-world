import {
  type InfiniteFabricWorld,
  validateInfiniteFabricWorld,
} from "../contracts.js";
import type { FabricSchemaRegistry } from "./schema-registry.js";
import { sealWorldRevision } from "./revision.js";

export interface FabricActionReceipt {
  format: "axm-infinite-fabric-action-receipt/0";
  status: "changed" | "unchanged";
  actionId: string;
  actorRef?: string;
  entityId: string;
  schemaRef: string;
  parentRevisionSha256: string;
  worldRevisionSha256: string;
  appendedEventIds: string[];
}

export async function applyFabricSemanticAction(
  worldInput: InfiniteFabricWorld,
  registry: FabricSchemaRegistry,
  entityId: string,
  actionId: string,
  actorRef?: string,
): Promise<{ world: InfiniteFabricWorld; receipt: FabricActionReceipt }> {
  const worldResult = validateInfiniteFabricWorld(worldInput);
  if (!worldResult.success || !worldResult.value) {
    const detail = worldResult.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
    throw new Error(`Fabric world is invalid before action: ${detail}`);
  }

  const parent = worldResult.value;
  const next = structuredClone(parent);
  const cell = next.cells.find((candidate) =>
    candidate.entities.some((entity) => entity.id === entityId));
  if (!cell) throw new Error(`Fabric action target is absent: ${entityId}`);
  const entity = cell.entities.find((candidate) => candidate.id === entityId)!;
  const runtime = registry.require(entity.schemaRef);
  const transition = runtime.apply(structuredClone(entity), actionId, actorRef);

  if (!transition.changed) {
    return {
      world: structuredClone(parent),
      receipt: {
        format: "axm-infinite-fabric-action-receipt/0",
        status: "unchanged",
        actionId,
        actorRef,
        entityId,
        schemaRef: entity.schemaRef,
        parentRevisionSha256: parent.revisionSha256,
        worldRevisionSha256: parent.revisionSha256,
        appendedEventIds: [],
      },
    };
  }

  entity.state = structuredClone(transition.state);
  const appendedEventIds: string[] = [];
  for (const runtimeEvent of transition.events) {
    const eventId = `event:play:${next.ledger.events.length}:${runtimeEvent.type}`;
    next.ledger.events.push({
      id: eventId,
      sequence: next.ledger.events.length,
      type: runtimeEvent.type,
      actorRef: runtimeEvent.actorRef,
      targetRefs: runtimeEvent.targetRefs,
      data: runtimeEvent.data,
      worldRevisionSha256: parent.revisionSha256,
    });
    appendedEventIds.push(eventId);
  }

  const sealed = await sealWorldRevision(next);
  const result = validateInfiniteFabricWorld(sealed);
  if (!result.success || !result.value) {
    const detail = result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
    throw new Error(`Fabric action produced an invalid world: ${detail}`);
  }

  return {
    world: result.value,
    receipt: {
      format: "axm-infinite-fabric-action-receipt/0",
      status: "changed",
      actionId,
      actorRef,
      entityId,
      schemaRef: entity.schemaRef,
      parentRevisionSha256: parent.revisionSha256,
      worldRevisionSha256: result.value.revisionSha256,
      appendedEventIds,
    },
  };
}
