import {
  type InfiniteFabricWorld,
  validateInfiniteFabricWorld,
} from "../contracts.js";
import { sealWorldRevision } from "./revision.js";

export interface FabricRevisionRecord {
  revisionSha256: string;
  parentRevisionSha256: string | null;
  world: InfiniteFabricWorld;
}

export class MemoryFabricWorldStore {
  readonly #revisions = new Map<string, FabricRevisionRecord>();
  #headRevisionSha256: string | null = null;

  async initialize(world: InfiniteFabricWorld): Promise<InfiniteFabricWorld> {
    if (this.#headRevisionSha256) {
      throw new Error("Fabric world store is already initialized");
    }
    return this.#commit(world, null);
  }

  async commit(
    world: InfiniteFabricWorld,
    expectedParentRevisionSha256: string,
  ): Promise<InfiniteFabricWorld> {
    if (!this.#headRevisionSha256) {
      throw new Error("Fabric world store is not initialized");
    }
    if (this.#headRevisionSha256 !== expectedParentRevisionSha256) {
      throw new Error(
        `Fabric parent revision is stale. Expected ${this.#headRevisionSha256}, observed ${expectedParentRevisionSha256}`,
      );
    }
    return this.#commit(world, expectedParentRevisionSha256);
  }

  current(): InfiniteFabricWorld {
    if (!this.#headRevisionSha256) {
      throw new Error("Fabric world store is not initialized");
    }
    return structuredClone(this.#revisions.get(this.#headRevisionSha256)!.world);
  }

  get(revisionSha256: string): InfiniteFabricWorld | undefined {
    const record = this.#revisions.get(revisionSha256);
    return record ? structuredClone(record.world) : undefined;
  }

  records(): FabricRevisionRecord[] {
    return [...this.#revisions.values()].map((record) => ({
      revisionSha256: record.revisionSha256,
      parentRevisionSha256: record.parentRevisionSha256,
      world: structuredClone(record.world),
    }));
  }

  headRevisionSha256(): string | null {
    return this.#headRevisionSha256;
  }

  async #commit(
    worldInput: InfiniteFabricWorld,
    parentRevisionSha256: string | null,
  ): Promise<InfiniteFabricWorld> {
    const sealed = await sealWorldRevision(worldInput);
    const validation = validateInfiniteFabricWorld(sealed);
    if (!validation.success || !validation.value) {
      const detail = validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
      throw new Error(`Fabric world revision is invalid: ${detail}`);
    }
    if (this.#revisions.has(sealed.revisionSha256)) {
      throw new Error(`Fabric world revision already exists: ${sealed.revisionSha256}`);
    }

    const stored = structuredClone(sealed);
    this.#revisions.set(stored.revisionSha256, {
      revisionSha256: stored.revisionSha256,
      parentRevisionSha256,
      world: stored,
    });
    this.#headRevisionSha256 = stored.revisionSha256;
    return structuredClone(stored);
  }
}
