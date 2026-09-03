import { useEffect, useMemo, useRef, useState } from "react";
import {
  CLASSIC_TRIALS,
  CLASSIC_TRIAL_BY_ID,
  type ClassicTrialId,
} from "../classics/catalog.js";
import {
  CLASSIC_HEIGHT,
  CLASSIC_WIDTH,
  createClassicGame,
  getClassicHud,
  renderClassicGame,
  stepClassicGame,
  type ClassicGameState,
  type ClassicInput,
} from "../classics/engine.js";

function seedFor(id: ClassicTrialId): number {
  let seed = 0x51f15e;
  for (const character of id) seed = (Math.imul(seed, 33) ^ character.charCodeAt(0)) >>> 0;
  return seed;
}

function attractInput(id: ClassicTrialId, time: number, state: ClassicGameState): ClassicInput {
  switch (id) {
    case "balance-of-oaths":
      return { x: 0, y: Math.sin(time * 1.38), primary: false, secondary: false };
    case "wall-of-terms":
      return {
        x: Math.sin(time * 0.92),
        y: 0,
        primary: state.id === "wall-of-terms" && !state.launched,
        secondary: false,
      };
    case "serpent-of-memory": {
      const phase = Math.floor(time / 2.4) % 4;
      return {
        x: phase === 0 ? 1 : phase === 2 ? -1 : 0,
        y: phase === 1 ? 1 : phase === 3 ? -1 : 0,
        primary: false,
        secondary: false,
      };
    }
    case "swarm-at-the-gate":
      return {
        x: Math.sin(time * 1.08),
        y: 0,
        primary: Math.sin(time * 8.2) > -0.15,
        secondary: false,
      };
    case "courier-beyond-the-charter":
      return {
        x: Math.sin(time * 0.74) * 0.82,
        y: 0.85,
        primary: Math.sin(time * 6.6) > 0.05,
        secondary: false,
      };
  }
}

function TrialCanvas({ trialId }: { trialId: ClassicTrialId }): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<ClassicGameState>(createClassicGame(trialId, seedFor(trialId)));
  const resetAtRef = useRef<number | null>(null);
  const [hudDetail, setHudDetail] = useState(() => getClassicHud(gameRef.current).detail);

  useEffect(() => {
    gameRef.current = createClassicGame(trialId, seedFor(trialId));
    resetAtRef.current = null;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let frame = 0;
    let lastTime = performance.now();
    let lastHud = lastTime;

    const tick = (time: number): void => {
      const delta = Math.min(0.035, (time - lastTime) / 1000);
      lastTime = time;
      const game = gameRef.current;
      const elapsed = time / 1000;
      if (game.status === "playing") {
        stepClassicGame(game, attractInput(trialId, elapsed, game), delta);
      } else if (resetAtRef.current === null) {
        resetAtRef.current = time + 1100;
      } else if (time >= resetAtRef.current) {
        gameRef.current = createClassicGame(trialId, seedFor(trialId) ^ Math.floor(time));
        resetAtRef.current = null;
      }

      renderClassicGame(context, gameRef.current, CLASSIC_WIDTH, CLASSIC_HEIGHT);
      if (time - lastHud > 420) {
        setHudDetail(getClassicHud(gameRef.current).detail);
        lastHud = time;
      }
      frame = requestAnimationFrame(tick);
    };

    renderClassicGame(context, gameRef.current, CLASSIC_WIDTH, CLASSIC_HEIGHT);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [trialId]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        width={CLASSIC_WIDTH}
        height={CLASSIC_HEIGHT}
        aria-label={`${CLASSIC_TRIAL_BY_ID.get(trialId)?.title ?? trialId} attract-mode game surface`}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          borderRadius: 18,
          background: "#05070c",
          boxShadow: "0 26px 80px rgba(0,0,0,0.48)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 16,
          top: 14,
          borderRadius: 999,
          padding: "7px 10px",
          background: "rgba(5,7,12,0.72)",
          border: "1px solid rgba(255,232,151,0.18)",
          color: "rgba(255,239,190,0.78)",
          font: "600 11px ui-monospace, SFMono-Regular, Menlo, monospace",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {hudDetail}
      </div>
    </div>
  );
}

export function ClassicMontage(): JSX.Element {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = CLASSIC_TRIALS[activeIndex] ?? CLASSIC_TRIALS[0]!;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % CLASSIC_TRIALS.length);
    }, 2700);
    return () => window.clearInterval(interval);
  }, []);

  const seals = useMemo(() => CLASSIC_TRIALS.map((trial) => trial.seal), []);

  return (
    <div
      data-testid="showcase-classic-montage"
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(210px, 0.34fr)",
        gap: 18,
        alignItems: "stretch",
      }}
    >
      <section
        style={{
          minWidth: 0,
          minHeight: 0,
          display: "grid",
          gridTemplateRows: "auto minmax(0, 1fr)",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 18 }}>
          <div>
            <div style={{ color: "#d9bd6c", fontSize: 12, letterSpacing: "0.16em", fontWeight: 800 }}>
              CHAPTER {active.chapter} · {active.mechanic.toUpperCase()}
            </div>
            <h3 style={{ margin: "6px 0 0", fontSize: "clamp(25px, 3vw, 44px)", lineHeight: 1 }}>
              {active.title}
            </h3>
          </div>
          <div style={{ color: "rgba(244,236,208,0.62)", fontSize: 13, textAlign: "right" }}>
            Seal of <strong style={{ color: "#f2d77d" }}>{active.seal}</strong>
          </div>
        </div>
        <TrialCanvas key={active.id} trialId={active.id} />
      </section>

      <aside
        style={{
          display: "grid",
          gap: 8,
          alignContent: "center",
          minWidth: 0,
        }}
      >
        {CLASSIC_TRIALS.map((trial, index) => {
          const selected = index === activeIndex;
          return (
            <button
              key={trial.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-pressed={selected}
              style={{
                appearance: "none",
                border: selected
                  ? "1px solid rgba(244,211,112,0.72)"
                  : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "12px 13px",
                textAlign: "left",
                color: selected ? "#fff2c2" : "rgba(244,236,208,0.58)",
                background: selected
                  ? "linear-gradient(135deg, rgba(112,80,35,0.95), rgba(25,29,45,0.95))"
                  : "rgba(13,16,26,0.72)",
                cursor: "pointer",
                transition: "transform 180ms ease, border-color 180ms ease, background 180ms ease",
                transform: selected ? "translateX(-5px)" : "none",
              }}
            >
              <span style={{ display: "block", fontSize: 10, letterSpacing: "0.14em", opacity: 0.62 }}>
                {trial.chapter} · {seals[index]}
              </span>
              <strong style={{ display: "block", marginTop: 4, fontSize: 14, lineHeight: 1.18 }}>
                {trial.title}
              </strong>
            </button>
          );
        })}
      </aside>
    </div>
  );
}
