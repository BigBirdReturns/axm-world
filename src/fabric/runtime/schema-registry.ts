import type { InfiniteFabricWorld } from "../contracts.js";

export type FabricEntity = InfiniteFabricWorld["cells"][number]["entities"][number];
export type FabricEntityState = FabricEntity["state"];

export interface FabricRuntimeEvent {
  type: string;
  actorRef?: string;
  targetRefs: string[];
  data: FabricEntityState;
}

export interface FabricTransition {
  changed: boolean;
  state: FabricEntityState;
  events: FabricRuntimeEvent[];
}

export interface FabricBehaviorRuntime {
  schemaRef: string;
  apply(entity: FabricEntity, actionId: string, actorRef?: string): FabricTransition;
}

function unchanged(entity: FabricEntity): FabricTransition {
  return {
    changed: false,
    state: structuredClone(entity.state),
    events: [],
  };
}

function event(
  type: string,
  entity: FabricEntity,
  state: FabricEntityState,
  actorRef?: string,
): FabricRuntimeEvent {
  return {
    type,
    actorRef,
    targetRefs: [entity.id],
    data: structuredClone(state),
  };
}

export class FabricSchemaRegistry {
  readonly #runtimes = new Map<string, FabricBehaviorRuntime>();

  register(runtime: FabricBehaviorRuntime): this {
    if (this.#runtimes.has(runtime.schemaRef)) {
      throw new Error(`Fabric behavior runtime is already registered: ${runtime.schemaRef}`);
    }
    this.#runtimes.set(runtime.schemaRef, runtime);
    return this;
  }

  has(schemaRef: string): boolean {
    return this.#runtimes.has(schemaRef);
  }

  require(schemaRef: string): FabricBehaviorRuntime {
    const runtime = this.#runtimes.get(schemaRef);
    if (!runtime) throw new Error(`Fabric behavior runtime is absent: ${schemaRef}`);
    return runtime;
  }

  ids(): string[] {
    return [...this.#runtimes.keys()].sort();
  }
}

const staticRuntime: FabricBehaviorRuntime = {
  schemaRef: "schema:static",
  apply: unchanged,
};

const collectibleRuntime: FabricBehaviorRuntime = {
  schemaRef: "schema:collectible",
  apply(entity, actionId, actorRef) {
    if (actionId !== "primary" || entity.state.collected === true) return unchanged(entity);
    const state = { ...entity.state, collected: true };
    return {
      changed: true,
      state,
      events: [event("collectible.collected", entity, state, actorRef)],
    };
  },
};

const interactableRuntime: FabricBehaviorRuntime = {
  schemaRef: "schema:interactable",
  apply(entity, actionId, actorRef) {
    if (actionId !== "primary") return unchanged(entity);
    const previous = typeof entity.state.activations === "number" ? entity.state.activations : 0;
    const state = { ...entity.state, activations: previous + 1, active: true };
    return {
      changed: true,
      state,
      events: [event("interactable.activated", entity, state, actorRef)],
    };
  },
};

const npcRuntime: FabricBehaviorRuntime = {
  schemaRef: "schema:npc",
  apply(entity, actionId, actorRef) {
    if (actionId !== "primary") return unchanged(entity);
    const previous = typeof entity.state.relationship === "number" ? entity.state.relationship : 0;
    const state = {
      ...entity.state,
      metPlayer: true,
      engaged: true,
      relationship: previous + 1,
    };
    return {
      changed: true,
      state,
      events: [event("npc.engaged", entity, state, actorRef)],
    };
  },
};

const questRuntime: FabricBehaviorRuntime = {
  schemaRef: "schema:quest",
  apply(entity, actionId, actorRef) {
    if (actionId !== "primary") return unchanged(entity);
    const current = typeof entity.state.status === "string" ? entity.state.status : "offered";
    const status = current === "offered" ? "accepted" : current === "accepted" ? "resolved" : current;
    if (status === current) return unchanged(entity);
    const state = { ...entity.state, status };
    return {
      changed: true,
      state,
      events: [event(`quest.${status}`, entity, state, actorRef)],
    };
  },
};

const portalRuntime: FabricBehaviorRuntime = {
  schemaRef: "schema:portal",
  apply(entity, actionId, actorRef) {
    if (actionId !== "primary") return unchanged(entity);
    const state = { ...entity.state, traversed: true };
    return {
      changed: true,
      state,
      events: [event("portal.traversed", entity, state, actorRef)],
    };
  },
};

const hazardRuntime: FabricBehaviorRuntime = {
  schemaRef: "schema:hazard",
  apply(entity, actionId, actorRef) {
    if (actionId !== "system.activate") return unchanged(entity);
    const state = { ...entity.state, active: true };
    return {
      changed: true,
      state,
      events: [event("hazard.activated", entity, state, actorRef)],
    };
  },
};

const chaserRuntime: FabricBehaviorRuntime = {
  schemaRef: "schema:chaser",
  apply(entity, actionId, actorRef) {
    if (actionId !== "system.acquire") return unchanged(entity);
    const state = { ...entity.state, mode: "pursue", targetRef: actorRef ?? null };
    return {
      changed: true,
      state,
      events: [event("chaser.acquired", entity, state, actorRef)],
    };
  },
};

export function createFabricV0SchemaRegistry(): FabricSchemaRegistry {
  return new FabricSchemaRegistry()
    .register(staticRuntime)
    .register(collectibleRuntime)
    .register(interactableRuntime)
    .register(npcRuntime)
    .register(questRuntime)
    .register(portalRuntime)
    .register(hazardRuntime)
    .register(chaserRuntime);
}
