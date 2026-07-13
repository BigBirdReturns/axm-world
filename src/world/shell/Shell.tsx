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

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useEncounterDirector } from "../encounter/EncounterDirector.js";
import { EncounterShell } from "../encounter/EncounterShell.js";
import { cartridgePaletteScope, themeForArc } from "../themes/select.js";
import "../themes/karazhan/karazhan.css";
import "../themes/first-charter/first-charter.css";
import { getPresentations, type Representation } from "../presentations.js";
import { deriveNodeMarkers } from "../worldmap/derive.js";
import { deriveHallView } from "../inhabited/hall.js";
import { hallSteward } from "../inhabited/people.js";
import { CartridgePortrait } from "../themes/CartridgeMotif.js";
import { loadCostume, saveCostume, isCostumeId } from "../presentation-prefs.js";
import { useIsMobile } from "../use-viewport.js";
import { getEngineCoachMessage } from "./coach.js";
import {
  StatusRegion,
  ViewSwitcher,
  LocaleSwitcher,
  RosterRegion,
  ContractRegion,
  ContractActions,
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
import { ProgramIdentityStrip } from "./ProgramIdentityStrip.js";
import { MobileMissionStage } from "../components/MobileMissionStage.js";
import { t, useLocale } from "../i18n/index.js";
import { isWorldInteractionUnlocked } from "../proximity.js";
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

function RecordModal(props: { record: NonNullable<ArcWorld["lastRecord"]>; onClose: () => void }): JSX.Element {
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
          <ReportRegion record={props.record} />
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
  // Mobile staged turn flow: one panel at a time. Selecting a contract advances
  // Board -> Contract; Party is entered explicitly from the contract sheet;
  // clearing the selection returns to Board. Desktop ignores this entirely.
  const [mobileStep, setMobileStep] = useState<"board" | "contract" | "party">("board");
  // The playable-encounter surface: the same selected contract, entered as a
  // spatial encounter compiled from its record. Distinct from the RUN CONTRACT
  // auto-resolve (interceptedRun) — this is the "walk into it" path.
  const [encounterOpen, setEncounterOpen] = useState(false);
  // Party to seed the encounter with. null = use the board-assembled party
  // (ix.party) for the currently selected contract. Non-null = an explicit party
  // for an encounter entered via onEnterEncounter (hall/map), where ix.party would
  // otherwise be one render stale for a just-changed selection.
  const [encounterParty, setEncounterParty] = useState<string[] | null>(null);
  const activeTheme = useMemo(() => themeForArc(world.cartridge.arc), [world.cartridge.arc]);
  const mayOpenMobileSelection = costumeId !== "globe" || isWorldInteractionUnlocked(ix.selectedId, ix.nearbyId);

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

  // Mobile step follows selection: pick a contract on the board -> its detail
  // sheet; deselect -> back to the board. Party is a manual push from contract.
  useEffect(() => {
    if (!isMobile) return;
    if (ix.selectedId && mayOpenMobileSelection) setMobileStep((s) => (s === "board" ? "contract" : s));
    else setMobileStep("board");
  }, [isMobile, ix.selectedId, mayOpenMobileSelection]);

  const choose = (id: string) => {
    setCostumeId(id);
    if (isCostumeId(id)) saveCostume(world.cartridge.arc, id);
  };
  // Re-derived whenever locale changes so representation labels/blurbs/hints re-translate.
  const presentations = useMemo(() => getPresentations(), [locale]);
  const playerPresentations = useMemo(
    // Planet/world is a player surface, not developer chrome. Keep it reachable
    // everywhere; only the dependency graph is a development-only renderer.
    () => presentations.filter((presentation) => presentation.id !== "graph"),
    [presentations],
  );
  const active = useMemo(() => presentations.find((p) => p.id === costumeId) ?? presentations[0]!, [presentations, costumeId]);
  const modalOpen = world.pendingDecision !== null || encounterOpen;
  const underlayRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const underlay = underlayRef.current;
    if (!underlay) return;
    if (modalOpen) underlay.setAttribute("inert", "");
    else underlay.removeAttribute("inert");
    return () => underlay.removeAttribute("inert");
  }, [modalOpen]);
  const selectionVisible = active.id !== "globe" || isWorldInteractionUnlocked(ix.selectedId, ix.nearbyId);
  const showPurpose = !dismissedPurpose[active.id] && !modalOpen;
  const dismissPurpose = () => setDismissedPurpose((p) => ({ ...p, [active.id]: true }));

  // Enter the compiled encounter directly from a surface (the world map's ENTER
  // ENCOUNTER pin). Selecting first keeps the encounter's challengeId in sync with
  // the rest of the shell, exactly like the board's PLAY ENCOUNTER path.
  const enterEncounter = (challengeId: string) => {
    ix.select(challengeId);
    // Seed with the recommended party for THIS challenge explicitly: ix.select's
    // party reseed runs in a later effect, so ix.party can still hold the previous
    // selection's party when EncounterShell snapshots it at mount.
    setEncounterParty(world.recommendedParty(challengeId));
    setEncounterOpen(true);
  };

  const PresentationScene = active.Scene;
  const stage = (
    <div data-testid="representation-region" style={{ position: "absolute", inset: 0 }}>
      <PresentationScene world={world} interaction={ix} modalOpen={modalOpen} active onEnterEncounter={enterEncounter} onNavigate={choose} />
    </div>
  );
  const contextStrip = <ViewContextStrip rep={active} showPurpose={showPurpose} onDismiss={dismissPurpose} />;

  const min = ix.req?.minAgents ?? 0;
  const max = ix.req?.maxAgents ?? 0;
  const coach = getEngineCoachMessage({
    pendingDecision: world.pendingDecision !== null,
    selected: selectionVisible ? ix.selected : null,
    partyCount: ix.party.length,
    min,
    canRun: selectionVisible && ix.canRun,
    lastReport: world.lastReport,
    arcComplete: world.arcComplete,
  });

  const status = (
    <StatusRegion title={world.arc.meta.name} arcId={world.arc.meta.id} cycle={world.cycle} resources={world.resources} progress={{ cleared: world.clearedCount, total: world.totalNodes }} />
  );
  const switcher = (
    <ViewSwitcher costumes={playerPresentations.map((p) => ({ id: p.id, label: p.label, blurb: p.blurb }))} activeId={active.id} onChoose={choose} disabled={modalOpen} />
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
    // Global mode object — deliberately quiet chrome (ghost), so it never
    // competes with the in-loop game actions (RUN CONTRACT, fix actions).
    <PixelButton
      type="button"
      variant="ghost"
      data-testid="cartridge-object-button"
      onClick={() => setShowCartridge(true)}
      style={{ pointerEvents: "auto", minHeight: 40, padding: "6px 10px", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
    >
      <PixelIcon name="selected" /> {!isMobile && <span>{t("shell.cartridgeButton")}</span>}
    </PixelButton>
  );
  const localeSwitcher = <LocaleSwitcher />;

  const selectionActive = selectionVisible && ix.selected?.status === "available";
  const recommendedIds = useMemo(
    () => (selectionActive && ix.selectedId ? world.recommendedParty(ix.selectedId) : []),
    [selectionActive, ix.selectedId, world],
  );
  const roster = (
    <RosterRegion
      theme={activeTheme}
      roster={world.roster}
      party={ix.party}
      selectable={selectionActive}
      selectionActive={selectionActive}
      recommendedIds={recommendedIds}
      fixPlan={selectionVisible ? ix.fixPlan : null}
      max={max}
      contract={selectionVisible ? ix.contract : null}
      variant={isMobile ? "strip" : "list"}
      onToggleAgent={ix.toggleAgent}
      onApplyFix={ix.applyFix}
    />
  );
  // "Up next" / "Steep" for the detail panel come from the SAME shared projection the
  // board and map read, so the world-state markers travel with the contract to the
  // commit surface — the player never has to remember them from the previous screen.
  const selectedMarkers = useMemo(
    () => (ix.selectedId ? deriveNodeMarkers(world.nodes).get(ix.selectedId) ?? null : null),
    [world.nodes, ix.selectedId],
  );
  const contractProps = ix.selected && selectionVisible
    ? {
        selected: ix.selected, party: ix.party, min, max, canRun: ix.canRun, onRun: interceptedRun,
        contract: ix.contract, readiness: ix.readiness, recommendation: ix.recommendation,
        fixPlan: ix.fixPlan, onApplyFix: ix.applyFix, compact: isMobile,
        upNext: selectedMarkers?.next ?? false,
        steep: selectedMarkers?.steep ?? false,
        difficultyModes: world.difficultyModes, difficultyModeId: world.difficultyModeId,
        onSelectDifficultyMode: world.setDifficultyModeId,
      }
    : null;
  // PLAY ENCOUNTER: enter the compiled encounter for the selected, runnable
  // contract. Same source record as the board card — the encounter is projected,
  // not a separate authored level.
  const playEncounter = selectionActive && ix.selectedId ? (
    <PixelButton
      type="button"
      variant="primary"
      data-testid="play-encounter-button"
      disabled={!ix.canRun}
      onClick={() => { setEncounterParty(null); setEncounterOpen(true); }}
      style={{ width: "100%", minHeight: isMobile ? 56 : 44, fontSize: isMobile ? 14 : undefined, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
    >
      <PixelIcon name="available" /> <span>{t("encounterShell.playEncounter")}</span>
    </PixelButton>
  ) : null;
  const mobileMission = ix.selected ? (
    <MobileMissionStage
      node={ix.selected}
      roster={world.roster}
      party={ix.party}
      max={max}
      theme={activeTheme}
      readiness={ix.readiness}
    />
  ) : null;
  // One world, one route: the detail panel is the action hub, so it also routes to
  // the OTHER surfaces of the same contract — the map (every contract is a pin) and,
  // when this contract is the one the steward holds, the hall (take it in person).
  // Same deriveHallView the hall and map read; same choose() the ViewSwitcher uses.
  const hallView = useMemo(() => deriveHallView(world.nodes), [world.nodes]);
  const selectedHeldInHall = ix.selectedId !== null && hallView.challengeId === ix.selectedId && !hallView.resolved;
  // On mobile the representation region lives in the "board" step, so routing from
  // the contract-detail step must also step back — otherwise the costume would
  // switch invisibly behind the detail sheet. Desktop is a plain view switch.
  const routeTo = (view: string) => {
    choose(view);
    if (isMobile) setMobileStep("board");
  };
  const routeRow = ix.selected ? (
    <div data-testid="detail-route-row" style={{ display: "flex", gap: 6, marginTop: 8 }}>
      <PixelButton
        type="button"
        variant="secondary"
        data-testid="detail-see-on-map"
        disabled={modalOpen}
        onClick={() => routeTo("map")}
        style={{ flex: 1, minHeight: 36, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
      >
        <PixelIcon name="available" /> <span>{t("shell.seeOnMap")}</span>
      </PixelButton>
      {selectedHeldInHall && (
        <PixelButton
          type="button"
          variant="secondary"
          data-testid="detail-take-in-person"
          disabled={modalOpen}
          onClick={() => routeTo("hall")}
          style={{ flex: 1, minHeight: 36, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <PixelIcon name="recorded" /> <span>{t("shell.takeInPerson")}</span>
        </PixelButton>
      )}
    </div>
  ) : null;
  // Steward's note — the authored person who HOLDS this contract speaks on the
  // commit surface: face + their authored greeting, verbatim. Gated on the same
  // deriveHallView as the hall route, so the note can only appear for the
  // contract the steward actually holds, and only when the cartridge authors her.
  const steward = hallSteward(world.cartridge);
  const stewardNote = selectedHeldInHall && steward ? (
    <div
      data-testid="detail-steward-note"
      style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 8, padding: "8px 10px", background: "rgba(246,239,227,0.96)", border: "2px solid rgba(201,161,74,0.6)" }}
    >
      {CartridgePortrait({ arcId: world.arc.meta.id, personId: steward.id, size: 34 })}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "var(--px-font)", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8a6d2e" }}>{t("shell.stewardNote")}</div>
        <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 12, lineHeight: 1.45, color: "#2a2018" }}>{steward.greeting}</div>
      </div>
    </div>
  ) : null;
  const contract = contractProps ? (
    <div data-testid="contract-detail-stack">
      {world.lastEquip && <EquipFlash event={world.lastEquip} />}
      <ContractRegion {...contractProps} />
      {stewardNote}
      {playEncounter && <div style={{ marginTop: 8 }}>{playEncounter}</div>}
      {routeRow}
    </div>
  ) : null;
  const mobileStickyFooter: CSSProperties = {
    flex: "none",
    display: "grid",
    gap: 6,
    padding: "8px 12px",
    paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
    borderTop: "1px solid #2a2620",
    background: "rgba(246,239,227,0.97)",
  };
  // Mobile Party step uses full one-column cards (list), not the desktop-mobile strip.
  const mobileRosterList = (
    <RosterRegion
      theme={activeTheme}
      roster={world.roster}
      party={ix.party}
      selectable={selectionActive}
      selectionActive={selectionActive}
      recommendedIds={recommendedIds}
      fixPlan={ix.fixPlan}
      max={max}
      contract={ix.contract}
      variant="list"
      onToggleAgent={ix.toggleAgent}
      onApplyFix={ix.applyFix}
    />
  );
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
        ref={underlayRef}
        data-testid="shell-underlay"
        aria-hidden={modalOpen ? true : undefined}
        style={{ display: "contents" }}
      >
      {!isMobile && <ProgramIdentityStrip world={world} />}
      <div
        style={{
          flex: "none",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          borderBottom: "1px solid #2a2620",
          background: "rgba(15,13,9,0.92)",
        }}
      >
        <div style={{ flex: isMobile ? "1 1 100%" : "1 1 auto", minWidth: 0, order: 0 }}>{status}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, order: 1, marginLeft: isMobile ? "auto" : 0 }}>
          {switcher}
          {localeSwitcher}
          {!isMobile && recordButton}
          {!isMobile && cartridgeButton}
        </div>
      </div>

      {isMobile ? (
        // Staged turn flow — ONE panel at a time (Board -> Contract -> Party),
        // with a sticky RUN CONTRACT footer so the loop stays completable at
        // phone width without horizontal scroll, zoom, or multi-panel reading.
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {mobileStep !== "board" && (
            <button
              type="button"
              data-testid="mobile-step-back"
              onClick={() => {
                if (mobileStep === "party") setMobileStep("contract");
                else { ix.select(null); setMobileStep("board"); }
              }}
              style={{ flex: "none", minHeight: 48, display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "rgba(15,13,9,0.92)", borderBottom: "1px solid #2a2620", color: "#d8cfbd", fontFamily: "var(--px-font)", fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
            >
              ‹ {mobileStep === "party" ? t("shell.mobileBackContract") : t("shell.mobileBackBoard")}
            </button>
          )}

          {mobileStep === "board" && (
            <div data-testid="mobile-step-board" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto" }}>
              {contextStrip}
              <div style={{ flex: 1, position: "relative", minHeight: "60dvh" }}>{stage}</div>
              {(world.arcComplete || coach || world.dispatches.length > 0) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 12px" }}>
                  {world.arcComplete && <CompleteBanner arcName={world.arc.meta.name} />}
                  {coach && <Card style={{ borderColor: "#6b5935", background: "rgba(32,28,20,0.92)" }}><CoachRegion message={coach} /></Card>}
                  {world.dispatches.length > 0 && <Card style={{ padding: "8px 12px" }}><DispatchRegion dispatches={world.dispatches} limit={1} /></Card>}
                </div>
              )}
            </div>
          )}

          {mobileStep === "contract" && contractProps && (
            <>
              <div data-testid="mobile-step-contract" style={{ flex: 1, overflowY: "auto", padding: "8px 12px", display: "grid", gap: 8, alignContent: "start" }}>
                {world.pendingLoot.length > 0 ? loot : (
                  <>
                    {world.lastEquip && <EquipFlash event={world.lastEquip} />}
                    {mobileMission}
                    <details data-testid="mobile-mission-details" style={{ border: "2px solid var(--ink)", background: "var(--cream)", color: "var(--ink)" }}>
                      <summary style={{ cursor: "pointer", padding: "10px 12px", fontFamily: "var(--px-font)", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        {t("contractCard.squadFit")}
                      </summary>
                      <div style={{ padding: "0 8px 8px" }}><ContractRegion {...contractProps} render="detail" /></div>
                    </details>
                  </>
                )}
              </div>
              {world.pendingLoot.length === 0 && selectionActive && (
                <div style={mobileStickyFooter}>
                  <PixelButton type="button" variant="secondary" data-testid="mobile-adjust-party" onClick={() => setMobileStep("party")} style={{ width: "100%", minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                    <PixelIcon name="selected" /> <span>{t("shell.mobileAdjustParty", { count: ix.party.length, max })}</span>
                  </PixelButton>
                  {playEncounter}
                </div>
              )}
            </>
          )}

          {mobileStep === "party" && (
            <>
              <div data-testid="mobile-step-party" style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
                {mobileRosterList}
              </div>
              {contractProps && selectionActive && (
                <div style={mobileStickyFooter}>
                  {playEncounter}
                </div>
              )}
            </>
          )}
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

      </div>

      {world.pendingDecision && !encounterOpen && (
        <DecisionPanel key={world.pendingDecision.id} card={world.pendingDecision} onResolve={world.resolveDecision} targetName={world.effectTargetName} />
      )}
      {showCartridge && (
        <CartridgeObjectPanel
          manifest={world.cartridge.manifest}
          digest={world.cartridgeDigest}
          ledger={world.ledger}
          openingChoice={world.openingChoice}
          cycle={world.cycle}
          clearedCount={world.clearedCount}
          totalNodes={world.totalNodes}
          onExport={world.buildExport}
          onClose={() => setShowCartridge(false)}
          onLeave={onExit}
        />
      )}
      {showHistory && world.lastRecord && <RecordModal record={world.lastRecord} onClose={() => setShowHistory(false)} />}
      {encounterOverlay}
      {encounterOpen && ix.selectedId && (
        <EncounterShell
          world={world}
          challengeId={ix.selectedId}
          party={encounterParty ?? ix.party}
          onClose={() => { setEncounterOpen(false); setEncounterParty(null); }}
        />
      )}
    </div>
  );
}
