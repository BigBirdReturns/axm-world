import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  CLASSIC_TRIALS,
  CLASSIC_TRIAL_BY_ID,
  type ClassicTrialId,
} from "./catalog.js";
import {
  CLASSIC_HEIGHT,
  CLASSIC_WIDTH,
  createClassicGame,
  getClassicHud,
  renderClassicGame,
  stepClassicGame,
  type ClassicGameState,
  type ClassicHud,
  type ClassicInput,
} from "./engine.js";
import {
  loadClassicSuiteProgress,
  recordClassicTrialAttempt,
  recordClassicTrialCompletion,
  resetClassicSuiteProgress,
  type ClassicSuiteProgress,
} from "./story.js";

const shellStyle: CSSProperties = {
  minHeight: "100vh",
  background: "radial-gradient(circle at 50% -10%, #272039 0%, #0b0d16 48%, #05070c 100%)",
  color: "#f4ecd0",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
};

const panelStyle: CSSProperties = {
  background: "rgba(11, 14, 24, 0.9)",
  border: "1px solid rgba(235, 210, 132, 0.26)",
  borderRadius: 16,
  boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
};

const buttonStyle: CSSProperties = {
  border: "1px solid rgba(235, 210, 132, 0.4)",
  borderRadius: 999,
  background: "rgba(34, 38, 55, 0.94)",
  color: "#f8e8ad",
  padding: "10px 15px",
  fontWeight: 800,
  letterSpacing: "0.055em",
  cursor: "pointer",
};

function emptyProgress(): ClassicSuiteProgress {
  return {
    format: "axm-first-charter-classic-suite-progress/0",
    completed: [],
    highScores: {},
    attempts: {},
    lastTrialId: null,
    updatedAt: new Date(0).toISOString(),
  };
}

function loadInitialProgress(): ClassicSuiteProgress {
  return typeof window === "undefined"
    ? emptyProgress()
    : loadClassicSuiteProgress(window.localStorage);
}

function keyboardAxis(keys: ReadonlySet<string>, negative: string[], positive: string[]): number {
  const minus = negative.some((key) => keys.has(key)) ? -1 : 0;
  const plus = positive.some((key) => keys.has(key)) ? 1 : 0;
  return minus + plus;
}

function currentInput(keys: ReadonlySet<string>): ClassicInput {
  const pad = typeof navigator !== "undefined" && navigator.getGamepads
    ? navigator.getGamepads()[0]
    : null;
  const padX = Math.abs(pad?.axes[0] ?? 0) > 0.16 ? pad?.axes[0] ?? 0 : 0;
  const padY = Math.abs(pad?.axes[1] ?? 0) > 0.16 ? pad?.axes[1] ?? 0 : 0;
  const keyboardX = keyboardAxis(keys, ["KeyA", "ArrowLeft"], ["KeyD", "ArrowRight"]);
  const keyboardY = keyboardAxis(keys, ["KeyW", "ArrowUp"], ["KeyS", "ArrowDown"]);
  return {
    x: Math.max(-1, Math.min(1, keyboardX + padX)),
    y: Math.max(-1, Math.min(1, keyboardY + padY)),
    primary: keys.has("Space")
      || keys.has("Enter")
      || keys.has("KeyE")
      || keys.has("KeyZ")
      || (pad?.buttons[0]?.pressed ?? false),
    secondary: keys.has("ShiftLeft")
      || keys.has("ShiftRight")
      || keys.has("KeyX")
      || (pad?.buttons[1]?.pressed ?? false),
  };
}

function seedForTrial(trialId: ClassicTrialId, attempt: number): number {
  let seed = 0x51f15e ^ attempt;
  for (const character of trialId) {
    seed = (Math.imul(seed, 33) ^ character.charCodeAt(0)) >>> 0;
  }
  return seed;
}

interface TrialCardProps {
  trialId: ClassicTrialId;
  progress: ClassicSuiteProgress;
  onPlay(trialId: ClassicTrialId): void;
}

function TrialCard({ trialId, progress, onPlay }: TrialCardProps): JSX.Element {
  const trial = CLASSIC_TRIAL_BY_ID.get(trialId)!;
  const completed = progress.completed.includes(trialId);
  const highScore = progress.highScores[trialId] ?? 0;
  const attempts = progress.attempts[trialId] ?? 0;
  return (
    <article
      style={{
        ...panelStyle,
        minHeight: 305,
        padding: 20,
        display: "grid",
        gridTemplateRows: "auto auto 1fr auto",
        gap: 12,
        background: completed
          ? "linear-gradient(145deg, rgba(56,84,60,0.94), rgba(12,18,24,0.96))"
          : panelStyle.background,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.16em", opacity: 0.6 }}>
            CHAPTER {trial.chapter} · {trial.mechanic.toUpperCase()}
          </div>
          <h2 style={{ margin: "7px 0 0", fontSize: 24 }}>{trial.title}</h2>
        </div>
        <div
          style={{
            minWidth: 48,
            minHeight: 48,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            border: "1px solid rgba(244,220,140,0.4)",
            background: completed ? "#d7bd66" : "rgba(255,255,255,0.04)",
            color: completed ? "#17140d" : "#8e8875",
            fontWeight: 900,
          }}
          aria-label={completed ? `${trial.seal} seal restored` : `${trial.seal} seal missing`}
        >
          {completed ? "✓" : trial.chapter}
        </div>
      </div>
      <div style={{ color: "#d8bd70", fontWeight: 800 }}>Seal of {trial.seal}</div>
      <div>
        <p style={{ margin: "0 0 12px", color: "rgba(244,236,208,0.78)", lineHeight: 1.55 }}>
          {trial.story}
        </p>
        <p style={{ margin: "0 0 8px", color: "rgba(244,236,208,0.62)", lineHeight: 1.45 }}>
          <strong>Objective:</strong> {trial.objective}
        </p>
        <p style={{ margin: 0, color: "rgba(244,236,208,0.55)", lineHeight: 1.45 }}>
          {trial.controls}
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 12, opacity: 0.58 }}>
          score {highScore.toLocaleString()} · attempts {attempts}
        </div>
        <button
          type="button"
          style={{ ...buttonStyle, background: completed ? "#405d43" : "#7b5929", color: "white" }}
          onClick={() => onPlay(trialId)}
        >
          {completed ? "PLAY AGAIN" : "ENTER TRIAL"}
        </button>
      </div>
    </article>
  );
}

interface GameSurfaceProps {
  trialId: ClassicTrialId;
  progress: ClassicSuiteProgress;
  onProgress(progress: ClassicSuiteProgress): void;
  onExit(): void;
  onMessage(message: string): void;
}

function GameSurface({ trialId, progress, onProgress, onExit, onMessage }: GameSurfaceProps): JSX.Element {
  const trial = CLASSIC_TRIAL_BY_ID.get(trialId)!;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef(new Set<string>());
  const gameRef = useRef<ClassicGameState>(
    createClassicGame(trialId, seedForTrial(trialId, (progress.attempts[trialId] ?? 0) + 1)),
  );
  const recordedWinRef = useRef(false);
  const [hud, setHud] = useState<ClassicHud>(() => getClassicHud(gameRef.current));
  const [generation, setGeneration] = useState(0);

  const restart = useCallback(() => {
    const attemptProgress = recordClassicTrialAttempt(trialId, window.localStorage);
    onProgress(attemptProgress);
    gameRef.current = createClassicGame(
      trialId,
      seedForTrial(trialId, attemptProgress.attempts[trialId] ?? 1),
    );
    recordedWinRef.current = false;
    setHud(getClassicHud(gameRef.current));
    setGeneration((value) => value + 1);
    onMessage(`Restarted ${trial.title}.`);
    canvasRef.current?.focus();
  }, [onMessage, onProgress, trial.title, trialId]);

  useEffect(() => {
    const attemptProgress = recordClassicTrialAttempt(trialId, window.localStorage);
    onProgress(attemptProgress);
    gameRef.current = createClassicGame(
      trialId,
      seedForTrial(trialId, attemptProgress.attempts[trialId] ?? 1),
    );
    setHud(getClassicHud(gameRef.current));
    canvasRef.current?.focus();
  }, [onProgress, trialId]);

  useEffect(() => {
    const recognized = new Set([
      "KeyW", "KeyA", "KeyS", "KeyD",
      "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
      "Space", "Enter", "KeyE", "KeyZ", "KeyX",
      "ShiftLeft", "ShiftRight", "KeyR", "Escape",
    ]);
    const down = (event: KeyboardEvent): void => {
      if (!recognized.has(event.code)) return;
      event.preventDefault();
      if (event.code === "KeyR") {
        restart();
        return;
      }
      if (event.code === "Escape") {
        onExit();
        return;
      }
      keysRef.current.add(event.code);
    };
    const up = (event: KeyboardEvent): void => {
      keysRef.current.delete(event.code);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [onExit, restart]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    let lastTime = performance.now();
    let lastHudTime = lastTime;

    const tick = (time: number): void => {
      const delta = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;
      const game = gameRef.current;
      stepClassicGame(game, currentInput(keysRef.current), delta);
      renderClassicGame(context, game, CLASSIC_WIDTH, CLASSIC_HEIGHT);

      if (time - lastHudTime > 100 || game.status !== hud.status) {
        setHud(getClassicHud(game));
        lastHudTime = time;
      }

      if (game.status === "won" && !recordedWinRef.current) {
        recordedWinRef.current = true;
        void recordClassicTrialCompletion(trialId, game.score, window.localStorage)
          .then((result) => {
            onProgress(result.progress);
            const receipt = result.worldLedgerEventId
              ? ` World memory recorded ${result.worldLedgerEventId}.`
              : result.warning
                ? ` Local seal retained; world ledger warning: ${result.warning}`
                : "";
            onMessage(`${trial.title} completed.${receipt}`);
          });
      }

      frame = window.requestAnimationFrame(tick);
    };

    renderClassicGame(context, gameRef.current, CLASSIC_WIDTH, CLASSIC_HEIGHT);
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [generation, hud.status, onMessage, onProgress, trial.title, trialId]);

  return (
    <section style={{ minHeight: "100vh", display: "grid", gridTemplateRows: "auto 1fr auto", background: "#05070c" }}>
      <header style={{ display: "flex", gap: 14, alignItems: "center", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#090c14" }}>
        <button type="button" style={buttonStyle} onClick={onExit}>ARCHIVE</button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.15em", opacity: 0.58 }}>THE FIRST CHARTER · CHAPTER {trial.chapter}</div>
          <strong style={{ display: "block", fontSize: 20 }}>{trial.title}</strong>
        </div>
        <div style={{ display: "flex", gap: 18, marginLeft: "auto", fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
          <span>SCORE {hud.score.toLocaleString()}</span>
          <span>LIVES {hud.lives}</span>
          <span>{hud.detail.toUpperCase()}</span>
        </div>
      </header>

      <div style={{ minHeight: 0, display: "grid", placeItems: "center", padding: 18 }}>
        <canvas
          ref={canvasRef}
          width={CLASSIC_WIDTH}
          height={CLASSIC_HEIGHT}
          tabIndex={0}
          aria-label={`${trial.title} game surface`}
          data-testid={`classic-game-${trialId}`}
          style={{
            width: "min(100%, 1180px)",
            aspectRatio: `${CLASSIC_WIDTH} / ${CLASSIC_HEIGHT}`,
            maxHeight: "calc(100vh - 168px)",
            borderRadius: 16,
            boxShadow: "0 24px 72px rgba(0,0,0,0.52)",
            outline: "none",
          }}
        />
      </div>

      <footer style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "#090c14" }}>
        <span style={{ opacity: 0.72, flex: 1 }}>{hud.message}</span>
        <span style={{ opacity: 0.48, fontSize: 12 }}>R restart · Esc archive · gamepad supported</span>
        <button type="button" style={buttonStyle} onClick={restart}>RESTART</button>
      </footer>
    </section>
  );
}

export function ClassicSuiteRoute(): JSX.Element {
  const [progress, setProgress] = useState<ClassicSuiteProgress>(loadInitialProgress);
  const [trialId, setTrialId] = useState<ClassicTrialId | null>(null);
  const [message, setMessage] = useState("Five seals are missing from the First Charter Archive.");
  const allComplete = progress.completed.length === CLASSIC_TRIALS.length;

  const completedNames = useMemo(() => progress.completed.map((id) =>
    CLASSIC_TRIAL_BY_ID.get(id)?.seal ?? id), [progress.completed]);

  if (trialId) {
    return (
      <GameSurface
        trialId={trialId}
        progress={progress}
        onProgress={setProgress}
        onExit={() => setTrialId(null)}
        onMessage={setMessage}
      />
    );
  }

  return (
    <main style={shellStyle} data-testid="first-charter-classic-suite">
      <header style={{ padding: "18px clamp(16px, 4vw, 52px)", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 14 }}>
        <a href="./fabric.html" style={{ ...buttonStyle, textDecoration: "none" }}>RETURN TO TINY WORLD</a>
        <div style={{ marginLeft: "auto", textAlign: "right", fontSize: 12, opacity: 0.58 }}>
          {progress.completed.length} / {CLASSIC_TRIALS.length} seals restored
        </div>
      </header>

      <div style={{ padding: "clamp(24px, 5vw, 64px)", maxWidth: 1500, margin: "0 auto" }}>
        <section style={{ ...panelStyle, padding: "clamp(22px, 4vw, 44px)", marginBottom: 24, overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", right: -50, top: -85, width: 260, height: 260, borderRadius: "50%", border: "1px solid rgba(231,204,119,0.13)", boxShadow: "0 0 0 40px rgba(231,204,119,0.025), 0 0 0 80px rgba(231,204,119,0.018)" }} />
          <div style={{ fontSize: 12, letterSpacing: "0.18em", opacity: 0.6 }}>THE FIRST CHARTER ARCHIVE</div>
          <h1 style={{ margin: "10px 0 12px", fontSize: "clamp(38px, 7vw, 82px)", lineHeight: 0.92, maxWidth: 900 }}>
            The Five Classic Trials
          </h1>
          <p style={{ maxWidth: 780, fontSize: "clamp(16px, 2vw, 21px)", lineHeight: 1.58, color: "rgba(244,236,208,0.75)" }}>
            The oldest games in Tiny World were built to teach the Charter before anyone could read it. Restore Judgment, Clarity, Continuity, Defense, and Portability. Every victory enters the same world memory ledger used by Board, Planet, and Play.
          </p>
          <div style={{ marginTop: 16, color: allComplete ? "#f2d878" : "rgba(244,236,208,0.62)" }}>
            {allComplete
              ? "The Archive is open. All five seals now belong to this world and its memory."
              : completedNames.length > 0
                ? `Restored: ${completedNames.join(", ")}.`
                : message}
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          {CLASSIC_TRIALS.map((trial) => (
            <TrialCard
              key={trial.id}
              trialId={trial.id}
              progress={progress}
              onPlay={(id) => {
                setMessage(`Entered ${CLASSIC_TRIAL_BY_ID.get(id)?.title ?? id}.`);
                setTrialId(id);
              }}
            />
          ))}
        </section>

        <section style={{ ...panelStyle, padding: 18, marginTop: 24, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260, color: "rgba(244,236,208,0.66)" }}>
            Progress is local, provider-free, and connected to the same Infinite Fabric IndexedDB world when available.
          </div>
          <button
            type="button"
            style={buttonStyle}
            onClick={() => {
              resetClassicSuiteProgress(window.localStorage);
              setProgress(loadClassicSuiteProgress(window.localStorage));
              setMessage("Classic suite progress cleared. World ledger history remains append-only.");
            }}
          >
            RESET LOCAL SEALS
          </button>
        </section>
      </div>
    </main>
  );
}
