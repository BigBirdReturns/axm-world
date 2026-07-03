// The player shell: ONE runtime shell across breakpoints. It owns every engine region
// (status, view switcher, active representation, roster/assignment, selected contract +
// readiness, outcome/report, coach) and the chrome (cartridge object, decisions). The
// active representation mounts inside the one representation region; switching it never
// disturbs run state, selection, party, readiness, or marks.
//
// Desktop and mobile use the SAME region components; only the arrangement differs:
//   desktop → status/switcher top bar + roster left rail + contract/coach right rail,
//             all in document flow, representation center.
//   mobile  → same top bar + a bottom flex dock that stacks the same regions by flow.

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useEncounterDirector } from "../encounter/EncounterDirector.js";
import { cartridgePaletteScope } from "../themes/select.js";
import "../themes/karazhan/karazhan.css";
import { getPresentations, type Representation } from "../presentations.js";
import { loadCostume, saveCostume, isCostumeId } from "../presentation-prefs.js";
import { useIsMobile } from "../use-viewport.js";
import { getEngineCoachMessage } from "./coach.js";
import {
  StatusRegion,
  ViewSwitcher,
  LocaleSwitcher,
  RosterRegion,
  ContractRegion,
  ReportRegion,
  LootRegion,
  CoachRegion,
  DispatchRegion,
  CompleteBanner,
  panel,
} from "./regions.js";
import { PixelButton, PixelIcon } from "../pixel-ui/index.js";
import { DecisionPanel } from "../components/DecisionPanel.js";
import { CartridgeObjectPanel } from "../components/CartridgeObjectPanel.js";
import { t, useLocale } from "../i18n/index.js";
import type { ArcInteraction } from "../useArcInteraction.js";
import type { ArcWorld } from "../useArcWorld.js";

export interface ShellProps {
  world: ArcWorld;
  interaction: ArcInteraction;
  onExit: () => void;
}

/** A panel-styled card used in both rails and the mobile dock. */
function Card(props: { children: ReactNode; style?: CSSProperties }): JSX.Element {
  return <div style={{ ...panel, ...props.style }}>{props.children}</div>;
}

/** The view-context strip: a fixed, normal-flow shell slot for the view purpose,
 *  marker legend, and controls hint. Nothing in it is positioned over the play surface. */
function ViewContextStrip(props: { rep: Representation; showPurpose: boolean; onDismiss: () => void }): JSX.Element {
  const { rep, showPurpose, onDismiss } = props;
  return (
    <div
      data-testid="onboarding-strip"
      style={{ flex: "none", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 14px", padding: "7px 12px", borderBottom: "1px solid #2a2620", background: "rgba(18,15,11,0.95)", font: "11px/1.5 'IBM Plex Mono', ui-monospace, monospace", color: "#c9bfae" }}
    >
      {showPurpose ? (
        <span data-testid="view-purpose" style={{ display: "flex", gap: 8, alignItems: "baseline", minWidth: 0 }}>
          <strong style={{ color: "#c9a14a", whiteSpace: "nowrap" }}>{rep.label}.</strong>
          <span>{rep.purpose}</span>
          <button onClick={onDismiss} aria-label={t("shell.dismissViewNote")} style={{ flex: "none", background: "transparent", border: "none", color: "#a59c8b", cursor: "pointer", font: "14px monospace", lineHeight: 1 }}>×</button>
        </span>
      ) : (
        <strong style={{ color: "#8b7d6a" }}>{rep.label}</strong>
      )}
      <span style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", gap: "2px 12px", alignItems: "center", color: "#6b6050", whiteSpace: "nowrap" }}>
        {rep.legend.map((e) => (
          <span key={e.label} data-testid="view-legend" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
            <span style={{ color: e.color }}>{e.glyph}</span>
            {e.label}
          </span>
        ))}
        <span>{rep.controlsHint}</span>
      </span>
    </div>
  );
}

function attrNameLabel(id: string): string {
  return id.slice(0, 1).toUpperCase() + id.slice(1);
}

function EquipFlash(props: { event: NonNullable<ArcWorld["lastEquip"]> }): JSX.Element {
  const bonus = Object.entries(props.event.bonuses).map(([attr, value]) => `${attrNameLabel(attr)} +${value}`).join(" · ");
  return (
    <div
      data-testid="equip-flash"
      style={{ marginBottom: 10, padding: "8px 10px", border: "1px solid rgba(116,173,119,0.65)", background: "rgba(116,173,119,0.12)", color: "#d8cfbd", font: "11px/1.45 'IBM Plex Mono', ui-monospace, monospace" }}
    >
      <strong style={{ color: "#74ad77" }}>{t("shell.equipped")}</strong> {props.event.itemName} → {props.event.agentName}
      {bonus && <span style={{ display: "block", marginTop: 3, color: "#a59c8b" }}>{bonus}. {t("shell.readinessRecalculated")}</span>}
    </div>
  );
}

function RecordModal(props: { lastReport: NonNullable<ArcWorld["lastReport"]>; onClose: () => void }): JSX.Element {
  return (
    <div
      data-testid="record-history-modal"
      onClick={props.onClose}
      style={{ position: "fixed", inset: 0, zIndex: 850, display: "grid", placeItems: "center", padding: 20, background: "rgba(11,10,8,0.62)" }}
    >
      <Card style={{ width: "min(440px, 94vw)", padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <strong style={{ color: "#c9a14a", font: "800 12px 'IBM Plex Mono', ui-monospace, monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("shell.recordedOutcomeTitle")}</strong>
          <button onClick={props.onClose} aria-label={t("shell.closeRecordedOutcome")} style={{ background: "transparent", border: "1px solid #4a4238", color: "#a59c8b", cursor: "pointer", font: "12px monospace" }}>×</button>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <ReportRegion lastReport={props.lastReport} />
        </div>
      </Card>
    </div>
  );
}

export function Shell({ world, interaction: ix, onExit }: ShellProps): JSX.Element {
  const { interceptedRun, overlay: encounterOverlay } = useEncounterDirector(ix, world);
  const isMobile = useIsMobile();
  const [locale] = useLocale();
  const [costumeId, setCostumeId] = useState<string>(() => loadCostume(world.cartridge.arc));
  const [showCartridge, setShowCartridge] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [dismissedPurpose, setDismissedPurpose] = useState<Record<string, boolean>>({});

  // Scope the active cartridge's palette skin to <html> while this cartridge is
  // mounted. Cleared on unmount / cartridge switch so no arc keeps another's
  // clothes. Unknown/imported arcs resolve to null → no scope → neutral skin.
  useEffect(() => {
    const scope = cartridgePaletteScope(world.cartridge.arc);
    const root = document.documentElement;
    if (scope) root.setAttribute("data-cartridge", scope);
    else root.removeAttribute("data-cartridge");
    return () => root.removeAttribute("data-cartridge");
  }, [world.cartridge.arc]);

  const choose = (id: string) => {
    setCostumeId(id);
    if (isCostumeId(id)) saveCostume(world.cartridge.arc, id);
  };
  // Re-derived whenever locale changes so representation labels/blurbs/hints re-translate.
  const presentations = useMemo(() => getPresentations(), [locale]);
  const active = useMemo(() => presentations.find((p) => p.id === costumeId) ?? presentations[0]!, [presentations, costumeId]);
  const modalOpen = world.pendingDecision !== null;
  const showPurpose = !dismissedPurpose[active.id] && !modalOpen;
  const dismissPurpose = () => setDismissedPurpose((p) => ({ ...p, [active.id]: true }));

  const PresentationScene = active.Scene;
  const stage = (
    <div data-testid="representation-region" style={{ position: "absolute", inset: 0 }}>
      <PresentationScene world={world} interaction={ix} modalOpen={modalOpen} active />
    </div>
  );
  const contextStrip = <ViewContextStrip rep={active} showPurpose={showPurpose} onDismiss={dismissPurpose} />;

  const min = ix.req?.minAgents ?? 0;
  const max = ix.req?.maxAgents ?? 0;
  const coach = getEngineCoachMessage({
    pendingDecision: world.pendingDecision !== null,
    selected: ix.selected,
    partyCount: ix.party.length,
    min,
    canRun: ix.canRun,
    lastReport: world.lastReport,
    arcComplete: world.arcComplete,
  });

  const status = (
    <StatusRegion title={world.arc.meta.name} cycle={world.cycle} resources={world.resources} progress={{ cleared: world.clearedCount, total: world.totalNodes }} />
  );
  const switcher = (
    <ViewSwitcher costumes={presentations.map((p) => ({ id: p.id, label: p.label, blurb: p.blurb }))} activeId={active.id} onChoose={choose} disabled={modalOpen} />
  );
  // Chrome buttons: icon + short catalog label instead of a raw glyph (▤ / ◧) glued to
  // English text, which crammed illegibly at narrow widths and doubled as an ad-hoc
  // "icon" the asset-standard glyph allowlist otherwise has to special-case. Height
  // matches PixelButton's 44px minimum so the top bar stays visually consistent.
  const recordButton = world.lastReport ? (
    <PixelButton
      type="button"
      variant="secondary"
      data-testid="record-history-button"
      onClick={() => setShowHistory(true)}
      style={{ pointerEvents: "auto", minHeight: 40, padding: "6px 10px", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
    >
      <PixelIcon name="recorded" /> {!isMobile && <span>{t("shell.recordButton")}</span>}
    </PixelButton>
  ) : null;
  const cartridgeButton = (
    <PixelButton
      type="button"
      variant="secondary"
      data-testid="cartridge-object-button"
      onClick={() => setShowCartridge(true)}
      style={{ pointerEvents: "auto", minHeight: 40, padding: "6px 10px", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
    >
      <PixelIcon name="selected" /> {!isMobile && <span>{t("shell.cartridgeButton")}</span>}
    </PixelButton>
  );
  const localeSwitcher = <LocaleSwitcher />;

  const selectionActive = ix.selected?.status === "available";
  const recommendedIds = useMemo(
    () => (selectionActive && ix.selectedId ? world.recommendedParty(ix.selectedId) : []),
    [selectionActive, ix.selectedId, world],
  );
  const roster = (
    <RosterRegion
      roster={world.roster}
      party={ix.party}
      selectable={selectionActive}
      selectionActive={selectionActive}
      recommendedIds={recommendedIds}
      fixPlan={ix.fixPlan}
      max={max}
      contract={ix.contract}
      variant={isMobile ? "strip" : "list"}
      onToggleAgent={ix.toggleAgent}
      onApplyFix={ix.applyFix}
    />
  );
  const contract = ix.selected ? (
    <div data-testid="contract-detail-stack">
      {world.lastEquip && <EquipFlash event={world.lastEquip} />}
      <ContractRegion selected={ix.selected} party={ix.party} min={min} max={max} canRun={ix.canRun} onRun={interceptedRun} contract={ix.contract} readiness={ix.readiness} recommendation={ix.recommendation} fixPlan={ix.fixPlan} onApplyFix={ix.applyFix} compact={isMobile} difficultyModes={world.difficultyModes} difficultyModeId={world.difficultyModeId} onSelectDifficultyMode={world.setDifficultyModeId} />
    </div>
  ) : null;
  const loot = (
    <div data-testid="loot-reward-moment" style={{ display: "grid", gap: 8 }}>
      <div style={{ padding: "8px 10px", border: "1px solid rgba(201,161,74,0.6)", background: "rgba(201,161,74,0.1)", color: "#d8cfbd", font: "11px/1.45 'IBM Plex Mono', ui-monospace, monospace" }}>
        <strong style={{ color: "#c9a14a" }}>{t("shell.rewardMomentTitle")}</strong> {t("shell.rewardMomentBody")}
      </div>
      <LootRegion loot={world.pendingLoot} onClaimLoot={world.claimLoot} />
    </div>
  );

  return (
    <div data-testid="engine-shell" data-modal-open={modalOpen ? "true" : "false"} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "#0b0a08", overflow: "hidden", isolation: "isolate", fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
      <div
        style={{
          flex: "none",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          padding: "calc(env(safe-area-inset-top, 0px) + 8px) 12px 8px",
          borderBottom: "1px solid #2a2620",
          background: "rgba(15,13,9,0.92)",
        }}
      >
        <div style={{ flex: isMobile ? "1 1 100%" : "1 1 auto", minWidth: 0, order: isMobile ? 2 : 0 }}>{status}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, order: 1, marginLeft: isMobile ? "auto" : 0 }}>
          {switcher}
          {localeSwitcher}
          {recordButton}
          {cartridgeButton}
        </div>
      </div>

      {isMobile ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto" }}>
          {contextStrip}
          <div style={{ height: "clamp(150px, 24dvh, 230px)", flex: "none", position: "relative" }}>
            {stage}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 12px", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
            {world.arcComplete && <CompleteBanner arcName={world.arc.meta.name} />}
            {world.pendingLoot.length > 0 ? loot : contract}
            {!ix.selected && world.pendingLoot.length === 0 && (
              <>
                {coach && <Card style={{ borderColor: "#6b5935", background: "rgba(32,28,20,0.92)" }}><CoachRegion message={coach} /></Card>}
                {world.dispatches.length > 0 && <Card style={{ padding: "8px 12px" }}><DispatchRegion dispatches={world.dispatches} limit={1} /></Card>}
              </>
            )}
            {roster}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <aside style={{ width: 320, flex: "none", overflowY: "auto", padding: 12, borderRight: "1px solid #2a2620", background: "rgba(15,13,9,0.6)" }}>
            <Card>{roster}</Card>
          </aside>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            {contextStrip}
            <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
              {stage}
              {world.arcComplete && (
                <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)" }}>
                  <Card style={{ borderColor: "#74ad77" }}><CompleteBanner arcName={world.arc.meta.name} /></Card>
                </div>
              )}
            </div>
          </div>

          {/* right rail — one occupant at a time: claiming (loot) beats choosing
              (contract detail) beats idle (coach/dispatches). The choosing phase never
              shares its scroll column with outcome or loot; outcome lives in the
              record-history modal, not this rail. */}
          <aside style={{ width: 360, flex: "none", overflowY: "auto", padding: 12, borderLeft: "1px solid #2a2620", background: "rgba(15,13,9,0.6)" }}>
            {world.pendingLoot.length > 0 ? (
              <Card>{loot}</Card>
            ) : contract ? (
              <Card>{contract}</Card>
            ) : (
              <>
                {coach && <Card style={{ marginBottom: 10, borderColor: "#6b5935", background: "rgba(32,28,20,0.9)" }}><CoachRegion message={coach} /></Card>}
                {world.dispatches.length > 0 && <Card><DispatchRegion dispatches={world.dispatches} limit={4} /></Card>}
              </>
            )}
          </aside>
        </div>
      )}

      {world.pendingDecision && (
        <DecisionPanel key={world.pendingDecision.id} card={world.pendingDecision} onResolve={world.resolveDecision} targetName={world.effectTargetName} />
      )}
      {showCartridge && (
        <CartridgeObjectPanel
          manifest={world.cartridge.manifest}
          openingChoice={world.openingChoice}
          cycle={world.cycle}
          clearedCount={world.clearedCount}
          totalNodes={world.totalNodes}
          onExport={world.buildExport}
          onClose={() => setShowCartridge(false)}
          onLeave={onExit}
        />
      )}
      {showHistory && world.lastReport && <RecordModal lastReport={world.lastReport} onClose={() => setShowHistory(false)} />}
      {encounterOverlay}
    </div>
  );
}
