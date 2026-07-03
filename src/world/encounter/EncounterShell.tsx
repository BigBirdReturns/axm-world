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

import { useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { ArcWorld } from "../useArcWorld.js";
import type { EncounterObjective, MarkerKind } from "./compile-encounter.js";
import { PixelButton } from "../pixel-ui/index.js";
import { t } from "../i18n/index.js";
import "./encounter-shell.css";

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
  if (!spec) return null;

  const report = resolved && world.lastReport?.challengeId === challengeId ? world.lastReport : null;
  const resolution = report ? spec.resolutions.find((r) => r.outcome === report.outcome) ?? null : null;
  const outcomeColor = report ? OUTCOME_COLOR[report.outcome] ?? "#8b7d6a" : "#8b7d6a";

  // Party tokens: the slots pre-filled by the spec, overridden by the actual
  // assigned party so the encounter shows who is really going in.
  const tokens = party.length
    ? party.map((id) => {
        const m = world.roster.find((r) => r.id === id);
        return { id, name: m?.name ?? id, role: m?.role ?? null };
      })
    : spec.slots.filter((s) => s.agentId).map((s) => ({ id: s.agentId!, name: s.agentName!, role: s.role }));

  const resolve = () => {
    world.runChallenge(challengeId, party.length ? party : spec.slots.map((s) => s.agentId).filter((x): x is string => !!x));
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

            {/* Party tokens filling the derived slots. */}
            <div className="encs-section">
              <div className="encs-section-label">{t("encounterShell.party")} · {tokens.length}/{spec.maxAgents}</div>
              <div className="encs-tokens" data-testid="encs-tokens">
                {tokens.map((tk) => (
                  <span key={tk.id} className="encs-token">
                    <span className="encs-token-name">{tk.name}</span>
                    {tk.role && <span className="encs-token-role">{tk.role}</span>}
                  </span>
                ))}
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
              style={{ width: "100%" }}
            >
              {t("encounterShell.resolve")}
            </PixelButton>
          </div>
        )}

        {report && (
          <div className="encs-receipt" data-testid="encs-receipt" data-outcome={report.outcome}>
            <div className="encs-outcome-banner" style={{ borderColor: outcomeColor, color: outcomeColor }}>
              {t(OUTCOME_KEY[report.outcome])}
            </div>
            {resolution && <p className="encs-narrative">{resolution.narrative}</p>}

            <div className="encs-section">
              <div className="encs-section-label">{t("encounterShell.objectives")}</div>
              <ul className="encs-report-lines">
                {report.lines.map((line, i) => (
                  <li key={i} className="encs-report-line">{line}</li>
                ))}
              </ul>
            </div>

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
