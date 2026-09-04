import type { InfiniteFabricWorld } from "../contracts.js";
import { validateInfiniteFabricWorld } from "../contracts.js";

const DATABASE_NAME = "axm-infinite-fabric-v0";
const DATABASE_VERSION = 1;
const REVISIONS_STORE = "revisions";
const HEADS_STORE = "heads";

interface FabricHeadRecord {
  worldId: string;
  revisionSha256: string;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
  });
}

export class IndexedDbFabricWorldStore {
  readonly #databaseName: string;
  #database: IDBDatabase | null = null;

  constructor(databaseName = DATABASE_NAME) {
    this.#databaseName = databaseName;
  }

  async open(): Promise<void> {
    if (this.#database) return;
    const request = indexedDB.open(this.#databaseName, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(REVISIONS_STORE)) {
        database.createObjectStore(REVISIONS_STORE, { keyPath: "revisionSha256" });
      }
      if (!database.objectStoreNames.contains(HEADS_STORE)) {
        database.createObjectStore(HEADS_STORE, { keyPath: "worldId" });
      }
    };
    this.#database = await requestResult(request);
  }

  async put(worldInput: InfiniteFabricWorld, expectedParentRevisionSha256?: string): Promise<void> {
    await this.open();
    const validation = validateInfiniteFabricWorld(worldInput);
    if (!validation.success || !validation.value) {
      const detail = validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
      throw new Error(`Fabric world is invalid: ${detail}`);
    }
    const world = validation.value;
    const database = this.#database!;
    const transaction = database.transaction([REVISIONS_STORE, HEADS_STORE], "readwrite");
    const revisions = transaction.objectStore(REVISIONS_STORE);
    const heads = transaction.objectStore(HEADS_STORE);
    const existingHead = await requestResult(heads.get(world.id) as IDBRequest<FabricHeadRecord | undefined>);

    if (expectedParentRevisionSha256 !== undefined) {
      const observed = existingHead?.revisionSha256;
      if (observed !== expectedParentRevisionSha256) {
        transaction.abort();
        throw new Error(`Fabric persistent parent is stale. Expected ${observed ?? "none"}, observed ${expectedParentRevisionSha256}`);
      }
    } else if (existingHead) {
      transaction.abort();
      throw new Error(`Fabric world is already initialized: ${world.id}`);
    }

    revisions.put(structuredClone(world));
    heads.put({ worldId: world.id, revisionSha256: world.revisionSha256 } satisfies FabricHeadRecord);
    await transactionComplete(transaction);
  }

  async current(worldId: string): Promise<InfiniteFabricWorld | undefined> {
    await this.open();
    const database = this.#database!;
    const transaction = database.transaction([REVISIONS_STORE, HEADS_STORE], "readonly");
    const heads = transaction.objectStore(HEADS_STORE);
    const revisions = transaction.objectStore(REVISIONS_STORE);
    const head = await requestResult(heads.get(worldId) as IDBRequest<FabricHeadRecord | undefined>);
    if (!head) return undefined;
    const world = await requestResult(revisions.get(head.revisionSha256) as IDBRequest<InfiniteFabricWorld | undefined>);
    return world ? structuredClone(world) : undefined;
  }

  async get(revisionSha256: string): Promise<InfiniteFabricWorld | undefined> {
    await this.open();
    const transaction = this.#database!.transaction(REVISIONS_STORE, "readonly");
    const world = await requestResult(
      transaction.objectStore(REVISIONS_STORE).get(revisionSha256) as IDBRequest<InfiniteFabricWorld | undefined>,
    );
    return world ? structuredClone(world) : undefined;
  }

  close(): void {
    this.#database?.close();
    this.#database = null;
  }
}
