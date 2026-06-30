// Engine-region components for the player shell. These are the SINGLE source of region
// content — there is no desktop vs mobile fork. Each region is breakpoint-agnostic and
// takes a `variant` (or plain props) so the Shell can place the SAME component into a
// desktop side-rail or a mobile bottom-dock. Layout density changes; ownership doesn't.
//
// Regions: StatusRegion · ViewSwitcher · RosterRegion · ContractRegion · ReportRegion
//        · CoachRegion · DispatchRegion · CompleteBanner.

import type { CSSProperties, ReactNode } from "react";
import type { DramaCard } from "../../engine/types.js";
import type { PlayReportView } from "../../play-pipeline/compile.js";
import type { RosterMember } from "../useArcWorld.js";
import type { WorldNode } from "../contract.js";
import type { ContractRequirements, FixSuggestion, PartyReadiness, CheckStatus, ProjectedOutcome } from "../readiness.js";
import { DOWNTIME_ACTIONS, type DowntimeAction } from "../agent-management.js";

export const panel: CSSProperties = {
  background: "rgba(23,21,15,0.88)",
  color: "#ece4d4",
  border: "1px solid #4a4238",
  borderRadius: 8,
  padding: "12px 14px",
  font: "13px/1.5 'IBM Plex Mono', ui-monospace, monospace",
  pointerEvents: "auto",
  backdropFilter: "blur(4px)",
};

// ── Status ──────────────────────────────────────────────────────────────────

export function StatusRegion(props: {
  title: string;
  cycle: number;
  resources: { currency: number; tokens: number; reputation: number; currencyName: string; tokenName: string; reputationName: string };
  progress: { cleared: number; total: number };
}): JSX.Element {
  const { title, cycle, resources, progress } = props;
  return (
    <div style={{ minWidth: 0 }}>
      <SectionLabel>Cartridge</SectionLabel>
      <div data-testid="cartridge-title" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 700, margin: "2px 0 6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#ece4d4", opacity: 1, textShadow: "0 1px 0 rgba(0,0,0,0.5)" }}>
        {title}
      </div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", whiteSpace: "nowrap", font: "11px 'IBM Plex Mono', ui-monospace, monospace" }}>
        <Chip label="Cycle" value={String(cycle).padStart(2, "0")} />
        {/* tokenName is cartridge-themed (here "Contracts" = reroll/assignment tokens);
            the progress chip is renamed "Recorded" so two chips aren't both "Contracts". */}
        <Chip label={resources.tokenName} value={String(resources.tokens)} />
        <Chip label={resources.currencyName} value={String(resources.currency)} />
        <Chip label={resources.reputationName} value={String(resources.reputation)} />
        <Chip label="Recorded" value={`${progress.cleared}/${progress.total}`} accent testid="cartridge-mark-count" />
      </div>
    </div>
  );
}

// ── View switcher ─────────────────────────────────────────────────────────────

export function ViewSwitcher(props: {
  costumes: Array<{ id: string; label: string; blurb: string }>;
  activeId: string;
  onChoose: (id: string) => void;
  disabled?: boolean;
}): JSX.Element {
  return (
    <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 8, background: "rgba(23,21,15,0.82)", border: "1px solid #4a4238", pointerEvents: "auto", font: "600 12px 'IBM Plex Mono', ui-monospace, monospace" }}>
      {props.costumes.map((c) => {
        const on = c.id === props.activeId;
        return (
          <button
            key={c.id}
            onClick={() => props.onChoose(c.id)}
            disabled={props.disabled}
            data-testid={c.id === "board" ? "view-run-graph" : c.id === "globe" ? "view-planet" : `view-${c.id}`}
            title={c.blurb}
            style={{ cursor: props.disabled ? "not-allowed" : "pointer", padding: "5px 11px", borderRadius: 5, border: "none", background: on ? "#b01c18" : "transparent", color: props.disabled ? "#5e5850" : on ? "#fff" : "#a59c8b" }}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Roster ──────────────────────────────────────────────────────────────────

export type RosterVariant = "list" | "strip";

export function RosterRegion(props: {
  roster: RosterMember[];
  party: string[];
  selectable: boolean;
  max: number;
  contract: ContractRequirements | null;
  variant: RosterVariant;
  onToggleAgent: (id: string) => void;
  onApplyDowntime: (id: string, a: DowntimeAction) => void;
}): JSX.Element {
  const { roster, party, selectable, max, contract, variant, onToggleAgent, onApplyDowntime } = props;
  const strip = variant === "strip";
  return (
    <div>
      <SectionLabel>Roster {selectable ? `· party ${party.length}/${max}` : "· select a contract to assign"}</SectionLabel>
      <div style={strip ? { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 } : undefined}>
        {roster.map((m) => (
          <RosterCard key={m.id} m={m} inParty={party.includes(m.id)} selectable={selectable} contract={contract} variant={variant} onToggleAgent={onToggleAgent} onApplyDowntime={onApplyDowntime} />
        ))}
      </div>
    </div>
  );
}

function RosterCard(props: {
  m: RosterMember;
  inParty: boolean;
  selectable: boolean;
  contract: ContractRequirements | null;
  variant: RosterVariant;
  onToggleAgent: (id: string) => void;
  onApplyDowntime: (id: string, a: DowntimeAction) => void;
}): JSX.Element {
  const { m, inParty, selectable, contract, variant, onToggleAgent, onApplyDowntime } = props;
  const strip = variant === "strip";
  const downtimeActions = Object.keys(DOWNTIME_ACTIONS) as DowntimeAction[];
  return (
    <div
      style={{
        ...(strip ? { flex: "0 0 auto", width: 150 } : { margin: "3px 0" }),
        padding: strip ? 7 : 5,
        borderRadius: strip ? 6 : 5,
        border: `1px solid ${inParty ? "#c9a14a" : "#3a352c"}`,
        background: inParty ? "rgba(201,161,74,0.14)" : strip ? "rgba(0,0,0,0.2)" : "transparent",
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
        <div style={strip ? undefined : { display: "flex", justifyContent: "space-between" }}>
          <span style={strip ? { display: "block", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } : undefined}>
            <strong>{m.name}</strong>
            <AfflictionBadge affliction={m.affliction} />
          </span>
          <span style={{ color: "#a59c8b", ...(strip ? { display: "block", fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } : {}) }}>{m.role}</span>
        </div>
        <AgentAttrLine m={m} contract={contract} />
        {m.gear.length > 0 && (
          <div style={{ fontSize: strip ? 9 : 10, color: "#74ad77", marginTop: 3, ...(strip ? { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } : {}) }}>⚒ {m.gear.map((g) => g.name).join(", ")}</div>
        )}
        <div style={{ display: "flex", gap: strip ? 6 : 8, marginTop: 4 }}>
          <Meter label="STR" value={m.stress} good="low" />
          <Meter label="MOR" value={m.morale} good="high" />
        </div>
      </button>
      <div style={{ display: "flex", gap: strip ? 3 : 4, marginTop: 5 }}>
        {downtimeActions.map((a) => (
          <DowntimeButton key={a} action={a} onClick={() => onApplyDowntime(m.id, a)} />
        ))}
      </div>
    </div>
  );
}

function fmt(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/** Downtime control that shows what it changes (stress/morale) right on the button, so
 *  the effect is visible before use — and the readiness projection updates after. */
function DowntimeButton(props: { action: DowntimeAction; onClick: () => void }): JSX.Element {
  const { action, onClick } = props;
  const def = DOWNTIME_ACTIONS[action];
  return (
    <button
      onClick={onClick}
      title={`${def.label}: stress ${fmt(def.stressDelta)}, morale ${fmt(def.moraleDelta)}`}
      style={{ flex: 1, cursor: "pointer", padding: "3px 0", borderRadius: 5, border: "1px solid #5e5850", background: "rgba(201,161,74,0.10)", color: "#e6dcc8", font: "11px 'IBM Plex Mono', monospace", lineHeight: 1.15 }}
    >
      <div style={{ fontWeight: 600 }}>{def.label}</div>
      <div style={{ fontSize: 9, color: "#a59c8b" }}>
        <span style={{ color: def.stressDelta <= 0 ? "#74ad77" : "#c9a14a" }}>{fmt(def.stressDelta)}s</span>{" "}
        <span style={{ color: def.moraleDelta >= 0 ? "#74ad77" : "#c9a14a" }}>{fmt(def.moraleDelta)}m</span>
      </div>
    </button>
  );
}

/** The agent's scores on the attributes the selected contract checks, with gear bonus. */
function AgentAttrLine(props: { m: RosterMember; contract: ContractRequirements | null }): JSX.Element | null {
  const { m, contract } = props;
  if (!contract || contract.checkedAttributes.length === 0) return null;
  const attrs = contract.checkedAttributes.slice(0, 3);
  let bestId = attrs[0]?.id ?? "";
  for (const a of attrs) if ((m.attributes[a.id] ?? 0) > (m.attributes[bestId] ?? 0)) bestId = a.id;
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", fontSize: 11 }}>
      {attrs.map((a) => {
        const gear = m.gear.reduce((s, g) => s + (g.bonuses[a.id] ?? 0), 0);
        const strong = a.id === bestId;
        return (
          <span key={a.id} style={{ color: strong ? "#ece4d4" : "#a59c8b" }}>
            {a.name} <strong style={{ color: strong ? "#c9a14a" : "#d8cfbd" }}>{m.attributes[a.id] ?? 0}</strong>
            {gear > 0 && <span style={{ color: "#74ad77" }}> +{gear}</span>}
          </span>
        );
      })}
    </div>
  );
}

function AfflictionBadge(props: { affliction: string | null }): JSX.Element | null {
  if (!props.affliction) return null;
  return (
    <span style={{ marginLeft: 6, fontSize: 9, color: "#b01c18", border: "1px solid #5e2a26", borderRadius: 3, padding: "0 4px", letterSpacing: "0.04em", textTransform: "uppercase" }}>
      {props.affliction}
    </span>
  );
}

// ── Selected contract + readiness ─────────────────────────────────────────────

export function ContractRegion(props: {
  selected: WorldNode;
  party: string[];
  min: number;
  max: number;
  canRun: boolean;
  onRun: () => void;
  contract: ContractRequirements | null;
  readiness: PartyReadiness | null;
  recommendation: string | null;
  fixPlan: FixSuggestion[] | null;
  onApplyFix: (fix: FixSuggestion) => void;
}): JSX.Element {
  const { selected, party, min, max, canRun, onRun, contract, readiness, recommendation, fixPlan, onApplyFix } = props;
  const showReadiness = selected.status === "available" && contract;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color: statusColor(selected.status), textTransform: "uppercase", fontSize: 11, letterSpacing: "0.1em" }}>{selected.status}</div>
      <div data-testid="selected-contract-title" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700 }}>{selected.title}</div>
      <div style={{ color: "#a59c8b", margin: "4px 0 8px" }}>{selected.description}</div>
      <div data-testid="party-count" style={{ color: party.length >= min && party.length <= max ? "#74ad77" : "#c9a14a", fontSize: 12 }}>
        Party {party.length} · need {min}{max !== min ? `–${max}` : ""}
      </div>

      {showReadiness && <ReadinessPanel contract={contract} readiness={readiness} />}
      {/* Only offer a fix plan when there's actually something to fix — never alongside
          a clean PROJECTED SUCCESS, which would contradict it. */}
      {showReadiness && readiness && readiness.projectedOutcome !== "success" && fixPlan && fixPlan.length > 0 && (
        <FixPlanPanel fixes={fixPlan} onApplyFix={onApplyFix} />
      )}

      <RunButton selected={selected} min={min} max={max} canRun={canRun} readiness={readiness} onRun={onRun} />

      {showReadiness && recommendation && (
        <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.4, color: "#8a8270", fontStyle: "italic" }}>{recommendation}</div>
      )}

      {selected.status !== "available" && <StateReadout selected={selected} />}
    </div>
  );
}


function RunButton(props: { selected: WorldNode; min: number; max: number; canRun: boolean; readiness: PartyReadiness | null; onRun: () => void }): JSX.Element {
  const { selected, min, max, canRun, readiness, onRun } = props;
  const outcome = readiness?.projectedOutcome ?? "none";
  const countOk = readiness?.countOk ?? canRun;
  const riskRun = canRun && outcome === "failure";
  const thinRun = canRun && outcome === "partial";
  const disabled = !canRun;
  const label = selected.status === "locked"
    ? "Locked — clear earlier contracts"
    : selected.status === "cleared"
    ? "Cleared ✓"
    : !countOk
    ? `Assign ${min}${max !== min ? `–${max}` : ""} to run`
    : riskRun
    ? "Risk Contract"
    : thinRun
    ? "Run With Risk"
    : "Run Contract";
  const background = disabled ? "#3a352c" : riskRun ? "#8f1410" : thinRun ? "#9a6a18" : "#b01c18";
  return (
    <>
      <button
        onClick={onRun}
        disabled={disabled}
        data-testid="run-contract-button"
        style={{
          marginTop: 8,
          font: "700 15px 'Barlow Condensed', sans-serif",
          letterSpacing: "0.02em",
          padding: "9px 22px",
          borderRadius: 5,
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          background,
          color: disabled ? "#6e675a" : "#fff",
        }}
      >
        {label}
      </button>
      {riskRun && <div style={{ marginTop: 6, color: "#b01c18", fontSize: 11 }}>Projected failure. Fix the party first or accept the risk.</div>}
      {thinRun && <div style={{ marginTop: 6, color: "#c9a14a", fontSize: 11 }}>Thin projection. This can work, but variance may swing it.</div>}
    </>
  );
}

function FixPlanPanel(props: { fixes: FixSuggestion[]; onApplyFix: (fix: FixSuggestion) => void }): JSX.Element {
  return (
    <div data-testid="fix-plan" style={{ marginTop: 10, textAlign: "left", borderTop: "1px solid #3a352c", paddingTop: 8 }}>
      <div style={{ color: "#c9a14a", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.1em", marginBottom: 6 }}>Fix party</div>
      <div style={{ display: "grid", gap: 6 }}>
        {props.fixes.map((fix, i) => {
          if (fix.kind === "add-agent") {
            return <FixButton key={i} label={`Add ${fix.agentName}`} reason={fix.reason} onClick={() => props.onApplyFix(fix)} />;
          }
          if (fix.kind === "swap-agent") {
            return <FixButton key={i} label={`Swap in ${fix.addAgentName}`} reason={fix.reason} onClick={() => props.onApplyFix(fix)} />;
          }
          if (fix.kind === "downtime") {
            return <FixButton key={i} label={`${fix.action} ${fix.agentName}`} reason={fix.reason} onClick={() => props.onApplyFix(fix)} />;
          }
          return <div key={i} style={{ color: "#a59c8b", fontSize: 11 }}>{fix.reason}</div>;
        })}
      </div>
    </div>
  );
}

function FixButton(props: { label: string; reason: string; onClick: () => void }): JSX.Element {
  return (
    <button type="button" onClick={props.onClick} style={{ textAlign: "left", padding: "7px 8px", borderRadius: 5, border: "1px solid #5e5850", background: "rgba(201,161,74,0.07)", color: "#ece4d4", cursor: "pointer", font: "700 12px 'IBM Plex Mono', monospace" }}>
      {props.label}
      <span style={{ display: "block", marginTop: 2, color: "#a59c8b", fontWeight: 400, fontSize: 10 }}>{props.reason}</span>
    </button>
  );
}

const STATUS_TONE: Record<CheckStatus, string> = { ready: "#74ad77", thin: "#c9a14a", short: "#b01c18" };
const STATUS_MARK: Record<CheckStatus, string> = { ready: "✓", thin: "~", short: "✗" };
const OUTCOME_TONE: Record<ProjectedOutcome, string> = { success: "#74ad77", partial: "#c9a14a", failure: "#b01c18", none: "#a59c8b" };
const OUTCOME_LABEL: Record<ProjectedOutcome, string> = { success: "Projected success", partial: "Projected partial", failure: "Projected to fail", none: "Assign a party" };

function ReadinessPanel(props: { contract: ContractRequirements; readiness: PartyReadiness | null }): JSX.Element {
  const { contract, readiness } = props;
  const outcome: ProjectedOutcome = readiness?.projectedOutcome ?? "none";
  return (
    <div style={{ borderTop: "1px solid #3a352c", margin: "8px 0 0", padding: "8px 0 0", textAlign: "left", fontSize: 12 }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
        <span data-testid="readiness-status" style={{ color: OUTCOME_TONE[outcome], fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 12 }}>{OUTCOME_LABEL[outcome]}</span>
      </div>

      {(contract.roles.length > 0 || contract.timePressure) && (
        <div style={{ color: "#a59c8b", marginBottom: 6 }}>
          {contract.roles.length > 0 && <span>Needs {contract.roles.map((r) => `${r.count} ${r.roleName}`).join(", ")}. </span>}
          {contract.timePressure && <span>Time pressure: {contract.timePressure.attributeName} ≥ {contract.timePressure.aggregateThreshold} over {contract.timePressure.rounds}.</span>}
        </div>
      )}

      <div style={{ display: "grid", gap: 3 }}>
        {(readiness?.checks ?? []).map((c) => {
          const attrs = contract.checks.find((cc) => cc.id === c.id)?.attributes.map((a) => a.name).join("+") ?? "";
          return (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ color: STATUS_TONE[c.status] }}>
                {STATUS_MARK[c.status]} {c.name}
                <span style={{ color: "#6e675a" }}> {attrs ? `· ${attrs}` : ""} {c.scope === "team_aggregate" ? "(team)" : c.scope === "role_specific" ? `(${c.roleNames.join("+") || "role"})` : ""}</span>
              </span>
              <span style={{ color: STATUS_TONE[c.status], whiteSpace: "nowrap" }}>{Math.round(c.projected)} / {Math.round(c.threshold)}</span>
            </div>
          );
        })}
      </div>

      {readiness && readiness.reasons.length > 0 && (
        <ul style={{ margin: "6px 0 0", padding: "0 0 0 16px", color: "#d8cfbd", fontSize: 11.5, lineHeight: 1.45 }}>
          {readiness.reasons.slice(0, 4).map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}
    </div>
  );
}

function StateReadout(props: { selected: WorldNode }): JSX.Element {
  const { selected } = props;
  const label = selected.status === "locked" ? "Requirement" : selected.status === "cleared" ? "Cartridge mark" : "Runnable because";
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

// ── Report · Coach · Dispatches · Complete ─────────────────────────────────────

export function ReportRegion(props: { lastReport: PlayReportView }): JSX.Element {
  const { lastReport } = props;
  return (
    <div data-testid="outcome-region">
      <div style={{ color: statusColor(lastReport.outcome), textTransform: "uppercase", fontSize: 11, letterSpacing: "0.1em" }}>{lastReport.outcome}</div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700 }}>{lastReport.challengeName}</div>
      <div style={{ color: "#a59c8b", marginTop: 4 }}>{lastReport.rewardSummary}</div>
    </div>
  );
}

export function CoachRegion(props: { message: string }): JSX.Element {
  return (
    <div>
      <SectionLabel>Engine loop</SectionLabel>
      <div style={{ color: "#d8cfbd" }}>{props.message}</div>
    </div>
  );
}

export function DispatchRegion(props: { dispatches: DramaCard[]; limit: number }): JSX.Element {
  return (
    <div>
      <SectionLabel>Dispatches</SectionLabel>
      {props.dispatches.slice(0, props.limit).map((d) => (
        <div key={d.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #2a2620" }}>
          <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 12.5, lineHeight: 1.4, color: "#d8cfbd" }}>{d.narrativeText}</div>
        </div>
      ))}
    </div>
  );
}

export function CompleteBanner(): JSX.Element {
  return (
    <div style={{ color: "#74ad77", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 700, textAlign: "center" }}>
      Charter complete — every contract cleared
    </div>
  );
}

// ── Small shared bits ──────────────────────────────────────────────────────────

export function SectionLabel(props: { children: ReactNode }): JSX.Element {
  return <div style={{ color: "#c9a14a", letterSpacing: "0.1em", textTransform: "uppercase", fontSize: 11, marginBottom: 6 }}>{props.children}</div>;
}

function Chip(props: { label: string; value: string; accent?: boolean; testid?: string }): JSX.Element {
  return (
    <span data-testid={props.testid} style={{ flex: "0 0 auto", padding: "3px 8px", borderRadius: 5, border: `1px solid ${props.accent ? "#6b5935" : "#3a352c"}`, background: "rgba(23,21,15,0.7)" }}>
      <span style={{ color: "#a59c8b" }}>{props.label} </span>
      <strong style={{ color: props.accent ? "#c9a14a" : "#ece4d4" }}>{props.value}</strong>
    </span>
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
