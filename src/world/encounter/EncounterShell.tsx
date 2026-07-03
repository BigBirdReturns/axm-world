// EncounterShell: the playable half of the cartridge runtime, rendered entirely
// from the EncounterSpec that compile-encounter.ts DERIVES from the contract. No
// content here is authored per challenge — the location header, objective cards,
// threat markers, party tokens, hazards, win condition, and reward receipt are
// all projections of the same Challenge record the board card reads.
//
// Two states:
//   brief   — the compiled encounter, staged with primitives. The player reads
//             the objectives/hazards/party, then commits.
//   receipt — RESOLVE runs the REAL engine (world.runChallenge → runCycle) and
//             this shows what the engine returned + the ledger delta. There is no
//             fake success button; the outcome is whatever the resolver produced.
//
// Primitives only: markers are squares, the room is a box, party are tokens. The
// proof is the compilation, not the fidelity.

import { useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { ArcWorld } from "../useArcWorld.js";
import type { ProjectedOutcome } from "../readiness.js";
import type { EncounterObjective, MarkerKind } from "./compile-encounter.js";
import { PixelButton } from "../pixel-ui/index.js";
import { t } from "../i18n/index.js";
import "./encounter-shell.css";

// Projected outcome → a compact deploy-time badge. The player reads the stakes of
// their current squad before committing, from the same readiness projection the
// board uses (evaluateParty) — not a new judgement.
const PROJECTION: Record<ProjectedOutcome, { key: "encounterShell.projReliable" | "encounterShell.projRisky" | "encounterShell.projFailing" | "encounterShell.projNone"; tone: string }> = {
  success: { key: "encounterShell.projReliable", tone: "reliable" },
  partial: { key: "encounterShell.projRisky", tone: "risky" },
  failure: { key: "encounterShell.projFailing", tone: "failing" },
  none: { key: "encounterShell.projNone", tone: "none" },
};

const MARKER_COLOR: Record<MarkerKind, string> = {
  threat: "#b06a3d",
  striker: "#b01c18",
  swarm: "#7a6a3d",
  curse: "#7a4a9e",
  breach: "#3d6a9e",
  target: "#8b7d6a",
};

const OUTCOME_COLOR: Record<string, string> = {
  success: "#74ad77",
  partial: "#c9a14a",
  failure: "#b01c18",
};

// Outcome banner reuses the encounter-director's existing outcome chrome keys, so
// no new localized strings are minted for what's already translated.
const OUTCOME_KEY = {
  success: "encounter.outcomeFulfilled",
  partial: "encounter.outcomePartial",
  failure: "encounter.outcomeFailure",
} as const;

interface Props {
  world: ArcWorld;
  challengeId: string;
  party: string[];
  onClose: () => void;
}

function MarkerField({ objective }: { objective: EncounterObjective }): JSX.Element {
  const color = MARKER_COLOR[objective.markerKind];
  return (
    <div className="encs-markerfield" data-testid={`encs-markers-${objective.id}`} aria-hidden="true">
      {Array.from({ length: objective.markerCount }).map((_, i) => (
        <span key={i} className={`encs-marker encs-marker--${objective.markerKind}`} style={{ background: color }} />
      ))}
    </div>
  );
}

export function EncounterShell({ world, challengeId, party, onClose }: Props): JSX.Element | null {
  const [resolved, setResolved] = useState(false);
  const spec = world.encounterFor(challengeId);

  // The encounter turn: which agents the player commits to the room. Seeded from
  // the derived/recommended party so it opens ready-to-go, but the player can pull
  // agents to the reserve or send others in before resolving. The engine resolves
  // exactly this committed squad — the choice is real, not cosmetic.
  const initialParty = party.length
    ? party
    : (spec?.slots ?? []).map((s) => s.agentId).filter((x): x is string => !!x);
  const [committed, setCommitted] = useState<string[]>(initialParty);

  // Live projection of the CURRENT squad, from the same resolver-faithful
  // readiness the board uses. Recomputed as the player deploys.
  const readiness = useMemo(
    () => (spec ? world.evaluateParty(challengeId, committed) : null),
    [world, challengeId, committed, spec],
  );

  if (!spec) return null;

  const report = resolved && world.lastReport?.challengeId === challengeId ? world.lastReport : null;
  const resolution = report ? spec.resolutions.find((r) => r.outcome === report.outcome) ?? null : null;
  const outcomeColor = report ? OUTCOME_COLOR[report.outcome] ?? "#8b7d6a" : "#8b7d6a";

  const committedSet = new Set(committed);
  const countOk = committed.length >= spec.minAgents && committed.length <= spec.maxAgents;
  const projection = PROJECTION[readiness?.projectedOutcome ?? "none"];
  // The single most useful "why" line for the current squad (missing role, thin
  // check), so the projection is explained, not just colored.
  const projectionReason = readiness?.reasons[0] ?? null;

  const toggle = (id: string) => {
    setCommitted((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= spec.maxAgents) return cur; // squad full — swap by removing first
      return [...cur, id];
    });
  };

  const resolve = () => {
    if (!countOk) return;
    world.runChallenge(challengeId, committed);
    setResolved(true);
  };

  const overlayStyle: CSSProperties = { ["--encs-outcome" as string]: outcomeColor };

  // Portal to <body> like DecisionPanel so a run that queues a drama card doesn't
  // out-layer the receipt — the player reads the result, then the world reacts.
  return createPortal(
    <div
      className="encs-overlay"
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-label={spec.title}
      data-testid="encounter-shell"
      data-encounter-state={report ? "receipt" : "brief"}
      onClick={onClose}
    >
      <div className="encs-panel" onClick={(e) => e.stopPropagation()}>
        <header className="encs-header">
          <div className="encs-loc">
            <span className="encs-region">{spec.location.region}</span>
            <span className="encs-arrow">›</span>
            <span className="encs-site">{spec.location.site}</span>
          </div>
          <span className="encs-difficulty" data-testid="encs-difficulty">{t("encounterShell.difficulty")} {spec.difficulty}</span>
        </header>

        {!report && (
          <div className="encs-brief" data-testid="encs-brief">
            <p className="encs-approach">{spec.location.approach}</p>
            <p className="encs-provenance">{t("encounterShell.derivedNote")}</p>

            {/* The "room": objectives with their derived threat markers. */}
            <div className="encs-room" data-testid="encs-room">
              <div className="encs-room-label">{t("encounterShell.objectives")} · {spec.winCondition}</div>
              <div className="encs-objectives">
                {spec.objectives.map((o) => (
                  <div key={o.id} className="encs-objective" data-testid={`encs-objective-${o.id}`}>
                    <div className="encs-objective-head">
                      <span className="encs-verb">{o.verb}</span>
                      <span className="encs-obj-label">{o.label}</span>
                      {(() => {
                        const check = readiness?.checks.find((c) => c.id === o.id);
                        const tone = check?.status === "ready" ? "reliable" : check?.status === "thin" ? "risky" : check ? "failing" : "none";
                        return <span className={`encs-obj-status encs-obj-status--${tone}`} data-testid={`encs-obj-status-${o.id}`} />;
                      })()}
                      <span className="encs-reach">{t("encounterShell.reach", { n: o.targetThreshold })}</span>
                    </div>
                    <div className="encs-obj-brief">{o.brief}</div>
                    <MarkerField objective={o} />
                    <div className="encs-obj-meta">
                      <span className="encs-attrs">{o.attributes.map((a) => a.name).join(" · ")}</span>
                      {o.roleNames.length > 0 && <span className="encs-obj-roles">{o.roleNames.join(", ")}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* The encounter turn: deploy your squad. Tap a token to send it into
                the room or pull it to the reserve; the projection responds live. */}
            <div className="encs-section" data-testid="encs-deploy">
              <div className="encs-section-label">
                {t("encounterShell.deploy")} · {committed.length}/{spec.maxAgents}
                {spec.minAgents !== spec.maxAgents && <span className="encs-deploy-range"> · {t("encounterShell.minNeeded", { n: spec.minAgents })}</span>}
              </div>

              <div className={`encs-projection encs-projection--${projection.tone}`} data-testid="encs-projection" data-projected={readiness?.projectedOutcome ?? "none"}>
                <span className="encs-projection-label">{t("encounterShell.projected")}:</span>
                <strong>{t(projection.key)}</strong>
                {projectionReason && <span className="encs-projection-why">— {projectionReason}</span>}
              </div>

              <div className="encs-muster">
                <div className="encs-muster-col" data-testid="encs-in-room">
                  <div className="encs-muster-head">{t("encounterShell.committed")}</div>
                  <div className="encs-tokens">
                    {world.roster.filter((m) => committedSet.has(m.id)).map((m) => (
                      <button key={m.id} type="button" className="encs-token encs-token--in" data-testid={`encs-token-${m.id}`} onClick={() => toggle(m.id)}>
                        <span className="encs-token-name">{m.name}</span>
                        <span className="encs-token-role">{m.role}</span>
                      </button>
                    ))}
                    {committed.length === 0 && <span className="encs-muster-empty">{t("encounterShell.projNone")}</span>}
                  </div>
                </div>
                <div className="encs-muster-col" data-testid="encs-reserve">
                  <div className="encs-muster-head">{t("encounterShell.reserve")}</div>
                  <div className="encs-tokens">
                    {world.roster.filter((m) => !committedSet.has(m.id)).map((m) => (
                      <button key={m.id} type="button" className="encs-token encs-token--out" data-testid={`encs-token-${m.id}`} onClick={() => toggle(m.id)}>
                        <span className="encs-token-name">{m.name}</span>
                        <span className="encs-token-role">{m.role}</span>
                      </button>
                    ))}
                    {world.roster.every((m) => committedSet.has(m.id)) && <span className="encs-muster-empty">—</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Hazards derived from each check's failureConsequence. */}
            <div className="encs-section">
              <div className="encs-section-label">{t("encounterShell.hazards")}</div>
              <ul className="encs-hazards" data-testid="encs-hazards">
                {spec.hazards.map((h) => (
                  <li key={h.id} className="encs-hazard">
                    <span className={`encs-hazard-dot encs-hazard-dot--${h.kind}`} />
                    {h.label}
                  </li>
                ))}
              </ul>
            </div>

            <PixelButton
              type="button"
              variant="primary"
              className="pixel-button--cta"
              data-testid="encs-resolve"
              onClick={resolve}
              disabled={!countOk}
              style={{ width: "100%" }}
            >
              {countOk ? t("encounterShell.resolve") : t("encounterShell.minNeeded", { n: spec.minAgents })}
            </PixelButton>
          </div>
        )}

        {report && (
          <div className="encs-receipt" data-testid="encs-receipt" data-outcome={report.outcome}>
            <div className="encs-outcome-banner" style={{ borderColor: outcomeColor, color: outcomeColor }}>
              {t(OUTCOME_KEY[report.outcome])}
            </div>
            {resolution && <p className="encs-narrative">{resolution.narrative}</p>}

            {/* Summary first, in player language: what happened, then why. No raw
                "score / threshold" fractions — score vs target, and the margin. */}
            <div className="encs-section">
              <div className="encs-section-label">{t("encounterShell.objectives")}</div>
              {report.objectives.map((o, i) => (
                <div key={i} className={`encs-obj-summary encs-obj-summary--${o.passed ? "pass" : "fail"}`} data-testid={`encs-obj-summary-${o.id}`}>
                  <div className="encs-obj-heading">
                    <span className="encs-obj-mark">{o.passed ? "✓" : "✗"}</span>
                    {o.passed ? t("encounterShell.objectiveCleared", { name: o.name }) : t("encounterShell.objectiveNotCleared", { name: o.name })}
                  </div>
                  <div className="encs-obj-plain">
                    {o.attribute
                      ? (o.passed ? t("encounterShell.reqCheckPassed", { attr: o.attribute }) : t("encounterShell.reqCheckFailed", { attr: o.attribute }))
                      : (o.passed ? t("encounterShell.reqCheckPassedNoAttr") : t("encounterShell.reqCheckFailedNoAttr"))}
                  </div>
                  {o.best && (
                    <div className="encs-obj-best">
                      {t("encounterShell.best", { name: o.best.agentName, score: o.best.score, target: o.best.target })}
                    </div>
                  )}
                  <div className="encs-obj-coverage">
                    {o.passedCount === o.totalCount
                      ? t("encounterShell.coverageAll", { count: o.totalCount })
                      : t("encounterShell.coveragePartial", { passed: o.passedCount, total: o.totalCount })}
                  </div>
                </div>
              ))}
            </div>

            {/* Raw per-agent numbers behind an expandable row — still player-worded. */}
            <details className="encs-detail" data-testid="encs-agent-detail">
              <summary className="encs-section-label">{t("encounterShell.detail")}</summary>
              {report.objectives.map((o) => (
                <div key={o.id} className="encs-detail-group">
                  {report.objectives.length > 1 && <div className="encs-detail-obj">{o.name}</div>}
                  <ul className="encs-report-lines">
                    {o.contributions.map((c, i) => (
                      <li key={i} className="encs-report-line">
                        {c.passed
                          ? t("encounterShell.agentPassedBy", { name: c.agentName, score: c.score, target: c.target, margin: c.margin })
                          : t("encounterShell.agentShortBy", { name: c.agentName, score: c.score, target: c.target, margin: Math.abs(c.margin) })}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </details>

            {resolution && (
              <div className="encs-section">
                <div className="encs-section-label">{t("encounterShell.ledger")}</div>
                <ul className="encs-ledger" data-testid="encs-ledger">
                  {resolution.ledger.map((line, i) => (
                    <li key={i} className="encs-ledger-line">{line}</li>
                  ))}
                </ul>
              </div>
            )}

            {report.outcome === "success" && spec.onClear.unlocks.length > 0 && (
              <div className="encs-section">
                <div className="encs-section-label">{t("encounterShell.unlocks")}</div>
                <ul className="encs-unlocks">
                  {spec.onClear.unlocks.map((u) => <li key={u}>{u}</li>)}
                </ul>
              </div>
            )}
            {report.outcome === "success" && spec.onClear.worldChanges.length > 0 && (
              <div className="encs-section">
                <div className="encs-section-label">{t("encounterShell.worldChanges")}</div>
                <ul className="encs-worldchanges">
                  {spec.onClear.worldChanges.map((w) => <li key={w}>{w}</li>)}
                </ul>
              </div>
            )}

            <PixelButton type="button" variant="secondary" data-testid="encs-leave" onClick={onClose} style={{ width: "100%" }}>
              {t("encounterShell.leave")}
            </PixelButton>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
