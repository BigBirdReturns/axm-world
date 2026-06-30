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
import type { PendingLootChoice, RosterMember } from "../useArcWorld.js";
import type { WorldNode } from "../contract.js";
import type { ContractRequirements, FixSuggestion, PartyReadiness, CheckStatus, ProjectedOutcome } from "../readiness.js";
import { DOWNTIME_ACTIONS, type DowntimeAction } from "../agent-management.js";
import "../pixel-ui/pixel-ui.css";
import { PixelBadge, PixelButton, PixelIcon, PixelMeter, PixelPanel, type PixelIconName } from "../pixel-ui/index.js";
import { RodohRuntimeMark } from "../brand/RodohRuntimeMark.js";

// The `panel` export is kept for Shell.tsx wrappers that set the outer chrome.
// Gameplay content inside uses cream PixelPanel — this dark shell is system chrome only.
export const panel: CSSProperties = {
  background: "rgba(23,21,15,0.88)",
  color: "#ece4d4",
  border: "1px solid #4a4238",
  borderRadius: 0,
  padding: "12px 14px",
  font: "13px/1.5 'IBM Plex Mono', ui-monospace, monospace",
  pointerEvents: "auto",
  backdropFilter: "blur(4px)",
};

const ROLE_ICON: Record<string, PixelIconName> = {
  Vanguard: "vanguard",
  Skirmisher: "skirmisher",
  Mender: "mender",
};

const ATTR_ICON: Record<string, PixelIconName> = {
  power: "power", mettle: "mettle", wits: "wits", spirit: "spirit",
  Power: "power", Mettle: "mettle", Wits: "wits", Spirit: "spirit",
};

function attrIcon(nameOrId: string): PixelIconName {
  return ATTR_ICON[nameOrId] ?? "available";
}

function roleIcon(name: string): PixelIconName {
  return ROLE_ICON[name] ?? "selected";
}

function roleBadgeClass(name: string): string {
  return `role-badge role-badge--${name.toLowerCase()}`;
}

function itemIcon(name: string): PixelIconName {
  const key = name.toLowerCase();
  if (key.includes("blade") || key.includes("pick")) return "rustyBlade";
  if (key.includes("charm") || key.includes("favor") || key.includes("seal") || key.includes("trophy")) return "guardCharm";
  if (key.includes("satchel") || key.includes("cloak") || key.includes("pauldron")) return "fieldSatchel";
  return "lootAvailable";
}

function scoreText(value?: number): string {
  return value === undefined ? "" : String(Math.round(value * 10) / 10);
}

function attrNameLabel(id: string): string {
  return id.slice(0, 1).toUpperCase() + id.slice(1);
}

function fmt(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

// ── Status (system chrome — stays dark) ──────────────────────────────────────

export function StatusRegion(props: {
  title: string;
  cycle: number;
  resources: { currency: number; tokens: number; reputation: number; currencyName: string; tokenName: string; reputationName: string };
  progress: { cleared: number; total: number };
}): JSX.Element {
  const { title, cycle, resources, progress } = props;
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <RodohRuntimeMark variant="micro" showText={false} />
        <span className="pixel-panel__title" style={{ marginBottom: 0 }}>Cartridge</span>
      </div>
      <div
        data-testid="cartridge-title"
        style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: 16, fontWeight: 800, letterSpacing: "0.04em", margin: "3px 0 7px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#ece4d4" }}
      >
        {title}
      </div>
      <div style={{ display: "flex", gap: 5, overflowX: "auto", whiteSpace: "nowrap" }}>
        <StatusChip label="Cycle" value={String(cycle).padStart(2, "0")} />
        <StatusChip label={resources.tokenName} value={String(resources.tokens)} />
        <StatusChip label={resources.currencyName} value={String(resources.currency)} />
        <StatusChip label={resources.reputationName} value={String(resources.reputation)} />
        <StatusChip label="Recorded" value={`${progress.cleared}/${progress.total}`} accent testid="cartridge-mark-count" />
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
    <div style={{ display: "flex", gap: 4, padding: 4, background: "rgba(23,21,15,0.82)", border: "1px solid #4a4238", pointerEvents: "auto" }}>
      {props.costumes.map((c) => {
        const on = c.id === props.activeId;
        return (
          <button
            key={c.id}
            onClick={() => props.onChoose(c.id)}
            disabled={props.disabled}
            data-testid={c.id === "board" ? "view-run-graph" : c.id === "globe" ? "view-planet" : `view-${c.id}`}
            title={c.blurb}
            style={{ cursor: props.disabled ? "not-allowed" : "pointer", padding: "5px 11px", border: "none", background: on ? "var(--gold)" : "transparent", color: props.disabled ? "#5e5850" : on ? "var(--ink)" : "#a59c8b", fontFamily: "var(--px-font)", fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" }}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Roster ────────────────────────────────────────────────────────────────────

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
      <div className="pixel-panel__title">
        Roster {selectable ? `· party ${party.length}/${max}` : "· select a contract to assign"}
      </div>
      <div style={strip ? { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 } : { display: "grid", gap: 6 }}>
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
    <PixelPanel
      data-testid="roster-card"
      style={{
        ...(strip ? { flex: "0 0 auto", width: 176 } : {}),
        padding: 10,
        borderColor: inParty ? "var(--gold-border)" : undefined,
        boxShadow: inParty ? "3px 3px 0 var(--gold-border)" : undefined,
        opacity: m.downed ? 0.55 : 1,
      }}
    >
      <button
        disabled={m.downed || !selectable}
        onClick={() => onToggleAgent(m.id)}
        title={selectable ? "Assign to the selected contract" : "Select a contract first"}
        style={{ display: "block", width: "100%", minHeight: 44, textAlign: "left", padding: 0, border: "none", background: "transparent", cursor: m.downed || !selectable ? "default" : "pointer", fontFamily: "var(--px-font)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start" }}>
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: "block", fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
              <span className={roleBadgeClass(m.role)}>
                <PixelIcon name={roleIcon(m.role)} />
                {m.role}
              </span>
              {inParty && <span className="role-badge" style={{ color: "var(--teal)", borderColor: "var(--teal)" }}>Assigned</span>}
              <AfflictionBadge affliction={m.affliction} />
            </div>
          </div>
          {inParty && <PixelIcon name="selected" label="Assigned" />}
        </div>
        <AgentAttrLine m={m} contract={contract} />
        <GearLine m={m} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
          <MeterRow label="Stress" value={m.stress} goodWhen="low" />
          <MeterRow label="Morale" value={m.morale} goodWhen="high" />
        </div>
      </button>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 4, marginTop: 8, borderTop: "1px solid var(--cream-border)", paddingTop: 8 }}>
        {downtimeActions.map((a) => (
          <DowntimeButton key={a} action={a} onClick={() => onApplyDowntime(m.id, a)} />
        ))}
      </div>
    </PixelPanel>
  );
}

function GearLine(props: { m: RosterMember }): JSX.Element {
  const { m } = props;
  if (m.gear.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--stone)", marginTop: 6 }}>
        <PixelIcon name="emptySlot" /> Gear: empty slot
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gap: 3, fontSize: 10, color: "var(--coffee)", marginTop: 6 }}>
      {m.gear.map((gear) => {
        const bonus = Object.entries(gear.bonuses).map(([attr, value]) => `${attrNameLabel(attr)} +${value}`).join(" · ");
        return (
          <div key={gear.id}>
            <PixelIcon name={itemIcon(gear.name)} /> {gear.name}
            {bonus && <span style={{ color: "var(--ink-muted)", marginLeft: 4 }}>{bonus}</span>}
          </div>
        );
      })}
    </div>
  );
}

function DowntimeButton(props: { action: DowntimeAction; onClick: () => void }): JSX.Element {
  const { action, onClick } = props;
  const def = DOWNTIME_ACTIONS[action];
  return (
    <PixelButton
      type="button"
      variant="secondary"
      onClick={onClick}
      title={`${def.label}: Stress ${fmt(def.stressDelta)} · Morale ${fmt(def.moraleDelta)}`}
      style={{ padding: "5px 4px", minHeight: 44, minWidth: 44, fontSize: 9, lineHeight: 1.2 }}
    >
      <div style={{ fontWeight: 800 }}>{def.label}</div>
      <div style={{ fontSize: 8, marginTop: 2 }}>
        <span style={{ color: def.stressDelta <= 0 ? "var(--teal-dark)" : "var(--gold-dark)" }}>Str {fmt(def.stressDelta)}</span>
        {" "}
        <span style={{ color: def.moraleDelta >= 0 ? "var(--teal-dark)" : "var(--gold-dark)" }}>Mor {fmt(def.moraleDelta)}</span>
      </div>
    </PixelButton>
  );
}

function AgentAttrLine(props: { m: RosterMember; contract: ContractRequirements | null }): JSX.Element | null {
  const { m, contract } = props;
  if (!contract || contract.checkedAttributes.length === 0) return null;
  const attrs = contract.checkedAttributes.slice(0, 4);
  let bestId = attrs[0]?.id ?? "";
  for (const a of attrs) if ((m.attributes[a.id] ?? 0) > (m.attributes[bestId] ?? 0)) bestId = a.id;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 4, marginTop: 8, fontSize: 10 }}>
      {attrs.map((a) => {
        const gear = m.gear.reduce((sum, g) => sum + (g.bonuses[a.id] ?? 0), 0);
        const strong = a.id === bestId;
        return (
          <span key={a.id} style={{ display: "flex", alignItems: "center", gap: 4, color: strong ? "var(--ink)" : "var(--ink-muted)" }}>
            <PixelIcon name={attrIcon(a.id)} />
            {a.name} <strong style={{ color: strong ? "var(--gold-dark)" : "var(--ink-soft)" }}>{m.attributes[a.id] ?? 0}</strong>
            {gear > 0 && <span style={{ color: "var(--teal-dark)" }}>+{gear}</span>}
          </span>
        );
      })}
    </div>
  );
}

function AfflictionBadge(props: { affliction: string | null }): JSX.Element | null {
  if (!props.affliction) return null;
  return (
    <PixelBadge state="failing" style={{ fontSize: 8, minHeight: 18, padding: "1px 5px" }}>
      {props.affliction}
    </PixelBadge>
  );
}

function MeterRow(props: { label: string; value: number; goodWhen: "high" | "low" }): JSX.Element {
  const { label, value, goodWhen } = props;
  const pct = Math.max(0, Math.min(100, value));
  const isGood = goodWhen === "high" ? pct >= 50 : pct <= 50;
  const color = isGood ? "var(--teal)" : "var(--danger)";
  return (
    <div>
      <div style={{ fontSize: 9, color: "var(--ink-muted)", marginBottom: 2 }}>{label} {Math.round(pct)}</div>
      <PixelMeter value={pct} max={100} segments={5} color={color} label={label} />
    </div>
  );
}

// ── Contract + Readiness ──────────────────────────────────────────────────────

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
  const contractStateBadge: Record<string, "available" | "locked" | "recorded"> = {
    available: "available", locked: "locked", cleared: "recorded",
  };
  const contractStateLabel: Record<string, string> = {
    available: "Available", locked: "Locked", cleared: "Cleared",
  };
  return (
    <PixelPanel style={{ padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <PixelBadge state={contractStateBadge[selected.status] ?? "available"}>
          {contractStateLabel[selected.status] ?? selected.status}
        </PixelBadge>
      </div>
      <div data-testid="selected-contract-title" style={{ fontFamily: "var(--px-font)", fontSize: 18, fontWeight: 800, letterSpacing: "0.02em", color: "var(--ink)", marginBottom: 4 }}>
        {selected.title}
      </div>
      <div style={{ color: "var(--ink-muted)", fontSize: 12, marginBottom: 10, lineHeight: 1.4 }}>{selected.description}</div>

      <div data-testid="party-count" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: party.length >= min && party.length <= max ? "var(--teal-dark)" : "var(--gold-dark)", marginBottom: 8, fontFamily: "var(--px-font)" }}>
        Party {party.length} · need {min}{max !== min ? `–${max}` : ""}
      </div>

      {showReadiness && <ReadinessPanel contract={contract} readiness={readiness} />}
      {showReadiness && readiness && readiness.projectedOutcome !== "success" && fixPlan && fixPlan.length > 0 && (
        <FixPlanPanel fixes={fixPlan} onApplyFix={onApplyFix} />
      )}

      <RunButton selected={selected} min={min} max={max} canRun={canRun} readiness={readiness} onRun={onRun} />

      {showReadiness && recommendation && (
        <div style={{ marginTop: 8, fontSize: 10, lineHeight: 1.4, color: "var(--stone)", fontStyle: "italic", fontFamily: "var(--px-font)" }}>{recommendation}</div>
      )}

      {selected.status !== "available" && <StateReadout selected={selected} />}
    </PixelPanel>
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
    ? "Locked"
    : selected.status === "cleared"
    ? "Cleared ✓"
    : !countOk
    ? `Assign ${min}${max !== min ? `–${max}` : ""}`
    : riskRun
    ? "Risk Contract"
    : thinRun
    ? "Run With Risk"
    : "Run Contract";
  const variant = disabled ? "disabled" : riskRun ? "danger" : thinRun ? "primary" : "confirm";
  return (
    <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
      <PixelButton
        onClick={onRun}
        disabled={disabled}
        data-testid="run-contract-button"
        variant={variant}
        style={{ minWidth: "100%", fontSize: 14 }}
      >
        {label}
      </PixelButton>
      {riskRun && <div style={{ color: "var(--danger)", fontSize: 11, fontFamily: "var(--px-font)" }}>Projected failure. Fix the party or knowingly accept the risk.</div>}
      {thinRun && <div style={{ color: "var(--gold-dark)", fontSize: 11, fontFamily: "var(--px-font)" }}>Risk remains. The run can work, but the buffer is thin.</div>}
    </div>
  );
}

function FixPlanPanel(props: { fixes: FixSuggestion[]; onApplyFix: (fix: FixSuggestion) => void }): JSX.Element {
  return (
    <div data-testid="fix-plan" style={{ marginTop: 10, borderTop: "1px solid var(--cream-border)", paddingTop: 10 }}>
      <div className="pixel-panel__title" style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <PixelIcon name="risky" /> Fix this contract
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {props.fixes.map((fix, i) => {
          if (fix.kind === "add-agent") {
            return <FixButton key={i} label={`Add ${fix.agentName}`} fix={fix} onClick={() => props.onApplyFix(fix)} />;
          }
          if (fix.kind === "swap-agent") {
            return <FixButton key={i} label={`Swap in ${fix.addAgentName}`} fix={fix} onClick={() => props.onApplyFix(fix)} />;
          }
          if (fix.kind === "downtime") {
            const def = DOWNTIME_ACTIONS[fix.action];
            return <FixButton key={i} label={`${def.label} ${fix.agentName}`} fix={fix} onClick={() => props.onApplyFix(fix)} />;
          }
          return (
            <div key={i} style={{ padding: "8px 10px", border: "1px solid var(--cream-border)", fontFamily: "var(--px-font)", color: "var(--ink-muted)", fontSize: 11 }}>
              {fix.reason}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FixButton(props: { label: string; fix: FixSuggestion; onClick: () => void }): JSX.Element {
  const { fix } = props;
  const afterStatus = fix.kind !== "risk" ? fix.afterStatus : undefined;
  const delta = fix.kind !== "risk" && fix.beforeScore !== undefined && fix.afterScore !== undefined
    ? `${scoreText(fix.beforeScore)} → ${scoreText(fix.afterScore)}${afterStatus === "ready" ? " reliable" : afterStatus === "thin" ? " risky" : afterStatus === "short" ? " failing" : ""}`
    : "";
  return (
    <PixelButton
      type="button"
      onClick={props.onClick}
      variant={fix.kind === "downtime" ? "secondary" : "primary"}
      style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", fontSize: 12, lineHeight: 1.25 }}
    >
      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span>{props.label}</span>
        {delta && (
          <span style={{ color: afterStatus === "ready" ? "var(--teal-dark)" : afterStatus === "short" ? "var(--danger-dark)" : "var(--ink-soft)", fontSize: 10 }}>
            {delta}
          </span>
        )}
      </span>
      <span style={{ display: "block", marginTop: 3, fontWeight: 400, fontSize: 10, color: "var(--ink-soft)" }}>{fix.reason}</span>
    </PixelButton>
  );
}

const STATUS_MARK: Record<CheckStatus, PixelIconName> = { ready: "reliable", thin: "risky", short: "failing" };
const STATUS_LABEL: Record<CheckStatus, string> = { ready: "Reliable", thin: "Risky", short: "Failing" };
const STATUS_ROW_CLASS: Record<CheckStatus, string> = { ready: "check-row check-row--ready", thin: "check-row check-row--thin", short: "check-row check-row--short" };
const OUTCOME_STATE: Record<ProjectedOutcome, "reliable" | "risky" | "failing" | "recorded"> = { success: "reliable", partial: "risky", failure: "failing", none: "recorded" };
const OUTCOME_LABEL: Record<ProjectedOutcome, string> = { success: "Projected Reliable", partial: "Projected Risky", failure: "Projected to Fail", none: "Assign a party" };

function ReadinessPanel(props: { contract: ContractRequirements; readiness: PartyReadiness | null }): JSX.Element {
  const { contract, readiness } = props;
  const outcome: ProjectedOutcome = readiness?.projectedOutcome ?? "none";
  return (
    <div style={{ borderTop: "1px solid var(--cream-border)", margin: "0 0 10px", paddingTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
        <PixelBadge data-testid="readiness-status" state={OUTCOME_STATE[outcome]} icon={<PixelIcon name={OUTCOME_STATE[outcome]} />}>
          {OUTCOME_LABEL[outcome]}
        </PixelBadge>
      </div>

      {(contract.roles.length > 0 || contract.timePressure) && (
        <div style={{ display: "grid", gap: 4, marginBottom: 10, fontSize: 11, color: "var(--ink-muted)", fontFamily: "var(--px-font)" }}>
          {contract.roles.length > 0 && (
            <div>
              <strong style={{ color: "var(--coffee)" }}>Roles:</strong>{" "}
              {contract.roles.map((r) => `${r.count} ${r.roleName}`).join(", ")}
            </div>
          )}
          {contract.timePressure && (
            <div>
              <strong style={{ color: "var(--coffee)" }}>Time:</strong>{" "}
              {contract.timePressure.attributeName} ≥ {contract.timePressure.aggregateThreshold} over {contract.timePressure.rounds} rounds
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gap: 6 }}>
        {(readiness?.checks ?? []).map((c) => {
          const req = contract.checks.find((cc) => cc.id === c.id);
          const attrs = req?.attributes ?? [];
          const scope = c.scope === "team_aggregate" ? "team" : c.scope === "role_specific" ? (c.roleNames.join("+") || "role") : "per-agent";
          const topContrib = [...c.contributors]
            .filter((x) => x.inScope)
            .sort((a, b) => b.total - a.total)
            .slice(0, 2);

          // Threshold explanation for authored perAssignedAgent scaling
          const partySize = c.thresholdMode === "perAssignedAgent" && c.baseThreshold > 0
            ? Math.round(c.threshold / c.baseThreshold)
            : null;
          const primaryAttr = attrs[0];
          const thresholdCopy = partySize !== null && primaryAttr
            ? `${c.baseThreshold} ${primaryAttr.name} per agent · ${partySize} assigned → target ${Math.round(c.threshold)}`
            : null;

          return (
            <div key={c.id} className={STATUS_ROW_CLASS[c.status]} style={{ fontFamily: "var(--px-font)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <span style={{ fontWeight: 800, fontSize: 12, color: "var(--ink)", display: "flex", alignItems: "center", gap: 5 }}>
                  <PixelIcon name={STATUS_MARK[c.status]} /> {c.name}
                </span>
                <span style={{ fontWeight: 700, fontSize: 12, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>
                  {scoreText(c.projected)} / {Math.round(c.threshold)}
                </span>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, fontSize: 10, color: "var(--stone)", marginTop: 4 }}>
                {attrs.map((a) => (
                  <span key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <PixelIcon name={attrIcon(a.id)} /> {a.name}
                  </span>
                ))}
                <span>· {scope}</span>
                <span>· {STATUS_LABEL[c.status]}</span>
              </div>

              {thresholdCopy && (
                <div style={{ fontSize: 10, color: "var(--coffee)", marginTop: 4 }}>
                  {thresholdCopy}
                </div>
              )}

              {c.status === "thin" && (
                <div style={{ fontSize: 11, color: "var(--gold-dark)", marginTop: 5 }}>
                  Passing by +{scoreText(c.margin)} · needs +{scoreText(c.shortBy)} more buffer to become reliable.
                </div>
              )}
              {c.status === "short" && (
                <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 5 }}>
                  Failing by {scoreText(Math.abs(c.margin))} · needs +{scoreText(c.shortBy)} to become reliable.
                </div>
              )}
              {c.status === "ready" && (
                <div style={{ fontSize: 10, color: "var(--teal-dark)", marginTop: 5 }}>
                  Reliable buffer reached.
                </div>
              )}

              {topContrib.length > 0 && (
                <div style={{ fontSize: 10, color: "var(--stone)", marginTop: 5 }}>
                  Top: {topContrib.map((x) => `${x.agentName} ${scoreText(x.total)}`).join(" · ")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {readiness && readiness.reasons.length > 0 && (
        <ul style={{ margin: "8px 0 0", padding: "0 0 0 14px", fontSize: 11, lineHeight: 1.5, color: "var(--ink-muted)", fontFamily: "var(--px-font)" }}>
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
  const stateColor = selected.status === "cleared" ? "var(--teal-dark)" : selected.status === "locked" ? "var(--gold-dark)" : "var(--ink-soft)";
  return (
    <div style={{ borderTop: "1px solid var(--cream-border)", paddingTop: 8, marginTop: 10, fontFamily: "var(--px-font)" }}>
      <div className="pixel-panel__title">{label}</div>
      <div style={{ fontSize: 12, color: stateColor }}>{copy}</div>
    </div>
  );
}

// ── Loot / Equip ──────────────────────────────────────────────────────────────

export function LootRegion(props: { loot: PendingLootChoice[]; onClaimLoot: (choiceId: string, agentId: string) => void }): JSX.Element | null {
  if (props.loot.length === 0) return null;
  return (
    <div data-testid="loot-region" style={{ display: "grid", gap: 8 }}>
      <div className="pixel-panel__title" style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <PixelIcon name="lootAvailable" /> Loot / Equip
      </div>
      {props.loot.map((choice) => {
        const bonus = Object.entries(choice.bonuses).map(([attr, value]) => `${attrNameLabel(attr)} +${value}`).join(" · ");
        const preferred = choice.eligibleAgents[0];
        return (
          <PixelPanel key={choice.id} style={{ padding: 12 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "start" }}>
              <div style={{ fontSize: 24, color: "var(--coffee)", lineHeight: 1 }}>
                <PixelIcon name={itemIcon(choice.itemName)} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: "var(--ink)", fontFamily: "var(--px-font)" }}>{choice.itemName}</div>
                <div style={{ color: "var(--coffee)", fontSize: 11, marginTop: 2, fontFamily: "var(--px-font)" }}>{choice.slot} · {bonus || "utility"}</div>
                <div style={{ color: "var(--stone)", fontSize: 10, marginTop: 4, lineHeight: 1.4, fontFamily: "var(--px-font)" }}>{choice.flavorText}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  {choice.eligibleAgents.slice(0, 3).map((agent) => (
                    <PixelButton key={agent.id} variant={agent.id === preferred?.id ? "confirm" : "secondary"} onClick={() => props.onClaimLoot(choice.id, agent.id)} style={{ minHeight: 36, fontSize: 10, padding: "5px 10px" }}>
                      Equip → {agent.name}
                    </PixelButton>
                  ))}
                </div>
              </div>
            </div>
          </PixelPanel>
        );
      })}
    </div>
  );
}

// ── Report · Coach · Dispatches · Complete ────────────────────────────────────

export function ReportRegion(props: { lastReport: PlayReportView }): JSX.Element {
  const { lastReport } = props;
  const outcomeState: Record<string, "reliable" | "risky" | "failing"> = {
    success: "reliable", partial: "risky", failure: "failing",
  };
  const outcomeLabel: Record<string, string> = {
    success: "Outcome: Success", partial: "Outcome: Partial", failure: "Outcome: Failed",
  };
  return (
    <PixelPanel data-testid="outcome-region" style={{ padding: "12px 14px" }}>
      <div className="pixel-panel__title">Contract Outcome</div>
      <div style={{ marginBottom: 8 }}>
        <PixelBadge state={outcomeState[lastReport.outcome] ?? "recorded"}>
          {outcomeLabel[lastReport.outcome] ?? lastReport.outcome}
        </PixelBadge>
      </div>
      <div style={{ fontFamily: "var(--px-font)", fontSize: 14, fontWeight: 800, color: "var(--ink)", marginBottom: 4 }}>{lastReport.challengeName}</div>
      <div style={{ color: "var(--ink-muted)", fontSize: 12, fontFamily: "var(--px-font)" }}>{lastReport.rewardSummary}</div>
    </PixelPanel>
  );
}

export function CoachRegion(props: { message: string }): JSX.Element {
  return (
    <div>
      <div className="pixel-panel__title">Engine loop</div>
      <div style={{ color: "var(--ink-soft)", fontSize: 12, fontFamily: "var(--px-font)" }}>{props.message}</div>
    </div>
  );
}

export function DispatchRegion(props: { dispatches: DramaCard[]; limit: number }): JSX.Element {
  return (
    <div>
      <div className="pixel-panel__title">Dispatches</div>
      {props.dispatches.slice(0, props.limit).map((d) => (
        <div key={d.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--cream-border)" }}>
          <div style={{ fontFamily: "var(--px-font)", fontSize: 12, lineHeight: 1.45, color: "var(--ink-soft)" }}>{d.narrativeText}</div>
        </div>
      ))}
    </div>
  );
}

export function CompleteBanner(): JSX.Element {
  return (
    <PixelPanel style={{ padding: "16px 20px", textAlign: "center" }}>
      <PixelBadge state="reliable" style={{ marginBottom: 8, display: "inline-flex" }}>Charter Complete</PixelBadge>
      <div style={{ fontFamily: "var(--px-font)", fontSize: 16, fontWeight: 800, color: "var(--teal-dark)" }}>
        Every contract cleared
      </div>
    </PixelPanel>
  );
}

// ── Small shared bits ──────────────────────────────────────────────────────────

export function SectionLabel(props: { children: ReactNode }): JSX.Element {
  return <div className="pixel-panel__title">{props.children}</div>;
}

function StatusChip(props: { label: string; value: string; accent?: boolean; testid?: string }): JSX.Element {
  return (
    <span
      data-testid={props.testid}
      style={{
        flex: "0 0 auto",
        padding: "3px 8px",
        border: `1px solid ${props.accent ? "var(--parchment-gold)" : "#3a352c"}`,
        background: props.accent ? "rgba(216,178,118,0.15)" : "rgba(23,21,15,0.5)",
        fontFamily: "var(--px-font)",
        fontSize: 10,
      }}
    >
      <span style={{ color: "#a59c8b" }}>{props.label} </span>
      <strong style={{ color: props.accent ? "var(--parchment-gold)" : "#ece4d4" }}>{props.value}</strong>
    </span>
  );
}
