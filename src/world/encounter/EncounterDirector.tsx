// EncounterDirector — intercepts ix.run() and drives the encounter phase machine.
// Phases: idle → dispatch → travel → encounter → resolve-checks → result → idle
// At the "resolve-checks" boundary, the actual world.runChallenge() is called; all
// earlier phases are pre-commit animations using the captured snapshot.
// The overlay is skippable: click or press Escape at any phase to skip to result.

import { useCallback, useEffect, useRef, useState } from "react";
import type { ArcInteraction } from "../useArcInteraction.js";
import type { ArcWorld } from "../useArcWorld.js";
import type { WorldNode } from "../contract.js";
import "./encounter.css";

export type EncounterPhase =
  | "idle"
  | "dispatch"
  | "travel"
  | "encounter"
  | "resolve-checks"
  | "result"
  | "record";

const LOCATION_ICON: Record<string, string> = {
  cellar: "🐀",
  "the-cellar": "🐀",
  "bridge-troll": "🌉",
  "merchant-escort": "🛒",
  "mine-collapse": "⛏️",
  "bandit-camp": "🔥",
  "wardens-keep": "🏰",
};

const LOCATION_FLAVOR: Record<string, string> = {
  cellar: "Something stirs below…",
  "the-cellar": "Something stirs below…",
  "bridge-troll": "The troll doesn't look like it's in a mood to negotiate.",
  "merchant-escort": "The convoy loads up. The road is long.",
  "mine-collapse": "The tunnels groan overhead.",
  "bandit-camp": "Smoke rises through the trees.",
  "wardens-keep": "The gates are sealed. For now.",
};

function locationIcon(id: string): string {
  for (const [key, icon] of Object.entries(LOCATION_ICON)) {
    if (id.toLowerCase().includes(key)) return icon;
  }
  return "📍";
}

function locationFlavor(id: string): string {
  for (const [key, flavor] of Object.entries(LOCATION_FLAVOR)) {
    if (id.toLowerCase().includes(key)) return flavor;
  }
  return "The party moves out.";
}

function outcomeLabel(outcome: string | undefined): { label: string; color: string; glyph: string } {
  switch (outcome) {
    case "success":
      return { label: "Contract fulfilled.", color: "#74ad77", glyph: "✓" };
    case "partial":
      return { label: "Partial success — barely.", color: "#c9a14a", glyph: "◈" };
    case "failure":
      return { label: "They came back empty-handed.", color: "#b01c18", glyph: "✗" };
    default:
      return { label: "Outcome recorded.", color: "#8b7d6a", glyph: "◆" };
  }
}

interface EncounterSnapshot {
  node: WorldNode;
  party: string[];
  challengeId: string;
}

interface UseEncounterDirectorResult {
  /** Drop-in replacement for ix.run that intercepts the call */
  interceptedRun: () => void;
  /** Null when phase is idle — render this over the shell when non-null */
  overlay: JSX.Element | null;
}

const PHASE_DURATIONS: Partial<Record<EncounterPhase, number>> = {
  dispatch: 700,
  travel: 900,
  encounter: 1400,
  "resolve-checks": 1200,
  result: 0, // stays until dismissed / skip
  record: 600,
};

export function useEncounterDirector(ix: ArcInteraction, world: ArcWorld): UseEncounterDirectorResult {
  const [phase, setPhase] = useState<EncounterPhase>("idle");
  const [snapshot, setSnapshot] = useState<EncounterSnapshot | null>(null);
  const committedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const advance = useCallback(
    (next: EncounterPhase, snap: EncounterSnapshot) => {
      clearTimer();
      setPhase(next);

      // Commit at resolve-checks start (before the animation, so result data is ready)
      if (next === "resolve-checks" && !committedRef.current) {
        committedRef.current = true;
        world.runChallenge(snap.challengeId, snap.party);
      }

      const dur = PHASE_DURATIONS[next];
      if (dur !== undefined && dur > 0) {
        timerRef.current = setTimeout(() => {
          const order: EncounterPhase[] = ["dispatch", "travel", "encounter", "resolve-checks", "result", "record", "idle"];
          const idx = order.indexOf(next);
          const nextPhase = order[idx + 1];
          if (nextPhase === "idle") {
            setPhase("idle");
            setSnapshot(null);
            committedRef.current = false;
          } else if (nextPhase) {
            advance(nextPhase, snap);
          }
        }, dur);
      }
    },
    [world],
  );

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), []);

  const interceptedRun = useCallback(() => {
    if (!ix.selected || !ix.canRun) return;
    committedRef.current = false;
    const snap: EncounterSnapshot = {
      node: ix.selected,
      party: [...ix.party],
      challengeId: ix.selected.challengeId,
    };
    setSnapshot(snap);
    advance("dispatch", snap);
  }, [ix.selected, ix.canRun, ix.party, advance]);

  const skip = useCallback(() => {
    clearTimer();
    if (snapshot && !committedRef.current) {
      committedRef.current = true;
      world.runChallenge(snapshot.challengeId, snapshot.party);
    }
    // Brief result flash so the commit lands before we close
    setPhase("result");
    timerRef.current = setTimeout(() => {
      setPhase("idle");
      setSnapshot(null);
      committedRef.current = false;
    }, 1000);
  }, [snapshot, world]);

  const handleResultDismiss = useCallback(() => {
    clearTimer();
    setPhase("idle");
    setSnapshot(null);
    committedRef.current = false;
  }, []);

  const overlay =
    phase === "idle" || !snapshot
      ? null
      : (
          <EncounterOverlay
            phase={phase}
            node={snapshot.node}
            party={snapshot.party}
            roster={world.roster}
            lastReport={world.lastReport}
            onSkip={skip}
            onDismiss={handleResultDismiss}
          />
        );

  return { interceptedRun, overlay };
}

interface OverlayProps {
  phase: EncounterPhase;
  node: WorldNode;
  party: string[];
  roster: ArcWorld["roster"];
  lastReport: ArcWorld["lastReport"];
  onSkip: () => void;
  onDismiss: () => void;
}

function EncounterOverlay({ phase, node, party, roster, lastReport, onSkip, onDismiss }: OverlayProps): JSX.Element {
  const icon = locationIcon(node.challengeId);
  const flavor = locationFlavor(node.challengeId);
  const partyNames = party.map((id) => roster.find((m) => m.id === id)?.name ?? id);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (phase === "result" || phase === "record") onDismiss();
        else onSkip();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, onSkip, onDismiss]);

  const isPreResult = phase === "dispatch" || phase === "travel" || phase === "encounter" || phase === "resolve-checks";
  const isResult = phase === "result" || phase === "record";
  const result = lastReport ? outcomeLabel(lastReport.outcome) : null;

  return (
    <div
      className={`enc-overlay enc-overlay--${phase}`}
      onClick={isPreResult ? onSkip : onDismiss}
      role="dialog"
      aria-modal="true"
      aria-label="Encounter in progress"
    >
      <div className="enc-vignette" onClick={(e) => e.stopPropagation()}>
        {/* Location icon */}
        <div className={`enc-icon enc-icon--${phase}`} aria-hidden="true">
          {icon}
        </div>

        {/* Phase content */}
        {phase === "dispatch" && (
          <div className="enc-content">
            <div className="enc-phase-label">Dispatching…</div>
            <div className="enc-title">{node.title}</div>
            <div className="enc-party">
              {partyNames.map((name, i) => (
                <span key={i} className="enc-agent-token">{name}</span>
              ))}
            </div>
          </div>
        )}

        {phase === "travel" && (
          <div className="enc-content">
            <div className="enc-phase-label">En route</div>
            <div className="enc-title">{node.title}</div>
            <div className="enc-travel-bar">
              <div className="enc-travel-fill" />
            </div>
          </div>
        )}

        {phase === "encounter" && (
          <div className="enc-content">
            <div className="enc-title">{node.title}</div>
            <div className="enc-flavor">{flavor}</div>
          </div>
        )}

        {phase === "resolve-checks" && (
          <div className="enc-content">
            <div className="enc-phase-label">Resolving…</div>
            <div className="enc-checks">
              {partyNames.slice(0, 3).map((name, i) => (
                <div key={i} className="enc-check-row">
                  <span className="enc-check-name">{name}</span>
                  <span className="enc-check-dice">⚄</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isResult && result && (
          <div className="enc-content enc-content--result">
            <div className="enc-result-glyph" style={{ color: result.color }}>{result.glyph}</div>
            <div className="enc-title">{node.title}</div>
            <div className="enc-result-label" style={{ color: result.color }}>{result.label}</div>
            {lastReport?.lines && lastReport.lines.length > 0 && (
              <div className="enc-result-lines">
                {lastReport.lines.slice(0, 2).map((line, i) => (
                  <div key={i} className="enc-result-line">{line}</div>
                ))}
              </div>
            )}
            <button className="enc-dismiss-btn" onClick={onDismiss}>Continue →</button>
          </div>
        )}

        {/* Skip hint */}
        {isPreResult && (
          <div className="enc-skip-hint">click anywhere to skip</div>
        )}
      </div>
    </div>
  );
}
