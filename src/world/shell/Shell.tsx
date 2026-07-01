// The player shell: ONE runtime shell across breakpoints. It owns every engine region
// (status, view switcher, active representation, roster/assignment, selected contract +
// readiness, outcome/report, coach) and the chrome (cartridge object, decisions). The
// active representation — Run Graph or Planet — mounts inside the one representation
// region; switching it never disturbs run state, selection, party, readiness, or marks
// (those live in useArcWorld/useArcInteraction, above the costume).
//
// Desktop and mobile use the SAME region components; only the arrangement differs:
//   desktop → status/switcher top bar + roster left rail + contract/report/coach right
//             rail, all in document flow (columns can't overlap), representation center.
//   mobile  → same top bar + a bottom flex dock that stacks the same regions by flow.

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useEncounterDirector } from "../encounter/EncounterDirector.js";
import { PRESENTATIONS, type Representation } from "../presentations.js";
import { loadCostume, saveCostume, isCostumeId } from "../presentation-prefs.js";
import { useIsMobile } from "../use-viewport.js";
import { getEngineCoachMessage } from "./coach.js";
import {
  StatusRegion,
  ViewSwitcher,
  RosterRegion,
  ContractRegion,
  ReportRegion,
  LootRegion,
  CoachRegion,
  DispatchRegion,
  CompleteBanner,
  panel,
} from "./regions.js";
import { DecisionPanel } from "../components/DecisionPanel.js";
import { CartridgeObjectPanel } from "../components/CartridgeObjectPanel.js";
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

/** The view-context strip: a fixed, normal-flow shell slot for the "what is this
 *  view for" onboarding note, the marker legend, and the controls hint. Nothing in
 *  it is absolutely positioned over the play surface — it can never overlap the
 *  board, roster, or detail rail. Dismissing the note collapses the strip to a
 *  thin context row; it does not float back. */
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
          <button onClick={onDismiss} aria-label="Dismiss view note" style={{ flex: "none", background: "transparent", border: "none", color: "#a59c8b", cursor: "pointer", font: "14px monospace", lineHeight: 1 }}>×</button>
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

export function Shell({ world, interaction: ix, onExit }: ShellProps): JSX.Element {
  const { interceptedRun, overlay: encounterOverlay } = useEncounterDirector(ix, world);
  const isMobile = useIsMobile();
  const [costumeId, setCostumeId] = useState<string>(() => loadCostume(world.cartridge.arc));
  const [showCartridge, setShowCartridge] = useState(false);
  const [dismissedPurpose, setDismissedPurpose] = useState<Record<string, boolean>>({});

  const choose = (id: string) => {
    setCostumeId(id);
    if (isCostumeId(id)) saveCostume(world.cartridge.arc, id);
  };
  const active = useMemo(() => PRESENTATIONS.find((p) => p.id === costumeId) ?? PRESENTATIONS[0]!, [costumeId]);
  const modalOpen = world.pendingDecision !== null;
  const showPurpose = !dismissedPurpose[active.id] && !modalOpen;
  const dismissPurpose = () => setDismissedPurpose((p) => ({ ...p, [active.id]: true }));

  // Only the active renderer is mounted. 3D renderers are lazy-loaded, so keeping them
  // alive with visibility:hidden would force their WebGL context into memory even when
  // not in use. The 2D board (default) pays no 3D cost; switching to 3D loads it once.
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

  // ── region nodes (identical components in both arrangements) ──
  const status = (
    <StatusRegion title={world.arc.meta.name} cycle={world.cycle} resources={world.resources} progress={{ cleared: world.clearedCount, total: world.totalNodes }} />
  );
  const switcher = (
    <ViewSwitcher costumes={PRESENTATIONS.map((p) => ({ id: p.id, label: p.label, blurb: p.blurb }))} activeId={active.id} onChoose={choose} disabled={modalOpen} />
  );
  const cartridgeButton = (
    <button
      onClick={() => setShowCartridge(true)}
      style={{ pointerEvents: "auto", font: "600 13px 'IBM Plex Mono', ui-monospace, monospace", background: "rgba(23,21,15,0.8)", color: "#c9a14a", border: "1px solid #4a4238", borderRadius: 6, padding: "6px 10px", cursor: "pointer", whiteSpace: "nowrap" }}
    >
      {isMobile ? "◧" : "◧ Cartridge"}
    </button>
  );
  // The "who do I send" question is only live for an available contract; locked and
  // cleared selections have no party to commit, so the roster stays in capacity view.
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
    <ContractRegion selected={ix.selected} party={ix.party} min={min} max={max} canRun={ix.canRun} onRun={interceptedRun} contract={ix.contract} readiness={ix.readiness} recommendation={ix.recommendation} fixPlan={ix.fixPlan} onApplyFix={ix.applyFix} compact={isMobile} />
  ) : null;
  const loot = <LootRegion loot={world.pendingLoot} onClaimLoot={world.claimLoot} />;

  return (
    <div data-testid="engine-shell" data-modal-open={modalOpen ? "true" : "false"} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "#0b0a08", overflow: "hidden", isolation: "isolate", fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
      {/* top bar — status / view switcher / cartridge, in flow so it never overlaps.
          On mobile it wraps to two rows (controls above, full-width status below) so the
          status chips get a full-width scroll row instead of stacking. */}
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
          {cartridgeButton}
        </div>
      </div>

      {/* stage */}
      {isMobile ? (
        // Mobile: map takes a fixed slice at top; content stacks and scrolls below.
        // No absolute overlays — every region is in normal flow.
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto" }}>
          {contextStrip}
          {/* map — capped so content below is reachable without scrolling past it */}
          <div style={{ height: "clamp(150px, 24dvh, 230px)", flex: "none", position: "relative" }}>
            {stage}
          </div>
          {/* content stack — same one-occupant precedence as the desktop detail rail:
              loot beats contract detail; report/coach/dispatches only when idle. */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 12px", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
            {world.arcComplete && <CompleteBanner />}
            {world.pendingLoot.length > 0 ? loot : contract}
            {!ix.selected && world.pendingLoot.length === 0 && (
              <>
                {world.lastReport && <ReportRegion lastReport={world.lastReport} />}
                {coach && <Card style={{ borderColor: "#6b5935", background: "rgba(32,28,20,0.92)" }}><CoachRegion message={coach} /></Card>}
                {world.dispatches.length > 0 && <Card style={{ padding: "8px 12px" }}><DispatchRegion dispatches={world.dispatches} limit={1} /></Card>}
              </>
            )}
            {roster}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* left rail — roster: the capacity/commitment surface */}
          <aside style={{ width: 320, flex: "none", overflowY: "auto", padding: 12, borderRight: "1px solid #2a2620", background: "rgba(15,13,9,0.6)" }}>
            <Card>{roster}</Card>
          </aside>

          {/* center — view-context strip in flow above the one active-representation region */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            {contextStrip}
            <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
              {stage}
              {world.arcComplete && (
                <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)" }}>
                  <Card style={{ borderColor: "#74ad77" }}><CompleteBanner /></Card>
                </div>
              )}
            </div>
          </div>

          {/* right rail — one occupant at a time: claiming (loot) beats choosing
              (contract detail) beats idle (report / coach / dispatches). The choosing
              phase never shares its scroll column with outcome or loot. */}
          <aside style={{ width: 360, flex: "none", overflowY: "auto", padding: 12, borderLeft: "1px solid #2a2620", background: "rgba(15,13,9,0.6)" }}>
            {world.pendingLoot.length > 0 ? (
              <Card>{loot}</Card>
            ) : contract ? (
              <Card>{contract}</Card>
            ) : (
              <>
                {world.lastReport && <Card style={{ marginBottom: 10 }}><ReportRegion lastReport={world.lastReport} /></Card>}
                {coach && <Card style={{ marginBottom: 10, borderColor: "#6b5935", background: "rgba(32,28,20,0.9)" }}><CoachRegion message={coach} /></Card>}
                {world.dispatches.length > 0 && <Card><DispatchRegion dispatches={world.dispatches} limit={4} /></Card>}
              </>
            )}
          </aside>
        </div>
      )}

      {/* chrome: authored/pending decision, then the cartridge-as-object + exit */}
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
      {encounterOverlay}
    </div>
  );
}
