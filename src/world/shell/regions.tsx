// Engine-region components for the player shell. These are the SINGLE source of region
// content — there is no desktop vs mobile fork. Each region is breakpoint-agnostic and
// takes a `variant` (or plain props) so the Shell can place the SAME component into a
// desktop side-rail or a mobile bottom-dock. Layout density changes; ownership doesn't.
//
// Regions: StatusRegion · ViewSwitcher · RosterRegion · ContractRegion · ReportRegion
//        · CoachRegion · DispatchRegion · CompleteBanner.

import { useState, type CSSProperties, type ReactNode } from "react";
import type { DramaCard } from "../../engine/types.js";
import type { PlayReportView } from "../../play-pipeline/compile.js";
import type { PendingLootChoice, RosterMember } from "../useArcWorld.js";
import type { WorldNode } from "../contract.js";
import type { ContractRequirements, FixSuggestion, PartyReadiness, ProjectedOutcome } from "../readiness.js";
import { DOWNTIME_ACTIONS, downtimeActionLabel } from "../agent-management.js";
import { attrIcon, roleIcon, itemIcon } from "../theme-icons.js";
import { t, useLocale, type Locale } from "../i18n/index.js";
import "../pixel-ui/pixel-ui.css";
import {
  PixelBadge,
  PixelButton,
  PixelIcon,
  PixelPanel,
  PixelRosterCard,
  PixelLootCard,
  PixelReadinessRow,
  type PixelIconName,
  type ReadinessStatus,
  type RosterCardAttribute,
  type RosterCardGear,
} from "../pixel-ui/index.js";

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

function scoreText(value?: number): string {
  return value === undefined ? "" : String(Math.round(value * 10) / 10);
}

function attrNameLabel(id: string): string {
  return id.slice(0, 1).toUpperCase() + id.slice(1);
}

function fmt(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

// ── Status (system chrome — stays dark) ─────────────────────────────────────────────────────
// RodohRuntimeMark does NOT live here. It belongs on boot/loading/cartridge-select,
// not in the active gameplay HUD.

export function StatusRegion(props: {
  title: string;
  cycle: number;
  resources: { currency: number; tokens: number; reputation: number; currencyName: string; tokenName: string; reputationName: string };
  progress: { cleared: number; total: number };
}): JSX.Element {
  const { title, cycle, resources, progress } = props;
  return (
    <div style={{ minWidth: 0 }}>
      <div
        data-testid="cartridge-title"
        style={{ fontFamily: "var(--px-font)", fontSize: 16, fontWeight: 800, letterSpacing: "0.04em", marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#ece4d4" }}
      >
        {title}
      </div>
      <div style={{ display: "flex", gap: 5, overflowX: "auto", whiteSpace: "nowrap", scrollbarWidth: "none" }}>
        <StatusChip label={t("shell.cycle")} value={String(cycle).padStart(2, "0")} />
        <StatusChip label={resources.tokenName} value={String(resources.tokens)} />
        <StatusChip label={resources.currencyName} value={String(resources.currency)} />
        <StatusChip label={resources.reputationName} value={String(resources.reputation)} />
        <StatusChip label={t("shell.recorded")} value={`${progress.cleared}/${progress.total}`} accent testid="cartridge-mark-count" />
      </div>
    </div>
  );
}

// ── Locale switcher ──────────────────────────────────────────────────────
// A compact EN / zh-Hant toggle, styled to match ViewSwitcher. The option
// labels themselves come from the catalog (not hardcoded here) so the lone
// non-ASCII glyph (the zh-Hant option's own label) stays inside
// i18n/messages.ts per the asset-standard glyph allowlist test, which only
// exempts pixel-ui/themes/brand/dev/i18n.

export function LocaleSwitcher(): JSX.Element {
  const [locale, setLocale] = useLocale();
  const options: Array<{ id: Locale; labelId: "locale.enLabel" | "locale.zhHantLabel" }> = [
    { id: "en", labelId: "locale.enLabel" },
    { id: "zh-Hant", labelId: "locale.zhHantLabel" },
  ];
  return (
    <div data-testid="locale-switcher" style={{ display: "flex", gap: 4, padding: 4, background: "rgba(23,21,15,0.82)", border: "1px solid #4a4238", pointerEvents: "auto" }}>
      {options.map((opt) => {
        const on = opt.id === locale;
        return (
          <button
            key={opt.id}
            onClick={() => setLocale(opt.id)}
            data-testid={`locale-option-${opt.id}`}
            aria-pressed={on}
            style={{ cursor: "pointer", padding: "5px 11px", border: "none", background: on ? "var(--gold)" : "transparent", color: on ? "var(--ink)" : "#a59c8b", fontFamily: "var(--px-font)", fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" }}
          >
            {t(opt.labelId)}
          </button>
        );
      })}
    </div>
  );
}

// ── View switcher ────────────────────────────────────────────────────────

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

// ── Roster ─────────────────────────────────────────────────────────────
// The capacity/commitment surface: with a contract selected, the top of the rail IS
// the answer (recommended party, expanded); everyone else is a compact reference row.
// With nothing selected there is no "who do I send" question, so every row is compact.

export type RosterVariant = "list" | "strip";

type DowntimeFix = Extract<FixSuggestion, { kind: "downtime" }>;

export function RosterRegion(props: {
  roster: RosterMember[];
  party: string[];
  selectable: boolean;
  /** True only when an available contract is selected — the commitment question is live. */
  selectionActive: boolean;
  /** Engine-recommended party for the selected contract (empty when none). */
  recommendedIds: string[];
  /** Live fix plan for the selection; downtime buttons render ONLY from this. */
  fixPlan: FixSuggestion[] | null;
  max: number;
  contract: ContractRequirements | null;
  variant: RosterVariant;
  onToggleAgent: (id: string) => void;
  onApplyFix: (fix: FixSuggestion) => void;
}): JSX.Element {
  const { roster, party, selectable, selectionActive, recommendedIds, fixPlan, max, contract, variant, onToggleAgent, onApplyFix } = props;
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const strip = variant === "strip";

  const byId = new Map(roster.map((m) => [m.id, m] as const));
  const focusSet = new Set<string>(selectionActive ? [...recommendedIds, ...party] : []);
  const focusMembers: RosterMember[] = selectionActive
    ? [
        ...recommendedIds.map((id) => byId.get(id)).filter((m): m is RosterMember => m !== undefined),
        ...roster.filter((m) => party.includes(m.id) && !recommendedIds.includes(m.id)),
      ]
    : [];
  const benchMembers = roster.filter((m) => !focusSet.has(m.id));

  const downtimeFixesFor = (id: string): DowntimeFix[] =>
    (fixPlan ?? []).filter((fix): fix is DowntimeFix => fix.kind === "downtime" && fix.agentId === id);

  const expandedCard = (m: RosterMember): JSX.Element => (
    <RosterCard
      key={m.id}
      m={m}
      inParty={party.includes(m.id)}
      selectable={selectable}
      contract={contract}
      variant={variant}
      onToggleAgent={onToggleAgent}
      downtimeFixes={downtimeFixesFor(m.id)}
      onApplyFix={onApplyFix}
    />
  );

  return (
    <div>
      <div className="pixel-panel__title">
        {selectionActive ? t("shell.rosterPartyOf", { count: party.length, max }) : t("shell.rosterSelectContract", { count: roster.length })}
      </div>
      <div style={strip
        ? { display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", alignItems: "flex-start" }
        : { display: "grid", gap: 6 }
      }>
        {selectionActive && focusMembers.length > 0 && !strip && (
          <div className="pixel-panel__title" style={{ marginBottom: 0 }}>{t("shell.recommendedParty")}</div>
        )}
        {/* §9: in the strip carousel the recommended party has no section label,
            so each focus card carries its own visible accent instead. */}
        {focusMembers.map((m) => strip ? (
          <div
            key={m.id}
            data-testid="strip-recommended-card"
            style={{ flex: "0 0 auto", scrollSnapAlign: "start", position: "relative", outline: "2px solid rgba(63, 174, 159, 0.75)", outlineOffset: 1 }}
          >
            <span style={{ position: "absolute", top: -7, left: 6, zIndex: 2, padding: "1px 5px", fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase", color: "#9fe0d6", background: "#0d1f1c", border: "1px solid rgba(63, 174, 159, 0.6)" }}>
              {t("shell.recommendedChip")}
            </span>
            {expandedCard(m)}
          </div>
        ) : expandedCard(m))}
        {selectionActive && benchMembers.length > 0 && !strip && (
          <div className="pixel-panel__title" style={{ margin: "6px 0 0" }}>{t("shell.bench")}</div>
        )}
        {benchMembers.map((m) => (
          <div key={m.id} style={strip ? { flex: "0 0 auto", width: expandedIds[m.id] ? "min(85vw, 290px)" : 180, scrollSnapAlign: "start" } : undefined}>
            <RosterCompactRow
              m={m}
              contract={contract}
              inParty={party.includes(m.id)}
              open={!!expandedIds[m.id]}
              onToggle={() => setExpandedIds((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
            />
            {expandedIds[m.id] && (
              <RosterCard
                m={m}
                inParty={party.includes(m.id)}
                selectable={selectable}
                contract={contract}
                variant={variant}
                onToggleAgent={onToggleAgent}
                downtimeFixes={downtimeFixesFor(m.id)}
                onApplyFix={onApplyFix}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** One-line collapsed roster row: name, role, the single most contract-relevant
 *  number, assignment/downed markers. Click to expand the full card below it. */
function RosterCompactRow(props: {
  m: RosterMember;
  contract: ContractRequirements | null;
  inParty: boolean;
  open: boolean;
  onToggle: () => void;
}): JSX.Element {
  const { m, contract, inParty, open, onToggle } = props;
  return (
    <button
      type="button"
      data-testid="roster-compact-row"
      onClick={onToggle}
      title={open ? t("shell.collapseName", { name: m.name }) : t("shell.expandName", { name: m.name })}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        width: "100%",
        minHeight: 44,
        padding: "4px 10px",
        background: "var(--cream)",
        border: "1px solid var(--cream-border)",
        borderLeft: inParty ? "3px solid var(--gold-border)" : "1px solid var(--cream-border)",
        fontFamily: "var(--px-font)",
        cursor: "pointer",
        textAlign: "left",
        opacity: m.downed ? 0.55 : 1,
      }}
    >
      <PixelIcon name={roleIcon(m.role)} />
      <strong style={{ fontSize: 11, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</strong>
      {m.downed && <PixelBadge state="failing" style={{ minHeight: 18, padding: "1px 5px", fontSize: 8 }}>{t("status.down")}</PixelBadge>}
      {inParty && <PixelIcon name="selected" label={t("status.assigned")} />}
      <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--ink-muted)", whiteSpace: "nowrap" }}>{topContractStat(m, contract)}</span>
      <span aria-hidden="true" style={{ color: "var(--stone)", fontSize: 10 }}>{open ? "▾" : "▸"}</span>
    </button>
  );
}

function topContractStat(m: RosterMember, contract: ContractRequirements | null): string {
  const attrs = contract?.checkedAttributes ?? [];
  const first = attrs[0];
  if (!first) return m.role;
  let best = first;
  for (const a of attrs) if ((m.attributes[a.id] ?? 0) > (m.attributes[best.id] ?? 0)) best = a;
  return `${best.name} ${m.attributes[best.id] ?? 0}`;
}

function buildAttributes(m: RosterMember, contract: ContractRequirements | null): RosterCardAttribute[] {
  if (!contract || contract.checkedAttributes.length === 0) return [];
  const attrs = contract.checkedAttributes.slice(0, 4);
  let bestId = attrs[0]?.id ?? "";
  for (const a of attrs) if ((m.attributes[a.id] ?? 0) > (m.attributes[bestId] ?? 0)) bestId = a.id;
  return attrs.map((a) => ({
    id: a.id,
    name: a.name,
    value: m.attributes[a.id] ?? 0,
    icon: attrIcon(a.id),
    gearBonus: m.gear.reduce((sum, g) => sum + (g.bonuses[a.id] ?? 0), 0),
    highlighted: a.id === bestId,
  }));
}

function buildGear(m: RosterMember): RosterCardGear[] {
  return m.gear.map((gear) => ({
    id: gear.id,
    name: gear.name,
    icon: itemIcon(gear.name),
    bonusText: Object.entries(gear.bonuses).map(([attr, value]) => `${attrNameLabel(attr)} +${value}`).join(" · "),
  }));
}

function RosterCard(props: {
  m: RosterMember;
  inParty: boolean;
  selectable: boolean;
  contract: ContractRequirements | null;
  variant: RosterVariant;
  onToggleAgent: (id: string) => void;
  /** Downtime actions the selected contract's fix plan names for THIS agent.
   *  Empty = no downtime buttons. The roster never invents its own actions. */
  downtimeFixes: DowntimeFix[];
  onApplyFix: (fix: FixSuggestion) => void;
}): JSX.Element {
  const { m, inParty, selectable, contract, variant, onToggleAgent, downtimeFixes, onApplyFix } = props;
  const strip = variant === "strip";
  return (
    <PixelRosterCard
      name={m.name}
      role={m.role}
      inParty={inParty}
      downed={m.downed}
      affliction={m.affliction}
      attributes={buildAttributes(m, contract)}
      gear={buildGear(m)}
      stress={m.stress}
      morale={m.morale}
      selectable={selectable}
      onToggle={() => onToggleAgent(m.id)}
      style={strip ? { flex: "0 0 auto", width: "min(85vw, 290px)", scrollSnapAlign: "start" } : undefined}
    >
      {downtimeFixes.length > 0 ? (
        <div style={{ display: "grid", gap: 4 }}>
          {downtimeFixes.map((fix) => (
            <DowntimeFixButton key={fix.action} fix={fix} onClick={() => onApplyFix(fix)} />
          ))}
        </div>
      ) : undefined}
    </PixelRosterCard>
  );
}

// Downtime actions reuse the closest existing status/attribute icons — the
// icon set is closed (docs/design's redesign spec), so "rest" borrows the
// reliable/calm mark, "train" borrows the Power attribute icon, and "rally"
// borrows the Spirit (morale) attribute icon.
const DOWNTIME_ICON: Record<DowntimeFix["action"], PixelIconName> = {
  rest: "reliable",
  train: "power",
  rally: "spirit",
};

/** A downtime action sourced from the live fix plan — shows what the action does to
 *  the failing/thin check, not just its generic stress/morale deltas. Icon + a short
 *  catalog label keep this legible in the compact roster row at mobile widths, where
 *  the old text-only button crammed the label and delta onto one line. */
function DowntimeFixButton(props: { fix: DowntimeFix; onClick: () => void }): JSX.Element {
  const { fix, onClick } = props;
  const def = DOWNTIME_ACTIONS[fix.action];
  const label = downtimeActionLabel(fix.action);
  const delta = fix.beforeScore !== undefined && fix.afterScore !== undefined
    ? `${scoreText(fix.beforeScore)} → ${scoreText(fix.afterScore)}`
    : `${fmt(def.stressDelta)} / ${fmt(def.moraleDelta)}`;
  return (
    <PixelButton
      type="button"
      variant="secondary"
      data-testid="roster-downtime-fix"
      onClick={onClick}
      title={fix.reason}
      style={{ padding: "6px 8px", minHeight: 44, fontSize: 10, lineHeight: 1.3, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", whiteSpace: "normal", textAlign: "left" }}
    >
      <span style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 5, flex: "0 1 auto", minWidth: 0 }}>
        <PixelIcon name={DOWNTIME_ICON[fix.action]} /> {label}
      </span>
      <span style={{ color: "var(--teal-dark)", flex: "none", whiteSpace: "nowrap" }}>{delta}</span>
    </PixelButton>
  );
}

// ── Contract + Readiness ───────────────────────────────────────────────────────────

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
  compact?: boolean;
  /** Authored difficulty modes; the picker renders only when non-empty. */
  difficultyModes?: Array<{ id: string; name: string }>;
  difficultyModeId?: string | null;
  onSelectDifficultyMode?: (id: string | null) => void;
}): JSX.Element {
  const { selected, party, min, max, canRun, onRun, contract, readiness, recommendation, fixPlan, onApplyFix, compact, difficultyModes, difficultyModeId, onSelectDifficultyMode } = props;

  // Locked contracts show only unlock requirements — no party count, no readiness math,
  // no fix plan. Party assignment is irrelevant until the node unlocks.
  if (selected.status === "locked") {
    return (
      <PixelPanel style={{ padding: "12px 14px" }}>
        <PixelBadge state="locked" style={{ marginBottom: 8, display: "inline-flex" }}>{t("status.locked")}</PixelBadge>
        <div data-testid="selected-contract-title" style={{ fontFamily: "var(--px-font)", fontSize: compact ? 22 : 18, fontWeight: 800, color: "var(--ink)", marginBottom: 4 }}>
          {selected.title}
        </div>
        <div style={{ color: "var(--ink-muted)", fontSize: compact ? 14 : 12, marginBottom: 12, lineHeight: 1.4 }}>{selected.description}</div>
        {selected.requirements.length > 0 && (
          <div data-testid="unlock-requirements">
            <div className="pixel-panel__title">{t("shell.unlockRequirement")}</div>
            <ul style={{ margin: 0, padding: "0 0 0 14px", fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.6, fontFamily: "var(--px-font)" }}>
              {selected.requirements.map((req, i) => <li key={i}>{req}</li>)}
            </ul>
          </div>
        )}
        <PixelButton disabled variant="disabled" style={{ width: "100%", marginTop: 14, minHeight: 44, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          <PixelIcon name="locked" /> <span>{t("status.locked")}</span>
        </PixelButton>
      </PixelPanel>
    );
  }

  const showReadiness = selected.status === "available" && contract;
  const contractStateBadge: "available" | "recorded" = selected.status === "cleared" ? "recorded" : "available";
  const contractStateLabel = selected.status === "cleared" ? t("status.cleared") : t("status.available");

  return (
    <PixelPanel style={{ padding: "12px 14px" }}>
      <PixelBadge state={contractStateBadge} style={{ marginBottom: 8, display: "inline-flex" }}>
        {contractStateLabel}
      </PixelBadge>
      <div data-testid="selected-contract-title" style={{ fontFamily: "var(--px-font)", fontSize: compact ? 22 : 18, fontWeight: 800, letterSpacing: "0.02em", color: "var(--ink)", marginBottom: 4 }}>
        {selected.title}
      </div>
      <div style={{ color: "var(--ink-muted)", fontSize: compact ? 14 : 12, marginBottom: 10, lineHeight: 1.4 }}>{selected.description}</div>

      {selected.status === "cleared" && (
        <div style={{ marginBottom: 8, fontSize: 11, color: "var(--teal-dark)", fontFamily: "var(--px-font)" }}>
          {t("shell.recordedOutcomeNote")}
        </div>
      )}

      <div data-testid="party-count" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: party.length >= min && party.length <= max ? "var(--teal-dark)" : "var(--gold-dark)", marginBottom: 8, fontFamily: "var(--px-font)" }}>
        {t("shell.partyCount", { count: party.length, min, max })}
      </div>

      {showReadiness && <ReadinessPanel contract={contract} readiness={readiness} />}
      {showReadiness && readiness && readiness.projectedOutcome !== "success" && fixPlan && fixPlan.length > 0 && (
        <FixPlanPanel fixes={fixPlan} onApplyFix={onApplyFix} compact={compact} />
      )}

      {difficultyModes && difficultyModes.length > 0 && onSelectDifficultyMode && (
        <div data-testid="difficulty-mode-picker" style={{ marginTop: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "var(--px-font)", fontSize: 10, color: "var(--stone)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {t("shell.difficultyMode")}
          </span>
          <PixelButton
            variant={difficultyModeId == null ? "confirm" : "secondary"}
            data-testid="difficulty-mode-base"
            onClick={() => onSelectDifficultyMode(null)}
            style={{ fontSize: 10, padding: "4px 8px" }}
          >
            {t("shell.difficultyBase")}
          </PixelButton>
          {difficultyModes.map((mode) => (
            <PixelButton
              key={mode.id}
              variant={difficultyModeId === mode.id ? "confirm" : "secondary"}
              data-testid={`difficulty-mode-${mode.id}`}
              onClick={() => onSelectDifficultyMode(mode.id)}
              style={{ fontSize: 10, padding: "4px 8px" }}
            >
              {mode.name}
            </PixelButton>
          ))}
        </div>
      )}

      <RunButton selected={selected} min={min} max={max} canRun={canRun} readiness={readiness} onRun={onRun} />

      {showReadiness && recommendation && (
        <div style={{ marginTop: 8, fontSize: 10, lineHeight: 1.4, color: "var(--stone)", fontStyle: "italic", fontFamily: "var(--px-font)" }}>{recommendation}</div>
      )}
    </PixelPanel>
  );
}

// One icon per run-button state, so the label can stay short without losing
// meaning — the icon carries reliable/risky/failing/locked/recorded state,
// the label carries the verb. Fixes the "jammed text" complaint: a single
// long uppercase phrase (e.g. "RUN WITH RISK") no longer has to fit alone.
function runButtonIcon(selected: WorldNode, countOk: boolean, riskRun: boolean, thinRun: boolean): PixelIconName {
  if (selected.status === "locked") return "locked";
  if (selected.status === "cleared") return "recorded";
  if (!countOk) return "available";
  if (riskRun) return "failing";
  if (thinRun) return "risky";
  return "reliable";
}

function RunButton(props: { selected: WorldNode; min: number; max: number; canRun: boolean; readiness: PartyReadiness | null; onRun: () => void }): JSX.Element {
  const { selected, min, max, canRun, readiness, onRun } = props;
  const outcome = readiness?.projectedOutcome ?? "none";
  const countOk = readiness?.countOk ?? canRun;
  const riskRun = canRun && outcome === "failure";
  const thinRun = canRun && outcome === "partial";
  const disabled = !canRun;
  const label = selected.status === "locked"
    ? t("status.locked")
    : selected.status === "cleared"
    ? t("status.cleared")
    : !countOk
    ? t("shell.assignRange", { min, max })
    : riskRun
    ? t("shell.riskRun")
    : thinRun
    ? t("shell.runWithRisk")
    : t("shell.runContract");
  const variant = disabled ? "disabled" : riskRun ? "danger" : thinRun ? "primary" : "confirm";
  const icon = runButtonIcon(selected, countOk, riskRun, thinRun);
  return (
    <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
      <PixelButton
        onClick={onRun}
        disabled={disabled}
        data-testid="run-contract-button"
        variant={variant}
        style={{ minWidth: "100%", minHeight: 46, fontSize: 13, lineHeight: 1.25, padding: "8px 14px", whiteSpace: "normal", wordBreak: "keep-all", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, textAlign: "center" }}
      >
        <PixelIcon name={icon} /> <span>{label}</span>
      </PixelButton>
      {riskRun && <div style={{ color: "var(--danger)", fontSize: 11, fontFamily: "var(--px-font)" }}>{t("shell.riskWarning")}</div>}
      {thinRun && <div style={{ color: "var(--gold-dark)", fontSize: 11, fontFamily: "var(--px-font)" }}>{t("shell.thinWarning")}</div>}
    </div>
  );
}

function FixPlanPanel(props: { fixes: FixSuggestion[]; onApplyFix: (fix: FixSuggestion) => void; compact?: boolean }): JSX.Element {
  const { fixes, onApplyFix, compact } = props;
  const primary = compact ? fixes.slice(0, 2) : fixes;
  const extra = compact ? fixes.slice(2) : [];

  function renderFix(fix: FixSuggestion, i: number): JSX.Element {
    if (fix.kind === "add-agent") return <FixButton key={i} label={`${t("shell.addAgent", { name: fix.agentName })}`} fix={fix} onClick={() => onApplyFix(fix)} />;
    if (fix.kind === "swap-agent") return <FixButton key={i} label={`${t("shell.swapInAgent", { name: fix.addAgentName })}`} fix={fix} onClick={() => onApplyFix(fix)} />;
    if (fix.kind === "downtime") {
      return <FixButton key={i} label={`${downtimeActionLabel(fix.action)} ${fix.agentName}`} fix={fix} onClick={() => onApplyFix(fix)} />;
    }
    return (
      <div key={i} style={{ padding: "8px 10px", border: "1px solid var(--cream-border)", fontFamily: "var(--px-font)", color: "var(--ink-muted)", fontSize: 11 }}>
        {fix.reason}
      </div>
    );
  }

  return (
    <div data-testid="fix-plan" style={{ marginTop: 10, borderTop: "1px solid var(--cream-border)", paddingTop: 10 }}>
      <div className="pixel-panel__title" style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <PixelIcon name="risky" /> {t("shell.fixThisContract")}
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {primary.map((fix, i) => renderFix(fix, i))}
      </div>
      {extra.length > 0 && (
        <details style={{ marginTop: 6 }}>
          <summary style={{ cursor: "pointer", fontSize: 10, color: "var(--stone)", fontFamily: "var(--px-font)", padding: "4px 0", userSelect: "none" }}>
            {t("shell.moreOptions", { count: extra.length })}
          </summary>
          <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
            {extra.map((fix, i) => renderFix(fix, primary.length + i))}
          </div>
        </details>
      )}
    </div>
  );
}

function FixButton(props: { label: string; fix: FixSuggestion; onClick: () => void }): JSX.Element {
  const { fix } = props;
  const afterStatus = fix.kind !== "risk" ? fix.afterStatus : undefined;
  const delta = fix.kind !== "risk" && fix.beforeScore !== undefined && fix.afterScore !== undefined
    ? `${scoreText(fix.beforeScore)} → ${scoreText(fix.afterScore)}${afterStatus === "ready" ? ` ${t("status.reliable")}` : afterStatus === "thin" ? ` ${t("status.risky")}` : afterStatus === "short" ? ` ${t("status.failing")}` : ""}`
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

const OUTCOME_STATE: Record<ProjectedOutcome, "reliable" | "risky" | "failing" | "recorded"> = { success: "reliable", partial: "risky", failure: "failing", none: "recorded" };
const OUTCOME_LABEL_ID: Record<ProjectedOutcome, "shell.projectedReliable" | "shell.projectedRisky" | "shell.projectedFail" | "shell.assignParty"> = {
  success: "shell.projectedReliable",
  partial: "shell.projectedRisky",
  failure: "shell.projectedFail",
  none: "shell.assignParty",
};

function ReadinessPanel(props: { contract: ContractRequirements; readiness: PartyReadiness | null }): JSX.Element {
  const { contract, readiness } = props;
  const outcome: ProjectedOutcome = readiness?.projectedOutcome ?? "none";
  return (
    <div style={{ borderTop: "1px solid var(--cream-border)", margin: "0 0 10px", paddingTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
        <PixelBadge data-testid="readiness-status" state={OUTCOME_STATE[outcome]} icon={<PixelIcon name={OUTCOME_STATE[outcome]} />}>
          {t(OUTCOME_LABEL_ID[outcome])}
        </PixelBadge>
      </div>

      {(contract.roles.length > 0 || contract.timePressure) && (
        <div style={{ display: "grid", gap: 4, marginBottom: 10, fontSize: 11, color: "var(--ink-muted)", fontFamily: "var(--px-font)" }}>
          {contract.roles.length > 0 && (
            <div>
              <strong style={{ color: "var(--coffee)" }}>{t("shell.roles")}</strong>{" "}
              {contract.roles.map((r) => `${r.count} ${r.roleName}`).join(", ")}
            </div>
          )}
          {contract.timePressure && (
            <div>
              <strong style={{ color: "var(--coffee)" }}>{t("shell.time")}</strong>{" "}
              {contract.timePressure.attributeName} ≥ {contract.timePressure.aggregateThreshold} over {contract.timePressure.rounds} rounds
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gap: 6 }}>
        {(readiness?.checks ?? []).map((c) => {
          const req = contract.checks.find((cc) => cc.id === c.id);
          const attrs = req?.attributes ?? [];
          const scope = c.scope === "team_aggregate" ? t("shell.scopeTeam") : c.scope === "role_specific" ? (c.roleNames.join("+") || t("shell.scopeRole")) : t("shell.scopePerAgent");
          const topContrib = [...c.contributors]
            .filter((x) => x.inScope)
            .sort((a, b) => b.total - a.total)
            .slice(0, 2)
            .map((x) => `${x.agentName} ${scoreText(x.total)}`);

          // Threshold explanation for authored perAssignedAgent scaling
          const partySize = c.thresholdMode === "perAssignedAgent" && c.baseThreshold > 0
            ? Math.round(c.threshold / c.baseThreshold)
            : null;
          const primaryAttr = attrs[0];
          const thresholdCopy = partySize !== null && primaryAttr
            ? `${c.baseThreshold} ${primaryAttr.name} per agent · ${partySize} assigned → target ${Math.round(c.threshold)}`
            : null;

          return (
            <PixelReadinessRow
              key={c.id}
              name={c.name}
              status={c.status as ReadinessStatus}
              projected={c.projected}
              threshold={c.threshold}
              margin={c.margin}
              shortBy={c.shortBy}
              attributeNames={attrs.map((a) => a.name)}
              scope={scope}
              topContributors={topContrib}
              thresholdCopy={thresholdCopy}
            />
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


// ── Loot / Equip ─────────────────────────────────────────────────────────────

export function LootRegion(props: { loot: PendingLootChoice[]; onClaimLoot: (choiceId: string, agentId: string) => void }): JSX.Element | null {
  if (props.loot.length === 0) return null;
  return (
    <div data-testid="loot-region" style={{ display: "grid", gap: 8 }}>
      <div className="pixel-panel__title" style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <PixelIcon name="lootAvailable" /> {t("shell.lootEquip")}
      </div>
      {props.loot.map((choice) => {
        const bonus = Object.entries(choice.bonuses).map(([attr, value]) => `${attrNameLabel(attr)} +${value}`).join(" · ");
        const preferred = choice.eligibleAgents[0];
        return (
          <PixelLootCard
            key={choice.id}
            itemName={choice.itemName}
            icon={itemIcon(choice.itemName)}
            slot={choice.slot}
            bonusText={bonus}
            flavorText={choice.flavorText}
          >
            {choice.eligibleAgents.slice(0, 3).map((agent) => (
              <PixelButton key={agent.id} variant={agent.id === preferred?.id ? "confirm" : "secondary"} onClick={() => props.onClaimLoot(choice.id, agent.id)} style={{ minHeight: 36, fontSize: 10, padding: "5px 10px", display: "flex", alignItems: "center", gap: 4 }}>
                <PixelIcon name="lootAvailable" /> {t("shell.equipArrow", { name: agent.name })}
              </PixelButton>
            ))}
          </PixelLootCard>
        );
      })}
    </div>
  );
}

// ── Report · Coach · Dispatches · Complete ──────────────────────────────────────────────────

export function ReportRegion(props: { lastReport: PlayReportView }): JSX.Element {
  const { lastReport } = props;
  const outcomeState: Record<string, "reliable" | "risky" | "failing"> = {
    success: "reliable", partial: "risky", failure: "failing",
  };
  const outcomeLabelId: Record<string, "shell.outcomeSuccess" | "shell.outcomePartial" | "shell.outcomeFailed"> = {
    success: "shell.outcomeSuccess", partial: "shell.outcomePartial", failure: "shell.outcomeFailed",
  };
  const labelId = outcomeLabelId[lastReport.outcome];
  return (
    <PixelPanel data-testid="outcome-region" style={{ padding: "12px 14px" }}>
      <div className="pixel-panel__title">{t("shell.contractOutcome")}</div>
      <div style={{ marginBottom: 8 }}>
        <PixelBadge state={outcomeState[lastReport.outcome] ?? "recorded"}>
          {labelId ? t(labelId) : lastReport.outcome}
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
      <div className="pixel-panel__title">{t("shell.engineLoop")}</div>
      <div style={{ color: "var(--ink-soft)", fontSize: 12, fontFamily: "var(--px-font)" }}>{props.message}</div>
    </div>
  );
}

export function DispatchRegion(props: { dispatches: DramaCard[]; limit: number }): JSX.Element {
  return (
    <div>
      <div className="pixel-panel__title">{t("shell.dispatches")}</div>
      {props.dispatches.slice(0, props.limit).map((d) => (
        <div key={d.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--cream-border)" }}>
          <div style={{ fontFamily: "var(--px-font)", fontSize: 12, lineHeight: 1.45, color: "var(--ink-soft)" }}>{d.narrativeText}</div>
        </div>
      ))}
    </div>
  );
}

export function CompleteBanner(props: { arcName: string }): JSX.Element {
  return (
    <PixelPanel style={{ padding: "16px 20px", textAlign: "center" }}>
      <PixelBadge state="reliable" style={{ marginBottom: 8, display: "inline-flex" }}>{t("shell.complete", { name: props.arcName })}</PixelBadge>
      <div style={{ fontFamily: "var(--px-font)", fontSize: 16, fontWeight: 800, color: "var(--teal-dark)" }}>
        {t("shell.everyContractCleared")}
      </div>
    </PixelPanel>
  );
}

// ── Small shared bits ─────────────────────────────────────────────────────

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
