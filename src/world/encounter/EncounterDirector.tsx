// EncounterDirector: intercepts ix.run() and drives the encounter phase machine.
// Phases: idle → dispatch → travel → encounter → resolve-checks → result → record.
// At the resolve-checks boundary, the actual world.runChallenge() is called. Earlier
// phases are pre-commit animations using the captured snapshot. The overlay is
// skippable: click or press Escape at any pre-result phase to skip to result.

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { Challenge } from "../../engine/types.js";
import type { ArcInteraction } from "../useArcInteraction.js";
import type { ArcWorld } from "../useArcWorld.js";
import type { WorldNode } from "../contract.js";
import type { ProjectedOutcome } from "../readiness.js";
import { PixelIcon } from "../pixel-ui/index.js";
// Theme seam (docs/design/rodoh-visual-contract.md): First Charter motif icons are only
// used when the loaded arc IS First Charter (checked against FIRST_CHARTER_THEME.id
// below). Any other cartridge gets the generic PixelIcon placeholder instead.
import { CartridgeMotif } from "../themes/CartridgeMotif.js";
import { t } from "../i18n/index.js";
import "./encounter.css";

export type EncounterPhase =
  | "idle"
  | "dispatch"
  | "travel"
  | "encounter"
  | "resolve-checks"
  | "result"
  | "record";

// The pre-resolve "flavor" line is the challenge's own authored description (first
// sentence), not invented fiction keyed off a location id — any arc's challenges get
// this for free.
function locationFlavor(challenge: Challenge | null): string {
  if (!challenge) return t("encounter.partyMovesOut");
  const sentence = challenge.description.split(/[.!?]/)[0]?.trim();
  return sentence && sentence.length > 0 ? sentence : t("encounter.partyMovesOut");
}

// The result headline is the challenge's own authored outcome narrative
// (challenge.outcomes[outcome].narrative). The literals below are ONLY a fallback for
// an outcome with no authored narrative — never the primary source of the label.
function outcomeLabel(outcome: string | undefined, narrative: string | undefined): { label: string; color: string; glyph: string } {
  const fallback: Record<string, { label: string; color: string; glyph: string }> = {
    success: { label: t("encounter.outcomeFulfilled"), color: "#74ad77", glyph: "✓" },
    partial: { label: t("encounter.outcomePartial"), color: "#c9a14a", glyph: "◈" },
    failure: { label: t("encounter.outcomeFailure"), color: "#b01c18", glyph: "✗" },
  };
  const base = (outcome && fallback[outcome]) || { label: t("encounter.outcomeRecordedFallback"), color: "#8b7d6a", glyph: "◆" };
  const label = narrative && narrative.trim().length > 0 ? narrative : base.label;
  return { ...base, label };
}

function resolveProjection(outcome: ProjectedOutcome): { label: string; detail: string; glyph: string; tone: "reliable" | "risky" | "failing" | "empty" } {
  switch (outcome) {
    case "success":
      return { label: t("encounter.reliableProjection"), detail: t("encounter.reliableProjectionDetail"), glyph: "✓", tone: "reliable" };
    case "partial":
      return { label: t("encounter.riskWindow"), detail: t("encounter.riskWindowDetail"), glyph: "◈", tone: "risky" };
    case "failure":
      return { label: t("encounter.failurePressure"), detail: t("encounter.failurePressureDetail"), glyph: "!", tone: "failing" };
    default:
      return { label: t("encounter.noProjection"), detail: t("encounter.noProjectionDetail"), glyph: "?", tone: "empty" };
  }
}

interface BoardTarget {
  x: number;
  y: number;
  width: number;
  height: number;
  pathLength: number;
  pathAngle: number;
  found: boolean;
}

function viewportCenter(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

function boardTargetFor(challengeId: string): BoardTarget {
  const center = viewportCenter();
  if (typeof document === "undefined" || typeof window === "undefined") {
    return { x: center.x, y: center.y, width: 0, height: 0, pathLength: 0, pathAngle: 0, found: false };
  }
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-contract-board-card-id]"));
  const el = nodes.find((node) => node.dataset.contractBoardCardId === challengeId);
  if (!el) return { x: center.x, y: center.y, width: 0, height: 0, pathLength: 0, pathAngle: 0, found: false };
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  return {
    x,
    y,
    width: rect.width,
    height: rect.height,
    pathLength: Math.hypot(x - center.x, y - center.y),
    pathAngle: Math.atan2(y - center.y, x - center.x),
    found: true,
  };
}

interface EncounterSnapshot {
  node: WorldNode;
  party: string[];
  challengeId: string;
  projectedOutcome: ProjectedOutcome;
  target: BoardTarget;
}

interface UseEncounterDirectorResult {
  /** Drop-in replacement for ix.run that intercepts the call. */
  interceptedRun: () => void;
  /** Null when phase is idle. Render this over the shell when non-null. */
  overlay: JSX.Element | null;
}

function challengeFor(world: ArcWorld, challengeId: string): Challenge | null {
  return world.arc.challenges.find((c) => c.id === challengeId) ?? null;
}

const PHASE_DURATIONS: Partial<Record<EncounterPhase, number>> = {
  dispatch: 700,
  travel: 900,
  encounter: 1400,
  "resolve-checks": 1200,
  result: 0,
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

      // Commit at resolve-checks start so the result phase can sit over the updated board card.
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

  useEffect(() => () => clearTimer(), []);

  const interceptedRun = useCallback(() => {
    if (!ix.selected || !ix.canRun) return;
    committedRef.current = false;
    const snap: EncounterSnapshot = {
      node: ix.selected,
      party: [...ix.party],
      challengeId: ix.selected.challengeId,
      projectedOutcome: ix.readiness?.projectedOutcome ?? "none",
      target: boardTargetFor(ix.selected.challengeId),
    };
    setSnapshot(snap);
    advance("dispatch", snap);
  }, [ix.selected, ix.canRun, ix.party, ix.readiness?.projectedOutcome, advance]);

  const skip = useCallback(() => {
    clearTimer();
    if (snapshot && !committedRef.current) {
      committedRef.current = true;
      world.runChallenge(snapshot.challengeId, snapshot.party);
    }
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
            projectedOutcome={snapshot.projectedOutcome}
            target={snapshot.target}
            challenge={challengeFor(world, snapshot.challengeId)}
            arcId={world.arc.meta.id}
            challengeId={snapshot.challengeId}
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
  projectedOutcome: ProjectedOutcome;
  target: BoardTarget;
  /** The current challenge's own data (description, authored outcome narratives).
   *  Null only if the node's challengeId can't be resolved against the loaded arc. */
  challenge: Challenge | null;
  /** The active arc + encounter, resolved to a themed motif by CartridgeMotif;
   *  arcs with no bundled motif set fall back to a generic PixelIcon. */
  arcId: string;
  challengeId: string;
  onSkip: () => void;
  onDismiss: () => void;
}

function EncounterOverlay({ phase, node, party, roster, lastReport, projectedOutcome, target, challenge, arcId, challengeId, onSkip, onDismiss }: OverlayProps): JSX.Element {
  const flavor = locationFlavor(challenge);
  const renderMotif = (size: number): JSX.Element =>
    CartridgeMotif({ arcId, challengeId, size, className: "enc-motif-frame" })
      ?? <PixelIcon name="available" className="enc-motif-frame" />;
  const partyNames = party.map((id) => roster.find((m) => m.id === id)?.name ?? id);
  const projection = resolveProjection(projectedOutcome);
  const targetStyle = {
    "--enc-target-x": `${target.x}px`,
    "--enc-target-y": `${target.y}px`,
    "--enc-target-w": `${target.width}px`,
    "--enc-target-h": `${target.height}px`,
    "--enc-path-length": `${target.pathLength}px`,
    "--enc-path-angle": `${target.pathAngle}rad`,
  } as CSSProperties;

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
  const result = lastReport ? outcomeLabel(lastReport.outcome, challenge?.outcomes[lastReport.outcome]?.narrative) : null;
  // The canonical grade (Cleared / Partial / Failed) — the same axis the receipt,
  // the revisit modal, and the ledger speak. Distinct from the memory axis
  // ("Recorded to the ledger", below) and from the authored narrative (result.label).
  const gradeLabelId: Record<string, "outcome.cleared" | "outcome.partial" | "outcome.failed"> = {
    success: "outcome.cleared", partial: "outcome.partial", failure: "outcome.failed",
  };
  const gradeId = lastReport ? gradeLabelId[lastReport.outcome] : undefined;
  const showBoardAnchor = phase === "travel" || isResult;

  return (
    <div
      className={`enc-overlay enc-overlay--${phase} enc-overlay--projected-${projection.tone}`}
      style={targetStyle}
      onClick={isPreResult ? onSkip : onDismiss}
      role="dialog"
      aria-modal="true"
      aria-label="Encounter in progress"
      data-testid="encounter-overlay"
      data-encounter-phase={phase}
      data-projected-outcome={projectedOutcome}
      data-target-found={target.found ? "true" : "false"}
    >
      {showBoardAnchor && (
        <div className="enc-flight-layer" aria-hidden="true">
          {target.found && <div className="enc-flight-path" data-testid="encounter-travel-path" />}
          {target.found && <div className="enc-target-ping" data-testid="encounter-board-target" />}
          {phase === "travel" && (
            <div className="enc-travel-token" data-testid="encounter-travel-token">
              {renderMotif(34)}
            </div>
          )}
        </div>
      )}

      <div className="enc-vignette" onClick={(e) => e.stopPropagation()}>
        <div className={`enc-icon enc-icon--${phase} enc-motif-stage`} aria-hidden="true">
          {renderMotif(56)}
        </div>

        {phase === "dispatch" && (
          <div className="enc-content">
            <div className="enc-phase-label">{t("encounter.dispatching")}</div>
            <div className="enc-title">{node.title}</div>
            <div className="enc-party">
              {partyNames.map((name, i) => (
                <span key={i} className="enc-agent-token">{name}</span>
              ))}
            </div>
          </div>
        )}

        {phase === "travel" && (
          <div className="enc-content" data-testid="encounter-travel-phase">
            <div className="enc-phase-label">{t("encounter.travelingToBoard")}</div>
            <div className="enc-title">{node.title}</div>
            <div className="enc-travel-note">{t("encounter.travelNote")}</div>
          </div>
        )}

        {phase === "encounter" && (
          <div className="enc-content">
            <div className="enc-title">{node.title}</div>
            <div className="enc-flavor">{flavor}</div>
          </div>
        )}

        {phase === "resolve-checks" && (
          <div className="enc-content" data-testid={`encounter-resolve-${projection.tone}`}>
            <div className="enc-phase-label">{t("encounter.resolving")}</div>
            <div className={`enc-projection enc-projection--${projection.tone}`}>
              <span className="enc-projection-glyph">{projection.glyph}</span>
              <span>
                <strong>{projection.label}</strong>
                <small>{projection.detail}</small>
              </span>
            </div>
            <div className="enc-checks">
              {partyNames.slice(0, 3).map((name, i) => (
                <div key={i} className="enc-check-row">
                  <span className="enc-check-name">{name}</span>
                  <span className="enc-check-dice">{projection.glyph}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isResult && result && (
          // The immediate post-run moment answers the same five things the revisit
          // modal does: the OUTCOME grade (Cleared / Partial / Failed) → the contract
          // acted on → WHAT HAPPENED (authored narrative) → WHAT CHANGED (rewards /
          // consequence lines) → and, on its own axis, WHAT WAS RECORDED (the result is
          // now Program 001 memory) → then Continue (what's next). Display-only over
          // the existing report; no new mechanics, schema, or reward breakdown.
          <div className="enc-content enc-content--result" data-testid="outcome-banner">
            <div className="enc-result-glyph" style={{ color: result.color }}>{result.glyph}</div>
            {gradeId && (
              <div
                data-testid="outcome-grade"
                style={{ color: result.color, fontSize: 15, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
              >
                {t(gradeId)}
              </div>
            )}
            <div className="enc-title">{node.title}</div>
            <div className="enc-result-label" style={{ color: result.color }}>{result.label}</div>
            {lastReport?.rewardSummary && <div className="enc-reward-summary">{lastReport.rewardSummary}</div>}
            {lastReport?.lines && lastReport.lines.length > 0 && (
              <div className="enc-result-lines">
                {lastReport.lines.slice(0, 2).map((line, i) => (
                  <div key={i} className="enc-result-line">{line}</div>
                ))}
              </div>
            )}
            {/* Recorded — the memory axis, never conflated with the grade above. */}
            <div
              data-testid="outcome-recorded"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "#74ad77" }}
            >
              <PixelIcon name="recorded" /> <span>{t("result.recorded")}</span>
            </div>
            <button className="enc-dismiss-btn" onClick={onDismiss}>{t("encounter.continue")}</button>
          </div>
        )}

        {isPreResult && (
          <div className="enc-skip-hint">{t("encounter.clickToSkip")}</div>
        )}
      </div>
    </div>
  );
}
