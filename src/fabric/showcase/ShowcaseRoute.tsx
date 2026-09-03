import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { CLASSIC_TRIALS } from "../classics/catalog.js";
import type { InfiniteFabricPatch, InfiniteFabricWorld } from "../contracts.js";
import { applyFabricSemanticAction } from "../runtime/action-transaction.js";
import { applyAcceptedInfiniteFabricPatch } from "../runtime/patch-transaction.js";
import { createFabricV0SchemaRegistry } from "../runtime/schema-registry.js";
import {
  compileTinyWorldCanaryPatch,
  TINY_WORLD_CANARY_PROMPTS,
} from "../tiny-world/canary-patches.js";
import { createFirstCharterTinyWorld } from "../tiny-world/first-charter-world.js";
import { ShowcaseAudio, type ShowcaseCue } from "./audio.js";
import { ClassicMontage } from "./ClassicMontage.js";
import {
  SHOWCASE_CHAPTERS,
  chapterIndexById,
  clampShowcaseIndex,
  type ShowcaseChapter,
} from "./timeline.js";
import { WorldShowcase } from "./WorldShowcase.js";
import "./showcase.css";

interface ShowcaseMoments {
  root: InfiniteFabricWorld;
  star: InfiniteFabricWorld;
  village: InfiniteFabricWorld;
  rain: InfiniteFabricWorld;
  villagePatch: InfiniteFabricPatch;
  rainPatch: InfiniteFabricPatch;
}

const MONO: CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};

async function buildShowcaseMoments(): Promise<ShowcaseMoments> {
  const root = await createFirstCharterTinyWorld();
  const registry = createFabricV0SchemaRegistry();
  const starResult = await applyFabricSemanticAction(
    root,
    registry,
    "entity:star:first",
    "primary",
    "player:showcase",
  );
  const star = starResult.world;
  const villagePatch = await compileTinyWorldCanaryPatch(star, TINY_WORLD_CANARY_PROMPTS[0]);
  const village = await applyAcceptedInfiniteFabricPatch(star, villagePatch, "seat:showcase-director");
  const rainPatch = await compileTinyWorldCanaryPatch(village, TINY_WORLD_CANARY_PROMPTS[1]);
  const rain = await applyAcceptedInfiniteFabricPatch(village, rainPatch, "seat:showcase-director");
  return { root, star, village, rain, villagePatch, rainPatch };
}

function worldForChapter(moments: ShowcaseMoments, chapter: ShowcaseChapter): InfiniteFabricWorld {
  return moments[chapter.worldMoment];
}

function shortDigest(value: string): string {
  return `${value.slice(0, 9)}…${value.slice(-6)}`;
}

function cueForChapter(chapter: ShowcaseChapter): ShowcaseCue {
  if (chapter.scene === "materialize") return "accept";
  if (chapter.scene === "classics" || chapter.scene === "memory") return "seal";
  if (chapter.scene === "custody") return "custody";
  if (chapter.scene === "hero") return "open";
  return "advance";
}

function ProofRail({ world }: { world: InfiniteFabricWorld }): JSX.Element {
  return (
    <aside className="showcase-proof-rail" aria-label="Live system proof">
      <div className="showcase-proof" data-tone="gold"><span>world revision</span><strong>{shortDigest(world.revisionSha256)}</strong></div>
      <div className="showcase-proof" data-tone="blue"><span>bounded cells</span><strong>{world.cells.length}</strong></div>
      <div className="showcase-proof" data-tone="green"><span>memory events</span><strong>{world.ledger.events.length}</strong></div>
      <div className="showcase-proof" data-tone="green"><span>runtime provider</span><strong>none</strong></div>
      <div className="showcase-proof" data-tone="green"><span>network during play</span><strong>off</strong></div>
    </aside>
  );
}

function ProjectionScene({ world }: { world: InfiniteFabricWorld }): JSX.Element {
  const cards = [
    ["BOARD", `${world.cells.length} cells · ${world.ledger.events.length} memories`],
    ["MAP", `${world.cells.reduce((count, cell) => count + cell.neighbors.length, 0) / 2} live connections`],
    ["PLANET", "The same stable entities in space"],
    ["PLAY", "Semantic input, accepted consequence"],
  ] as const;
  return (
    <div className="showcase-center-stage showcase-projection-grid" data-testid="showcase-projections">
      {cards.map(([name, detail]) => (
        <article key={name} className="showcase-projection-card">
          <strong>{name}</strong>
          <span>{detail}</span>
        </article>
      ))}
    </div>
  );
}

function MakeScene({ patch, progress }: { patch: InfiniteFabricPatch; progress: number }): JSX.Element {
  const promptLength = Math.max(1, Math.floor(patch.intent.prompt.length * Math.min(1, progress * 1.7)));
  const typedPrompt = patch.intent.prompt.slice(0, promptLength);
  const visibleOperations = Math.max(1, Math.ceil(patch.operations.length * Math.max(0.1, (progress - 0.22) / 0.62)));
  return (
    <div className="showcase-center-stage showcase-make-grid" data-testid="showcase-make">
      <section className="showcase-panel showcase-prompt">
        <span className="showcase-prompt-label">creator intent</span>
        <div className="showcase-prompt-text">
          “{typedPrompt}”
          {typedPrompt.length < patch.intent.prompt.length && <span className="showcase-cursor" aria-hidden="true" />}
        </div>
        <div style={{ ...MONO, color: "rgba(247,237,207,0.48)", fontSize: 11 }}>
          context: nearby cells + known schemas + relevant memory
        </div>
      </section>
      <section className="showcase-panel showcase-patch" aria-label="Structured patch preview">
        <div className="showcase-prompt-label">axm-infinite-fabric-patch/0</div>
        {patch.operations.slice(0, visibleOperations).map((operation, index) => {
          const target = operation.op === "add-cell"
            ? operation.cell.id
            : operation.op === "add-asset"
              ? operation.asset.id
              : operation.op === "upsert-entity"
                ? operation.entity.id
                : operation.op === "remove-entity"
                  ? operation.entityId
                  : operation.op === "link-cells"
                    ? `${operation.fromCellId} ↔ ${operation.toCellId}`
                    : `${operation.entityId}.${operation.key}`;
          return (
            <div key={`${operation.op}:${target}`} className="showcase-op" style={{ animationDelay: `${index * 78}ms` }}>
              <code>{operation.op}</code>
              <strong>{target}</strong>
              <span>VALID</span>
            </div>
          );
        })}
        <div style={{ ...MONO, display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6, color: "rgba(143,207,154,0.88)", fontSize: 10 }}>
          <span>changesLaw=false</span>
          <span>arbitraryRuntimeCode=false</span>
          <span>hostAcceptance=true</span>
        </div>
      </section>
    </div>
  );
}

function MaterializeScene({ world }: { world: InfiniteFabricWorld }): JSX.Element {
  return (
    <>
      <div className="showcase-world"><WorldShowcase world={world} moment="village" intensity={1.05} /></div>
      <div className="showcase-accept-flash" data-testid="showcase-accepted-revision">
        revision accepted · village functional · prior branch retained
      </div>
    </>
  );
}

function MemoryScene({ world }: { world: InfiniteFabricWorld }): JSX.Element {
  const events = [
    ...world.ledger.events,
    ...CLASSIC_TRIALS.slice(0, 3).map((trial, index) => ({
      id: `event:story:${trial.id}`,
      sequence: world.ledger.events.length + index,
      type: "story.classic-trial.completed",
      actorRef: "player:home",
      targetRefs: [trial.id],
      data: { seal: trial.seal },
      worldRevisionSha256: world.revisionSha256,
    })),
  ];
  return (
    <div className="showcase-center-stage showcase-ledger" data-testid="showcase-memory">
      <section className="showcase-panel showcase-seals">
        {CLASSIC_TRIALS.map((trial, index) => (
          <div key={trial.id} className="showcase-seal" style={{ animationDelay: `${index * 180}ms` }}>
            <div><strong>{trial.seal}</strong><span>SEAL {trial.chapter}</span></div>
          </div>
        ))}
      </section>
      <section className="showcase-panel showcase-ledger-list">
        <div className="showcase-prompt-label">append-only world memory</div>
        {events.slice(-7).map((event) => (
          <div key={event.id} className="showcase-ledger-row">
            <span>#{event.sequence}</span>
            <strong>{event.type}</strong>
            <span>BOUND</span>
          </div>
        ))}
      </section>
    </div>
  );
}

function ProvidersScene(): JSX.Element {
  const providers = [
    {
      sigil: "AI",
      title: "Reasoning and code",
      body: "Muse, OpenAI, Anthropic, Gemini, and local models propose the same structured patch contract.",
    },
    {
      sigil: "3D",
      title: "World and asset generation",
      body: "Voxel, mesh, splat, image, audio, and Shape Field providers contribute content-addressed artifacts.",
    },
    {
      sigil: "RUN",
      title: "Receivers and controls",
      body: "Three.js, Unity, WebXR, MotionDeck, ScreenGhost, television, and Quest consume stable world and action surfaces.",
    },
  ] as const;
  return (
    <div className="showcase-center-stage showcase-provider-grid" data-testid="showcase-providers">
      {providers.map((provider) => (
        <article key={provider.title} className="showcase-provider">
          <div className="showcase-provider-orb">{provider.sigil}</div>
          <strong>{provider.title}</strong>
          <p>{provider.body}</p>
        </article>
      ))}
    </div>
  );
}

function CustodyScene({ world }: { world: InfiniteFabricWorld }): JSX.Element {
  return (
    <div className="showcase-center-stage showcase-custody" data-testid="showcase-custody">
      <section className="showcase-panel showcase-package">
        <div className="showcase-prompt-label">portable world package</div>
        <div className="showcase-package-line"><span>format</span><span>axm-infinite-fabric-world/0</span></div>
        <div className="showcase-package-line"><span>world</span><span>{world.id}</span></div>
        <div className="showcase-package-line"><span>revision</span><span>{world.revisionSha256}</span></div>
        <div className="showcase-package-line"><span>law</span><span>{world.law.mode} · {world.law.authorityRef}</span></div>
        <div className="showcase-package-line"><span>contents</span><span>{world.cells.length} cells · {world.assets.length} assets · {world.ledger.events.length} events</span></div>
        <div className="showcase-package-line"><span>runtime</span><span>{world.runtime.renderer} · host-owned persistence</span></div>
      </section>
      <section className="showcase-panel showcase-offline">
        <div className="showcase-prompt-label">custody test</div>
        <div className="showcase-offline-state"><span>generation provider</span><strong>DISCONNECTED</strong></div>
        <div className="showcase-offline-state"><span>external network</span><strong>DISABLED</strong></div>
        <div className="showcase-offline-state"><span>world revision</span><strong>VERIFIED</strong></div>
        <div className="showcase-offline-state"><span>play and memory</span><strong>CONTINUING</strong></div>
      </section>
    </div>
  );
}

function SceneStage({ moments, chapter, progress }: { moments: ShowcaseMoments; chapter: ShowcaseChapter; progress: number }): JSX.Element {
  const world = worldForChapter(moments, chapter);
  switch (chapter.scene) {
    case "hero":
      return <div className="showcase-world"><WorldShowcase world={world} moment="root" /></div>;
    case "projections":
      return (
        <>
          <div className="showcase-world" style={{ opacity: 0.32 }}><WorldShowcase world={world} moment="star" /></div>
          <ProjectionScene world={world} />
        </>
      );
    case "make":
      return (
        <>
          <div className="showcase-world" style={{ opacity: 0.2 }}><WorldShowcase world={world} moment="star" /></div>
          <MakeScene patch={moments.villagePatch} progress={progress} />
        </>
      );
    case "materialize":
      return <MaterializeScene world={world} />;
    case "classics":
      return <div className="showcase-center-stage"><ClassicMontage /></div>;
    case "memory":
      return <MemoryScene world={world} />;
    case "providers":
      return <ProvidersScene />;
    case "custody":
      return <CustodyScene world={world} />;
  }
}

export function ShowcaseRoute(): JSX.Element {
  const params = useMemo(() => new URLSearchParams(globalThis.location?.search ?? ""), []);
  const initialChapter = chapterIndexById(params.get("chapter"));
  const autoplayRequested = params.get("autoplay") === "1";
  const [moments, setMoments] = useState<ShowcaseMoments | null>(null);
  const [chapterIndex, setChapterIndex] = useState(initialChapter);
  const [started, setStarted] = useState(autoplayRequested);
  const [playing, setPlaying] = useState(autoplayRequested);
  const [loop, setLoop] = useState(params.get("loop") !== "0");
  const [clean, setClean] = useState(params.get("clean") === "1");
  const [sound, setSound] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const audioRef = useRef<ShowcaseAudio | null>(null);
  const startedAtRef = useRef(0);
  const pausedElapsedRef = useRef(0);
  const chapter = SHOWCASE_CHAPTERS[chapterIndex] ?? SHOWCASE_CHAPTERS[0]!;

  useEffect(() => {
    audioRef.current = new ShowcaseAudio();
    void buildShowcaseMoments().then(setMoments);
    return () => audioRef.current?.close();
  }, []);

  const selectChapter = useCallback((nextIndex: number, cue = true) => {
    const clamped = clampShowcaseIndex(nextIndex);
    pausedElapsedRef.current = 0;
    startedAtRef.current = performance.now();
    setElapsedMs(0);
    setChapterIndex(clamped);
    const next = SHOWCASE_CHAPTERS[clamped] ?? SHOWCASE_CHAPTERS[0]!;
    if (cue) void audioRef.current?.cue(cueForChapter(next));
  }, []);

  const advance = useCallback(() => {
    if (chapterIndex >= SHOWCASE_CHAPTERS.length - 1) {
      if (loop) selectChapter(0);
      else setPlaying(false);
      return;
    }
    selectChapter(chapterIndex + 1);
  }, [chapterIndex, loop, selectChapter]);

  const retreat = useCallback(() => {
    selectChapter(chapterIndex - 1);
  }, [chapterIndex, selectChapter]);

  useEffect(() => {
    if (!started || !playing) return;
    startedAtRef.current = performance.now() - pausedElapsedRef.current;
    let frame = 0;
    const tick = (time: number): void => {
      const elapsed = time - startedAtRef.current;
      setElapsedMs(elapsed);
      if (elapsed >= chapter.durationMs) {
        pausedElapsedRef.current = 0;
        advance();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [advance, chapter.durationMs, chapterIndex, playing, started]);

  useEffect(() => {
    if (playing) return;
    pausedElapsedRef.current = Math.min(elapsedMs, chapter.durationMs);
  }, [chapter.durationMs, elapsedMs, playing]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent): void => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === "ArrowRight") {
        event.preventDefault();
        advance();
      } else if (event.code === "ArrowLeft") {
        event.preventDefault();
        retreat();
      } else if (event.code === "Space") {
        event.preventDefault();
        setPlaying((value) => !value);
      } else if (event.code === "KeyR") {
        event.preventDefault();
        selectChapter(0);
        setPlaying(true);
      } else if (event.code === "KeyC") {
        event.preventDefault();
        setClean((value) => !value);
      } else if (event.code === "KeyF") {
        event.preventDefault();
        void document.documentElement.requestFullscreen?.();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [advance, retreat, selectChapter]);

  const start = useCallback(async (withSound: boolean) => {
    setStarted(true);
    setPlaying(true);
    setSound(withSound);
    await audioRef.current?.setEnabled(withSound);
    selectChapter(chapterIndex, false);
    if (withSound) await audioRef.current?.cue("open");
  }, [chapterIndex, selectChapter]);

  const toggleSound = useCallback(async () => {
    const next = !sound;
    setSound(next);
    await audioRef.current?.setEnabled(next);
    if (next) await audioRef.current?.cue("advance");
  }, [sound]);

  if (!moments) {
    return (
      <main className="showcase-root" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ ...MONO, color: "rgba(247,237,207,0.62)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          materializing showcase world…
        </div>
      </main>
    );
  }

  const world = worldForChapter(moments, chapter);
  const chapterProgress = Math.max(0, Math.min(1, elapsedMs / chapter.durationMs));
  const overallProgress = ((chapterIndex + chapterProgress) / SHOWCASE_CHAPTERS.length) * 100;
  const progressStyle = { "--showcase-progress": `${overallProgress}%` } as CSSProperties;

  return (
    <main
      className={`showcase-root${clean ? " showcase-clean" : ""}`}
      data-testid="infinite-fabric-showcase"
      data-chapter={chapter.id}
    >
      <section className="showcase-stage" key={chapter.id}>
        <SceneStage moments={moments} chapter={chapter} progress={chapterProgress} />
      </section>

      <div className="showcase-copy" data-wide={chapter.scene === "providers" || chapter.scene === "custody"} key={`copy:${chapter.id}`}>
        <div className="showcase-index">{chapter.indexLabel} · {chapter.eyebrow}</div>
        <h1 className="showcase-title">{chapter.title}</h1>
        <p className="showcase-body">{chapter.body}</p>
        <div className="showcase-claim">{chapter.claim}</div>
      </div>

      <ProofRail world={world} />

      <footer className="showcase-controls" aria-label="Showcase director controls">
        <div className="showcase-control-group">
          <button className="showcase-button" type="button" onClick={retreat}>← back</button>
          <button className="showcase-button" type="button" onClick={() => setPlaying((value) => !value)}>
            {playing ? "pause" : "play"}
          </button>
          <button className="showcase-button" type="button" onClick={advance}>next →</button>
        </div>
        <div className="showcase-progress" style={progressStyle} aria-label={`Showcase progress ${Math.round(overallProgress)} percent`}>
          <span />
          <div className="showcase-chapter-dots">
            {SHOWCASE_CHAPTERS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className="showcase-chapter-dot"
                data-passed={index <= chapterIndex}
                aria-label={`Go to ${item.title}`}
                onClick={() => selectChapter(index)}
                style={{ pointerEvents: "auto", padding: 0, cursor: "pointer" }}
              />
            ))}
          </div>
        </div>
        <div className="showcase-control-group" style={{ justifyContent: "flex-end" }}>
          <button className="showcase-button" type="button" onClick={toggleSound}>{sound ? "sound on" : "sound off"}</button>
          <button className="showcase-button" type="button" onClick={() => setLoop((value) => !value)}>{loop ? "loop on" : "loop off"}</button>
          <button className="showcase-button" type="button" onClick={() => setClean((value) => !value)}>capture</button>
          <button className="showcase-button" type="button" onClick={() => void document.documentElement.requestFullscreen?.()}>full</button>
        </div>
      </footer>

      {!started && (
        <div className="showcase-start" data-testid="showcase-start">
          <section className="showcase-start-card">
            <div className="showcase-index" style={{ justifyContent: "center" }}>AXM INFINITE FABRIC</div>
            <h1>Run the world, not the pitch.</h1>
            <p>
              This deterministic showcase drives the actual Tiny World contracts, structured patches, classic game engines, revisions, and memory. Use arrows to move between chapters, Space to pause, C for clean capture, and F for fullscreen.
            </p>
            <div className="showcase-start-actions">
              <button className="showcase-button showcase-start-primary" type="button" onClick={() => void start(true)}>start with sound</button>
              <button className="showcase-button" type="button" onClick={() => void start(false)}>start muted</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
