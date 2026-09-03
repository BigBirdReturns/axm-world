import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { InfiniteFabricPatch, InfiniteFabricWorld } from "../contracts.js";
import { applyFabricSemanticAction } from "../runtime/action-transaction.js";
import {
  applyAcceptedInfiniteFabricPatch,
  previewInfiniteFabricPatch,
  type FabricPatchPreview,
} from "../runtime/patch-transaction.js";
import { IndexedDbFabricWorldStore } from "../runtime/persistent-store.js";
import { createFabricV0SchemaRegistry } from "../runtime/schema-registry.js";
import {
  compileTinyWorldCanaryPatch,
  TINY_WORLD_CANARY_PROMPTS,
} from "./canary-patches.js";
import { createFirstCharterTinyWorld } from "./first-charter-world.js";
import { TinyWorldScene } from "./TinyWorldScene.js";

type FabricView = "board" | "map" | "planet" | "play" | "make";

const shellStyle: CSSProperties = {
  width: "100vw",
  height: "100vh",
  overflow: "hidden",
  background: "#070910",
  color: "#f4ecd0",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  display: "grid",
  gridTemplateRows: "auto 1fr auto",
};

const panelStyle: CSSProperties = {
  background: "rgba(12, 15, 25, 0.94)",
  border: "1px solid rgba(232, 207, 132, 0.28)",
  borderRadius: 14,
  boxShadow: "0 18px 44px rgba(0, 0, 0, 0.28)",
};

const buttonStyle: CSSProperties = {
  border: "1px solid rgba(238, 215, 142, 0.36)",
  borderRadius: 999,
  background: "rgba(30, 34, 49, 0.92)",
  color: "#f5e7b0",
  padding: "9px 14px",
  fontWeight: 750,
  letterSpacing: "0.045em",
  cursor: "pointer",
};

function shortDigest(value: string): string {
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

function entityById(world: InfiniteFabricWorld, entityId: string | null) {
  if (!entityId) return undefined;
  for (const cell of world.cells) {
    const entity = cell.entities.find((candidate) => candidate.id === entityId);
    if (entity) return entity;
  }
  return undefined;
}

interface BoardProps {
  world: InfiniteFabricWorld;
}

function BoardView({ world }: BoardProps): JSX.Element {
  const quests = world.cells.flatMap((cell) =>
    cell.entities.filter((entity) => entity.schemaRef === "schema:quest"));
  const relationships = world.cells.flatMap((cell) =>
    cell.entities.filter((entity) => entity.schemaRef === "schema:npc"));
  const collected = world.cells.flatMap((cell) =>
    cell.entities.filter((entity) =>
      entity.schemaRef === "schema:collectible" && entity.state.collected === true));

  return (
    <div style={{ padding: 24, overflow: "auto", display: "grid", gap: 18 }}>
      <section style={{ ...panelStyle, padding: 20 }}>
        <div style={{ fontSize: 12, opacity: 0.65, letterSpacing: "0.12em" }}>THE FIRST CHARTER</div>
        <h1 style={{ margin: "8px 0 4px", fontSize: 32 }}>{world.title}</h1>
        <div style={{ opacity: 0.72 }}>
          One cartridge. One world revision. Board, Map, Planet, and Play are projections of the same state.
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <section style={{ ...panelStyle, padding: 18 }}>
          <div style={{ opacity: 0.62, fontSize: 12 }}>WORLD REVISION</div>
          <strong>{shortDigest(world.revisionSha256)}</strong>
          <div style={{ marginTop: 12, opacity: 0.72 }}>{world.cells.length} cell{world.cells.length === 1 ? "" : "s"}</div>
          <div style={{ opacity: 0.72 }}>{world.ledger.events.length} memory event{world.ledger.events.length === 1 ? "" : "s"}</div>
        </section>
        <section style={{ ...panelStyle, padding: 18 }}>
          <div style={{ opacity: 0.62, fontSize: 12 }}>CONTRACTS</div>
          {quests.map((quest) => (
            <div key={quest.id} style={{ marginTop: 10 }}>
              <strong>{quest.name}</strong>
              <div style={{ opacity: 0.72 }}>status: {String(quest.state.status ?? "offered")}</div>
            </div>
          ))}
        </section>
        <section style={{ ...panelStyle, padding: 18 }}>
          <div style={{ opacity: 0.62, fontSize: 12 }}>WORLD REACTION</div>
          <div style={{ marginTop: 10 }}>Collected: {collected.length}</div>
          {relationships.map((npc) => (
            <div key={npc.id} style={{ marginTop: 8 }}>
              {npc.name}: relationship {String(npc.state.relationship ?? 0)}
            </div>
          ))}
        </section>
      </div>

      <section style={{ ...panelStyle, padding: 18 }}>
        <div style={{ opacity: 0.62, fontSize: 12, marginBottom: 10 }}>MEMORY LEDGER</div>
        {world.ledger.events.length === 0 ? (
          <div style={{ opacity: 0.58 }}>No accepted world event has been recorded yet.</div>
        ) : (
          [...world.ledger.events].reverse().map((event) => (
            <div
              key={event.id}
              style={{ display: "grid", gridTemplateColumns: "60px minmax(180px, 1fr) 1fr", gap: 12, padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span style={{ opacity: 0.55 }}>#{event.sequence}</span>
              <strong>{event.type}</strong>
              <span style={{ opacity: 0.68 }}>{event.targetRefs.join(", ")}</span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function MapView({ world }: BoardProps): JSX.Element {
  return (
    <div style={{ padding: 24, overflow: "auto" }}>
      <section style={{ ...panelStyle, padding: 20 }}>
        <div style={{ opacity: 0.62, fontSize: 12, letterSpacing: "0.1em" }}>CELL GRAPH</div>
        <h1 style={{ margin: "8px 0 18px" }}>One world, {world.cells.length} bounded cell{world.cells.length === 1 ? "" : "s"}</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {world.cells.map((cell) => (
            <article key={cell.id} style={{ border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: 16, background: "rgba(255,255,255,0.025)" }}>
              <strong>{cell.id}</strong>
              <div style={{ marginTop: 8, opacity: 0.72 }}>kind: {cell.kind}</div>
              <div style={{ opacity: 0.72 }}>state: {cell.generation.status}</div>
              <div style={{ opacity: 0.72 }}>entities: {cell.entities.length}</div>
              <div style={{ opacity: 0.72 }}>neighbors: {cell.neighbors.length ? cell.neighbors.join(", ") : "none"}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

interface MakeViewProps {
  world: InfiniteFabricWorld;
  prompt: string;
  setPrompt(value: string): void;
  preview: FabricPatchPreview | null;
  patch: InfiniteFabricPatch | null;
  busy: boolean;
  onCompile(): void;
  onAccept(): void;
  onRefuse(): void;
}

function MakeView({ world, prompt, setPrompt, preview, patch, busy, onCompile, onAccept, onRefuse }: MakeViewProps): JSX.Element {
  return (
    <div style={{ padding: 24, overflow: "auto", display: "grid", gap: 16 }}>
      <section style={{ ...panelStyle, padding: 20 }}>
        <div style={{ opacity: 0.62, fontSize: 12, letterSpacing: "0.1em" }}>MAKE INSIDE THE WORLD</div>
        <h1 style={{ margin: "8px 0" }}>Propose a structured world patch</h1>
        <p style={{ maxWidth: 760, opacity: 0.72, lineHeight: 1.55 }}>
          This branch currently uses a deterministic local canary compiler. It proves the world, patch, preview, acceptance, branch, and memory boundaries before a model provider is connected. The provider interface will replace the compiler without changing the patch contract.
        </p>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={4}
          style={{ width: "100%", maxWidth: 900, boxSizing: "border-box", borderRadius: 12, padding: 14, background: "#0a0d16", color: "#f4ecd0", border: "1px solid rgba(238,215,142,0.3)", font: "inherit", lineHeight: 1.5 }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
          {TINY_WORLD_CANARY_PROMPTS.map((canary) => (
            <button key={canary} type="button" style={{ ...buttonStyle, fontSize: 11 }} onClick={() => setPrompt(canary)}>
              {canary.includes("village") ? "VILLAGE CANARY" : "RAIN CANARY"}
            </button>
          ))}
          <button type="button" style={{ ...buttonStyle, background: "#7f5a25", color: "white" }} disabled={busy} onClick={onCompile}>
            {busy ? "COMPILING…" : "COMPILE PATCH"}
          </button>
        </div>
      </section>

      {preview && patch && (
        <section style={{ ...panelStyle, padding: 20 }}>
          <div style={{ opacity: 0.62, fontSize: 12, letterSpacing: "0.1em" }}>GHOST PREVIEW</div>
          <h2 style={{ margin: "8px 0 16px" }}>{patch.id}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div>cells added: <strong>{preview.addedCells.join(", ") || "none"}</strong></div>
            <div>assets added: <strong>{preview.addedAssets.join(", ") || "none"}</strong></div>
            <div>entities added: <strong>{preview.upsertedEntities.join(", ") || "none"}</strong></div>
            <div>state changes: <strong>{preview.stateChanges.join(", ") || "none"}</strong></div>
          </div>
          <div style={{ marginTop: 18, display: "grid", gap: 6, color: "#a8d7ad" }}>
            <span>law changes: {String(preview.changesLaw)}</span>
            <span>direct provider ledger writes: {String(preview.modifiesLedgerDirectly)}</span>
            <span>arbitrary canonical runtime code: {String(preview.arbitraryRuntimeCode)}</span>
            <span>host acceptance required: {String(preview.requiresHostAcceptance)}</span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button type="button" style={{ ...buttonStyle, background: "#356646", color: "white" }} disabled={busy} onClick={onAccept}>ACCEPT REVISION</button>
            <button type="button" style={buttonStyle} disabled={busy} onClick={onRefuse}>REFUSE</button>
          </div>
        </section>
      )}

      <section style={{ ...panelStyle, padding: 16, opacity: 0.76 }}>
        parent revision: {shortDigest(world.revisionSha256)}
      </section>
    </div>
  );
}

export function TinyWorldRoute(): JSX.Element {
  const [world, setWorld] = useState<InfiniteFabricWorld | null>(null);
  const [view, setView] = useState<FabricView>("planet");
  const [nearbyId, setNearbyId] = useState<string | null>(null);
  const [message, setMessage] = useState("Loading The First Charter Tiny World…");
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState<string>(TINY_WORLD_CANARY_PROMPTS[0]);
  const [patch, setPatch] = useState<InfiniteFabricPatch | null>(null);
  const [preview, setPreview] = useState<FabricPatchPreview | null>(null);
  const storeRef = useRef<IndexedDbFabricWorldStore | null>(null);
  const registry = useMemo(() => createFabricV0SchemaRegistry(), []);

  useEffect(() => {
    let cancelled = false;
    const store = new IndexedDbFabricWorldStore();
    storeRef.current = store;
    void (async () => {
      try {
        await store.open();
        let current = await store.current("world:tiny-planet");
        if (!current) {
          current = await createFirstCharterTinyWorld();
          await store.put(current);
        }
        if (!cancelled) {
          setWorld(current);
          setMessage("Tiny World loaded from creator-owned local persistence.");
        }
      } catch (error) {
        const fallback = await createFirstCharterTinyWorld();
        if (!cancelled) {
          setWorld(fallback);
          setMessage(`Persistent store held; running an ephemeral world: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    })();
    return () => {
      cancelled = true;
      store.close();
      if (storeRef.current === store) storeRef.current = null;
    };
  }, []);

  const persistRevision = useCallback(async (
    next: InfiniteFabricWorld,
    parentRevisionSha256: string,
  ): Promise<void> => {
    const store = storeRef.current;
    if (store) await store.put(next, parentRevisionSha256);
    setWorld(next);
  }, []);

  const handleInteract = useCallback((entityId: string) => {
    if (!world || busy) return;
    setBusy(true);
    void (async () => {
      try {
        const result = await applyFabricSemanticAction(
          world,
          registry,
          entityId,
          "primary",
          "player:home",
        );
        if (result.receipt.status === "changed") {
          await persistRevision(result.world, world.revisionSha256);
          setMessage(`Accepted ${result.receipt.actionId} on ${entityId}; memory advanced.`);
        } else {
          setMessage(`${entityId} did not change for primary action.`);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setBusy(false);
      }
    })();
  }, [busy, persistRevision, registry, world]);

  const compilePatch = useCallback(() => {
    if (!world || busy) return;
    setBusy(true);
    void (async () => {
      try {
        const candidate = await compileTinyWorldCanaryPatch(world, prompt);
        const ghost = previewInfiniteFabricPatch(world, candidate);
        setPatch(candidate);
        setPreview(ghost);
        setMessage(`Patch ${candidate.id} is a proposal. The world is unchanged.`);
      } catch (error) {
        setPatch(null);
        setPreview(null);
        setMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setBusy(false);
      }
    })();
  }, [busy, prompt, world]);

  const acceptPatch = useCallback(() => {
    if (!world || !patch || busy) return;
    setBusy(true);
    void (async () => {
      try {
        const next = await applyAcceptedInfiniteFabricPatch(world, patch, "seat:home-creator");
        await persistRevision(next, world.revisionSha256);
        setMessage(`Accepted ${patch.id}. Revision ${shortDigest(next.revisionSha256)} is now canonical.`);
        setPatch(null);
        setPreview(null);
        setView("planet");
        if (patch.id.includes("village")) setPrompt(TINY_WORLD_CANARY_PROMPTS[1]);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setBusy(false);
      }
    })();
  }, [busy, patch, persistRevision, world]);

  if (!world) {
    return <main style={{ ...shellStyle, placeItems: "center", display: "grid" }}>{message}</main>;
  }

  const nearby = entityById(world, nearbyId);
  const nav: FabricView[] = ["board", "map", "planet", "play", "make"];

  return (
    <main style={shellStyle} data-testid="infinite-fabric-tiny-world">
      <header style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(7,9,16,0.96)", zIndex: 2 }}>
        <a href="./" style={{ ...buttonStyle, textDecoration: "none", fontSize: 11 }}>RODOH</a>
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: "block" }}>AXM INFINITE FABRIC</strong>
          <span style={{ opacity: 0.58, fontSize: 12 }}>The First Charter · {shortDigest(world.revisionSha256)}</span>
        </div>
        <nav style={{ display: "flex", flexWrap: "wrap", gap: 7, marginLeft: "auto" }}>
          {nav.map((item) => (
            <button
              key={item}
              type="button"
              style={{ ...buttonStyle, background: view === item ? "#8b692c" : buttonStyle.background, color: view === item ? "#fff" : buttonStyle.color, fontSize: 11 }}
              onClick={() => setView(item)}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </nav>
      </header>

      <section style={{ minHeight: 0, position: "relative" }}>
        {view === "board" && <BoardView world={world} />}
        {view === "map" && <MapView world={world} />}
        {(view === "planet" || view === "play") && (
          <div style={{ width: "100%", height: "100%" }}>
            <TinyWorldScene
              world={world}
              interactive={view === "play"}
              onInteract={handleInteract}
              onNearby={setNearbyId}
            />
            <div style={{ ...panelStyle, position: "absolute", left: 16, bottom: 16, padding: 14, maxWidth: 420, pointerEvents: "none" }}>
              <strong>{view === "play" ? "PLAY" : "PLANET"}</strong>
              <div style={{ marginTop: 5, opacity: 0.72 }}>
                {view === "play"
                  ? "WASD / arrows or left stick. E, Space, Enter, or gamepad A performs PRIMARY."
                  : "The planet is a projection of the same revision shown in Board and Map."}
              </div>
              {nearby && <div style={{ marginTop: 8, color: "#ffe49a" }}>Nearby: {nearby.name}</div>}
            </div>
            {view === "play" && nearby && (
              <button
                type="button"
                disabled={busy}
                onClick={() => handleInteract(nearby.id)}
                style={{ ...buttonStyle, position: "absolute", right: 18, bottom: 18, background: "#8b692c", color: "white" }}
              >
                PRIMARY · {nearby.name}
              </button>
            )}
          </div>
        )}
        {view === "make" && (
          <MakeView
            world={world}
            prompt={prompt}
            setPrompt={setPrompt}
            preview={preview}
            patch={patch}
            busy={busy}
            onCompile={compilePatch}
            onAccept={acceptPatch}
            onRefuse={() => {
              setPatch(null);
              setPreview(null);
              setMessage("Patch refused. Canonical world state is unchanged.");
            }}
          />
        )}
      </section>

      <footer style={{ padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(7,9,16,0.97)", fontSize: 12, display: "flex", gap: 14, justifyContent: "space-between" }}>
        <span style={{ opacity: 0.72 }}>{message}</span>
        <span style={{ opacity: 0.5 }}>provider during play: none · network during play: none</span>
      </footer>
    </main>
  );
}
