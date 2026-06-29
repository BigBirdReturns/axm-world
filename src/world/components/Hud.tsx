// DOM overlay over the 3D canvas. On desktop: free-floating engine-region panels
// (identity, roster, selected contract, report, coach). On mobile that same set is
// reflowed into a top identity bar + a bottom flex dock, so the regions stack by
// flow instead of colliding in a 390px viewport. Plain absolutely-positioned DOM,
// rendered as a sibling of <Canvas> (not inside it).

import type { CSSProperties, ReactNode } from "react";
import type { DramaCard } from "../../engine/types.js";
import type { PlayReportView } from "../../play-pipeline/compile.js";
import type { RosterMember } from "../useArcWorld.js";
import type { WorldNode } from "../contract.js";
import { DOWNTIME_ACTIONS, type DowntimeAction } from "../agent-management.js";
import { useIsMobile } from "../use-viewport.js";

interface Props {
  title: string;
  cycle: number;
  resources: {
    currency: number;
    tokens: number;
    reputation: number;
    currencyName: string;
    tokenName: string;
    reputationName: string;
  };
  progress: { cleared: number; total: number };
  arcComplete: boolean;
  selected: WorldNode | null;
  req: { minAgents: number; maxAgents: number } | null;
  roster: RosterMember[];
  party: string[];
  onToggleAgent: (id: string) => void;
  onApplyDowntime: (id: string, action: DowntimeAction) => void;
  canRun: boolean;
  onRun: () => void;
  lastReport: PlayReportView | null;
  dispatches: DramaCard[];
  pendingDecision: boolean;
}

const panel: CSSProperties = {
  position: "absolute",
  background: "rgba(23,21,15,0.88)",
  color: "#ece4d4",
  border: "1px solid #4a4238",
  borderRadius: 8,
  padding: "12px 14px",
  font: "13px/1.5 'IBM Plex Mono', ui-monospace, monospace",
  pointerEvents: "auto",
  backdropFilter: "blur(4px)",
};

export function Hud(props: Props): JSX.Element {
  const isMobile = useIsMobile();
  return isMobile ? <MobileHud {...props} /> : <DesktopHud {...props} />;
}

// ---------------------------------------------------------------------------
// Desktop: the original free-floating engine-region panels.
// ---------------------------------------------------------------------------

function DesktopHud(props: Props): JSX.Element {
  const { title, cycle, resources, progress, arcComplete, selected, req, roster, party, onToggleAgent, onApplyDowntime, canRun, onRun, lastReport, dispatches, pendingDecision } = props;
  const min = req?.minAgents ?? 0;
  const max = req?.maxAgents ?? 0;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* top-left: identity + resources + progress */}
      <div style={{ ...panel, top: 14, left: 14, minWidth: 210 }}>
        <IdentityBlock title={title} cycle={cycle} resources={resources} progress={progress} />
      </div>

      <CoachLine
        pendingDecision={pendingDecision}
        selected={selected}
        partyCount={party.length}
        min={min}
        canRun={canRun}
        lastReport={lastReport}
        arcComplete={arcComplete}
        style={{ ...panel, top: 206, left: 14, width: 250, borderColor: "#6b5935", background: "rgba(32,28,20,0.9)" }}
      />

      {/* left: dispatches — the engine's authored story beats */}
      {dispatches.length > 0 && (
        <div style={{ ...panel, top: 276, left: 14, width: 250 }}>
          <SectionLabel>Dispatches</SectionLabel>
          {dispatches.slice(0, 4).map((d) => (
            <div key={d.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #2a2620" }}>
              <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 12.5, lineHeight: 1.4, color: "#d8cfbd" }}>{d.narrativeText}</div>
            </div>
          ))}
        </div>
      )}

      {/* right: roster — tap to assign */}
      <div style={{ ...panel, top: 14, right: 14, width: 220 }}>
        <SectionLabel>Roster {selected ? `· party ${party.length}/${max}` : "· tap to assign"}</SectionLabel>
        {roster.map((m) => (
          <RosterRow key={m.id} m={m} inParty={party.includes(m.id)} selectable={!!selected} onToggleAgent={onToggleAgent} onApplyDowntime={onApplyDowntime} />
        ))}
      </div>

      {/* bottom-center: selected contract + gated action */}
      {selected && (
        <div style={{ ...panel, bottom: 16, left: "50%", transform: "translateX(-50%)", maxWidth: 460, textAlign: "center" }}>
          <ContractSheet selected={selected} party={party} min={min} max={max} canRun={canRun} onRun={onRun} />
        </div>
      )}

      {/* arc complete banner */}
      {arcComplete && (
        <div style={{ ...panel, top: 80, left: "50%", transform: "translateX(-50%)", textAlign: "center", borderColor: "#74ad77" }}>
          <CompleteBanner />
        </div>
      )}

      {/* report */}
      {lastReport && (
        <div style={{ ...panel, bottom: 16, right: 14, maxWidth: 260 }}>
          <ReportCard lastReport={lastReport} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile: a top identity bar + a bottom flex dock. Flow layout, not absolute
// stacking, so the regions can never overlap. Safe-area insets keep content
// clear of the notch and the home indicator / browser chrome.
// ---------------------------------------------------------------------------

function MobileHud(props: Props): JSX.Element {
  const { title, cycle, resources, progress, arcComplete, selected, req, roster, party, onToggleAgent, onApplyDowntime, canRun, onRun, lastReport, dispatches, pendingDecision } = props;
  const min = req?.minAgents ?? 0;
  const max = req?.maxAgents ?? 0;
  const coach = getEngineCoachMessage({ pendingDecision, selected, partyCount: party.length, min, canRun, lastReport, arcComplete });
  const latestDispatch = dispatches[0];

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* top identity bar — full width, one compact scrollable strip. Right edge is
          left clear (paddingRight) for the floating Cartridge button. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          pointerEvents: "auto",
          padding: "calc(env(safe-area-inset-top, 0px) + 8px) 14px 8px 12px",
          paddingRight: 54,
          background: "linear-gradient(180deg, rgba(11,10,8,0.92) 0%, rgba(11,10,8,0.0) 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 19,
              color: "#ece4d4",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
              minWidth: 0,
            }}
          >
            {title}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 4, overflowX: "auto", whiteSpace: "nowrap", font: "11px 'IBM Plex Mono', ui-monospace, monospace" }}>
          <Chip label="Cycle" value={String(cycle).padStart(2, "0")} />
          <Chip label={resources.tokenName} value={String(resources.tokens)} />
          <Chip label={resources.currencyName} value={String(resources.currency)} />
          <Chip label={resources.reputationName} value={String(resources.reputation)} />
          <Chip label="Contracts" value={`${progress.cleared}/${progress.total}`} accent />
        </div>
      </div>

      {/* bottom dock — flex column, anchored to the bottom, stacks by flow. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "72vh",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "0 10px",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
          pointerEvents: "none",
        }}
      >
        {arcComplete && (
          <div style={{ ...panel, position: "relative", borderColor: "#74ad77", textAlign: "center" }}>
            <CompleteBanner />
          </div>
        )}

        {lastReport && (
          <div style={{ ...panel, position: "relative" }}>
            <ReportCard lastReport={lastReport} />
          </div>
        )}

        {/* coach only shows when no node owns the primary action (see getEngineCoachMessage) */}
        {coach && (
          <div style={{ ...panel, position: "relative", borderColor: "#6b5935", background: "rgba(32,28,20,0.92)" }}>
            <SectionLabel>Engine loop</SectionLabel>
            <div style={{ color: "#d8cfbd" }}>{coach}</div>
          </div>
        )}

        {/* the latest authored beat, kept to one line so the dock stays shallow */}
        {!selected && latestDispatch && (
          <div style={{ ...panel, position: "relative", padding: "8px 12px" }}>
            <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 12.5, lineHeight: 1.4, color: "#d8cfbd", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {latestDispatch.narrativeText}
            </div>
          </div>
        )}

        {/* roster strip — only when a contract is selected (that's when assignment
            is meaningful). Horizontal scroll keeps it to a single band. */}
        {selected && (
          <div style={{ ...panel, position: "relative", padding: "10px 12px", overflow: "hidden" }}>
            <SectionLabel>Roster · party {party.length}/{max}</SectionLabel>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
              {roster.map((m) => (
                <RosterChip key={m.id} m={m} inParty={party.includes(m.id)} onToggleAgent={onToggleAgent} onApplyDowntime={onApplyDowntime} />
              ))}
            </div>
          </div>
        )}

        {/* selected contract + gated action */}
        {selected && (
          <div style={{ ...panel, position: "relative", textAlign: "center", overflowY: "auto" }}>
            <ContractSheet selected={selected} party={party} min={min} max={max} canRun={canRun} onRun={onRun} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared region content (identical engine readouts in both layouts).
// ---------------------------------------------------------------------------

function IdentityBlock(props: { title: string; cycle: number; resources: Props["resources"]; progress: Props["progress"] }): JSX.Element {
  const { title, cycle, resources, progress } = props;
  return (
    <>
      <SectionLabel>Cartridge</SectionLabel>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 700, margin: "2px 0 8px" }}>{title}</div>
      <Row label="Cycle" value={String(cycle).padStart(2, "0")} />
      <Row label={resources.tokenName} value={String(resources.tokens)} />
      <Row label={resources.currencyName} value={String(resources.currency)} />
      <Row label={resources.reputationName} value={String(resources.reputation)} />
      <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid #3a352c" }}>
        <Row label="Contracts" value={`${progress.cleared} / ${progress.total}`} />
      </div>
    </>
  );
}

function ContractSheet(props: { selected: WorldNode; party: string[]; min: number; max: number; canRun: boolean; onRun: () => void }): JSX.Element {
  const { selected, party, min, max, canRun, onRun } = props;
  return (
    <>
      <div style={{ color: statusColor(selected.status), textTransform: "uppercase", fontSize: 11, letterSpacing: "0.1em" }}>{selected.status}</div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700 }}>{selected.title}</div>
      <div style={{ color: "#a59c8b", margin: "4px 0 8px" }}>{selected.description}</div>
      <div style={{ color: party.length >= min && party.length <= max ? "#74ad77" : "#c9a14a", fontSize: 12 }}>
        Party {party.length} · need {min}{max !== min ? `–${max}` : ""}
      </div>
      <button
        onClick={onRun}
        disabled={!canRun}
        style={{
          marginTop: 8,
          font: "700 15px 'Barlow Condensed', sans-serif",
          letterSpacing: "0.02em",
          padding: "9px 22px",
          borderRadius: 5,
          border: "none",
          cursor: canRun ? "pointer" : "not-allowed",
          background: canRun ? "#b01c18" : "#3a352c",
          color: canRun ? "#fff" : "#6e675a",
        }}
      >
        {selected.status === "locked"
          ? "Locked — clear earlier contracts"
          : selected.status === "cleared"
          ? "Cleared ✓"
          : canRun
          ? "Run Contract"
          : `Assign ${min}${max !== min ? `–${max}` : ""} to run`}
      </button>
      <StateReadout selected={selected} />
    </>
  );
}

function CompleteBanner(): JSX.Element {
  return (
    <div style={{ color: "#74ad77", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 700 }}>
      Charter complete — every contract cleared
    </div>
  );
}

function ReportCard(props: { lastReport: PlayReportView }): JSX.Element {
  const { lastReport } = props;
  return (
    <>
      <div style={{ color: statusColor(lastReport.outcome), textTransform: "uppercase", fontSize: 11, letterSpacing: "0.1em" }}>{lastReport.outcome}</div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700 }}>{lastReport.challengeName}</div>
      <div style={{ color: "#a59c8b", marginTop: 4 }}>{lastReport.rewardSummary}</div>
    </>
  );
}

function RosterRow(props: { m: RosterMember; inParty: boolean; selectable: boolean; onToggleAgent: (id: string) => void; onApplyDowntime: (id: string, a: DowntimeAction) => void }): JSX.Element {
  const { m, inParty, selectable, onToggleAgent, onApplyDowntime } = props;
  const downtimeActions = Object.keys(DOWNTIME_ACTIONS) as DowntimeAction[];
  return (
    <div
      style={{
        margin: "3px 0",
        padding: 5,
        borderRadius: 5,
        border: `1px solid ${inParty ? "#c9a14a" : "#3a352c"}`,
        background: inParty ? "rgba(201,161,74,0.14)" : "transparent",
      }}
    >
      <button
        disabled={m.downed || !selectable}
        onClick={() => onToggleAgent(m.id)}
        title={selectable ? "Assign to the selected contract" : "Select a contract first"}
        style={{
          display: "block",
          width: "100%",
          textAlign: "left",
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: m.downed || !selectable ? "default" : "pointer",
          color: m.downed ? "#5e5850" : "#ece4d4",
          font: "12px 'IBM Plex Mono', monospace",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <strong>{m.name}</strong>
          <span style={{ color: "#a59c8b" }}>{m.role}</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
          <Meter label="STR" value={m.stress} good="low" />
          <Meter label="MOR" value={m.morale} good="high" />
        </div>
      </button>
      <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
        {downtimeActions.map((a) => (
          <DowntimeButton key={a} action={a} onClick={() => onApplyDowntime(m.id, a)} />
        ))}
      </div>
    </div>
  );
}

/** Compact horizontal-scroll card for the mobile roster strip. */
function RosterChip(props: { m: RosterMember; inParty: boolean; onToggleAgent: (id: string) => void; onApplyDowntime: (id: string, a: DowntimeAction) => void }): JSX.Element {
  const { m, inParty, onToggleAgent, onApplyDowntime } = props;
  const downtimeActions = Object.keys(DOWNTIME_ACTIONS) as DowntimeAction[];
  return (
    <div
      style={{
        flex: "0 0 auto",
        width: 132,
        padding: 7,
        borderRadius: 6,
        border: `1px solid ${inParty ? "#c9a14a" : "#3a352c"}`,
        background: inParty ? "rgba(201,161,74,0.14)" : "rgba(0,0,0,0.2)",
      }}
    >
      <button
        disabled={m.downed}
        onClick={() => onToggleAgent(m.id)}
        style={{
          display: "block",
          width: "100%",
          textAlign: "left",
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: m.downed ? "default" : "pointer",
          color: m.downed ? "#5e5850" : "#ece4d4",
          font: "12px 'IBM Plex Mono', monospace",
        }}
      >
        <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
        <div style={{ color: "#a59c8b", fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.role}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <Meter label="STR" value={m.stress} good="low" />
          <Meter label="MOR" value={m.morale} good="high" />
        </div>
      </button>
      <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
        {downtimeActions.map((a) => (
          <DowntimeButton key={a} action={a} onClick={() => onApplyDowntime(m.id, a)} />
        ))}
      </div>
    </div>
  );
}

function DowntimeButton(props: { action: DowntimeAction; onClick: () => void }): JSX.Element {
  const { action, onClick } = props;
  const def = DOWNTIME_ACTIONS[action];
  return (
    <button
      onClick={onClick}
      title={`${def.label}: stress ${def.stressDelta >= 0 ? "+" : ""}${def.stressDelta}, morale ${def.moraleDelta >= 0 ? "+" : ""}${def.moraleDelta}`}
      style={{
        flex: 1,
        cursor: "pointer",
        padding: "4px 0",
        borderRadius: 5,
        border: "1px solid #5e5850",
        background: "rgba(201,161,74,0.10)",
        color: "#e6dcc8",
        font: "11px 'IBM Plex Mono', monospace",
      }}
    >
      {def.label}
    </button>
  );
}

function StateReadout(props: { selected: WorldNode }): JSX.Element {
  const { selected } = props;
  const label = selected.status === "locked"
    ? "Requirement"
    : selected.status === "cleared"
    ? "Cartridge mark"
    : "Runnable because";
  const copy = selected.status === "cleared"
    ? "This run has recorded a successful outcome here."
    : selected.requirements.length > 0
    ? selected.requirements.join(" · ")
    : "No extra requirements.";
  return (
    <div style={{ borderTop: "1px solid #3a352c", borderBottom: "1px solid #3a352c", padding: "6px 0", margin: "6px 0", fontSize: 12 }}>
      <div style={{ color: "#c9a14a", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 10 }}>{label}</div>
      <div style={{ color: selected.status === "locked" ? "#c9a14a" : selected.status === "cleared" ? "#74ad77" : "#d8cfbd" }}>{copy}</div>
    </div>
  );
}

function SectionLabel(props: { children: ReactNode }): JSX.Element {
  return (
    <div style={{ color: "#c9a14a", letterSpacing: "0.1em", textTransform: "uppercase", fontSize: 11, marginBottom: 6 }}>
      {props.children}
    </div>
  );
}

function Chip(props: { label: string; value: string; accent?: boolean }): JSX.Element {
  return (
    <span
      style={{
        flex: "0 0 auto",
        padding: "3px 8px",
        borderRadius: 5,
        border: `1px solid ${props.accent ? "#6b5935" : "#3a352c"}`,
        background: "rgba(23,21,15,0.7)",
      }}
    >
      <span style={{ color: "#a59c8b" }}>{props.label} </span>
      <strong style={{ color: props.accent ? "#c9a14a" : "#ece4d4" }}>{props.value}</strong>
    </span>
  );
}

function Row(props: { label: string; value: string }): JSX.Element {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 18 }}>
      <span style={{ color: "#a59c8b" }}>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function Meter(props: { label: string; value: number; good: "high" | "low" }): JSX.Element {
  const pct = Math.max(0, Math.min(100, props.value));
  const healthy = props.good === "high" ? pct >= 50 : pct <= 50;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 9, color: "#6e675a" }}>{props.label}</div>
      <div style={{ height: 4, background: "#3a352c", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: healthy ? "#74ad77" : "#b01c18" }} />
      </div>
    </div>
  );
}

function statusColor(s: string): string {
  if (s === "cleared" || s === "success") return "#74ad77";
  if (s === "locked" || s === "failure") return "#b01c18";
  return "#c9a14a";
}

export interface EngineCoachState {
  pendingDecision: boolean;
  selected: Pick<WorldNode, "status"> | null;
  partyCount: number;
  min: number;
  canRun: boolean;
  lastReport: PlayReportView | null;
  arcComplete: boolean;
}

function CoachLine(props: EngineCoachState & { style: CSSProperties }): JSX.Element | null {
  const copy = getEngineCoachMessage(props);
  if (!copy) return null;
  return (
    <div style={props.style}>
      <SectionLabel>Engine loop</SectionLabel>
      <div style={{ color: "#d8cfbd" }}>{copy}</div>
    </div>
  );
}

export function getEngineCoachMessage(props: EngineCoachState): string | null {
  if (props.arcComplete) return "Cartridge marked complete. Inspect or export the run state before leaving.";
  if (props.pendingDecision) return "Resolve the active decision. The engine applies its consequences to this cartridge run.";
  // Once a node is selected, the bottom action panel owns the primary action and
  // StateReadout owns the "why". Do not narrate the same state twice.
  if (props.selected) return null;
  if (!props.selected && props.lastReport) return "Outcome recorded. Inspect the changed cartridge state or choose another available node.";
  return null;
}
