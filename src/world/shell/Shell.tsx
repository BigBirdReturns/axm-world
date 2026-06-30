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

/** Inside the active-representation region: a dismissible "what is this view for"
 *  caption and a marker-state legend, so a representation explains itself and its node
 *  states read at a glance — not only from tiny labels. Never covers the controls. */
function RepresentationOverlay(props: { rep: Representation; showPurpose: boolean; onDismiss: () => void }): JSX.Element {
  const { rep, showPurpose, onDismiss } = props;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {showPurpose && (
        <div
          data-testid="view-purpose"
          style={{ position: "absolute", top: 10, left: 10, maxWidth: 300, pointerEvents: "auto", display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(15,13,9,0.92)", border: "1px solid #4a4238", borderRadius: 8, padding: "8px 10px", font: "11px/1.45 'IBM Plex Mono', ui-monospace, monospace", color: "#d8cfbd" }}
        >
          <div><strong style={{ color: "#c9a14a" }}>{rep.label}.</strong> {rep.purpose}</div>
          <button onClick={onDismiss} aria-label="Dismiss view note" style={{ flex: "none", background: "transparent", border: "none", color: "#a59c8b", cursor: "pointer", font: "14px monospace", lineHeight: 1 }}>×</button>
        </div>
      )}
      <div
        data-testid="view-legend"
        style={{ position: "absolute", top: 10, right: 10, pointerEvents: "none", background: "rgba(15,13,9,0.82)", border: "1px solid #3a352c", borderRadius: 8, padding: "6px 9px", font: "10px/1.6 'IBM Plex Mono', ui-monospace, monospace", color: "#a59c8b" }}
      >
        {rep.legend.map((e) => (
          <div key={e.label} style={{ display: "flex", gap: 6, alignItems: "center", whiteSpace: "nowrap" }}>
            <span style={{ color: e.color, width: 12, textAlign: "center" }}>{e.glyph}</span>
            <span>{e.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Shell({ world, interaction: ix, onExit }: ShellProps): JSX.Element {
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

  // All representations are mounted simultaneously; only the active one is visible.
  // visibility:hidden (not display:none) keeps each Scene's WebGL context alive across
  // costume switches, so orbit camera position and cleared node state survive the swap
  // instead of the canvas rebuilding from scratch.
  const stage = (
    <>
      {PRESENTATIONS.map((p) => {
        const isActive = p.id === active.id;
        const PresentationScene = p.Scene;
        return (
          <div
            key={p.id}
            data-testid={isActive ? "representation-region" : undefined}
            style={{ position: "absolute", inset: 0, visibility: isActive ? "visible" : "hidden", pointerEvents: isActive ? "auto" : "none" }}
          >
            <PresentationScene world={world} interaction={ix} modalOpen={modalOpen} />
          </div>
        );
      })}
      <RepresentationOverlay rep={active} showPurpose={showPurpose} onDismiss={dismissPurpose} />
    </>
  );

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
  const roster = (
    <RosterRegion
      roster={world.roster}
      party={ix.party}
      selectable={!!ix.selected}
      max={max}
      contract={ix.contract}
      variant={isMobile ? "strip" : "list"}
      onToggleAgent={ix.toggleAgent}
      onApplyDowntime={world.applyDowntime}
    />
  );
  const contract = ix.selected ? (
    <ContractRegion selected={ix.selected} party={ix.party} min={min} max={max} canRun={ix.canRun} onRun={ix.run} contract={ix.contract} readiness={ix.readiness} recommendation={ix.recommendation} fixPlan={ix.fixPlan} onApplyFix={ix.applyFix} />
  ) : null;

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
        <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
          {stage}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              maxHeight: "72%",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "0 10px",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
              pointerEvents: "none",
            }}
          >
            {world.arcComplete && <Card style={{ borderColor: "#74ad77" }}><CompleteBanner /></Card>}
            {world.lastReport && <Card><ReportRegion lastReport={world.lastReport} /></Card>}
            {!ix.selected && coach && <Card style={{ borderColor: "#6b5935", background: "rgba(32,28,20,0.92)" }}><CoachRegion message={coach} /></Card>}
            {!ix.selected && world.dispatches.length > 0 && <Card style={{ padding: "8px 12px" }}><DispatchRegion dispatches={world.dispatches} limit={1} /></Card>}
            {ix.selected && <Card style={{ overflow: "hidden" }}>{roster}</Card>}
            {contract && <Card style={{ overflowY: "auto" }}>{contract}</Card>}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* left rail — roster / assignment / training */}
          <aside style={{ width: 320, flex: "none", overflowY: "auto", padding: 12, borderRight: "1px solid #2a2620", background: "rgba(15,13,9,0.6)" }}>
            <Card>{roster}</Card>
          </aside>

          {/* center — the one active-representation region */}
          <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
            {stage}
            {world.arcComplete && (
              <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)" }}>
                <Card style={{ borderColor: "#74ad77" }}><CompleteBanner /></Card>
              </div>
            )}
            <div style={{ position: "absolute", bottom: 14, left: 14, font: "11px/1.4 'IBM Plex Mono', ui-monospace, monospace", color: "#a59c8b", pointerEvents: "none" }}>
              {active.controlsHint}
            </div>
          </div>

          {/* right rail — selected contract / readiness / outcome / coach */}
          <aside style={{ width: 360, flex: "none", overflowY: "auto", padding: 12, borderLeft: "1px solid #2a2620", background: "rgba(15,13,9,0.6)" }}>
            {contract && <Card style={{ marginBottom: 10 }}>{contract}</Card>}
            {world.lastReport && <Card style={{ marginBottom: 10 }}><ReportRegion lastReport={world.lastReport} /></Card>}
            {!ix.selected && coach && <Card style={{ marginBottom: 10, borderColor: "#6b5935", background: "rgba(32,28,20,0.9)" }}><CoachRegion message={coach} /></Card>}
            {world.dispatches.length > 0 && <Card><DispatchRegion dispatches={world.dispatches} limit={4} /></Card>}
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
    </div>
  );
}
