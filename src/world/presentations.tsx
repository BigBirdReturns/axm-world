// Renderer registry. Rodoh owns one cartridge state and lets multiple renderer
// adapters look at it: lightweight 2D board by default, optional 3D planet, and a
// dev/debug graph. Heavy 3D renderers are lazy-loaded so the default board path
// does not pay the WebGL bundle cost.

import { lazy, Suspense } from "react";
import { ContractBoardScene } from "./contract-board/ContractBoard.js";
import { WorldMapScene } from "./worldmap/WorldMap.js";
import { HallScene } from "./inhabited/HallScene.js";
import { RodohAperture } from "./aperture/RodohAperture.js";
import { UnderworldScene } from "./underworld/UnderworldScene.js";
import { CommonShipScene } from "./common-ship/CommonShipScene.js";
import type { CostumeId } from "./presentation-prefs.js";
import type { ArcInteraction } from "./useArcInteraction.js";
import type { ArcWorld } from "./useArcWorld.js";
import { t } from "./i18n/index.js";

export interface SceneProps {
  world: ArcWorld;
  interaction: ArcInteraction;
  modalOpen?: boolean;
  /** False when this renderer is mounted but not the visible one. Most renderers are
   *  mounted only when active; this remains for renderer adapters that can pause loops. */
  active?: boolean;
  /** Open the compiled encounter for a challenge directly from a surface (the world
   *  map's ENTER ENCOUNTER). Optional: surfaces that don't offer it omit it. */
  onEnterEncounter?: (challengeId: string) => void;
  /** Route to another representation of the SAME world state (board/map/hall/…).
   *  This is what makes the surfaces one navigable place instead of three tabs:
   *  a scene can hand the player to the surface where the next action lives.
   *  Same switch the ViewSwitcher uses — no new state, just unified routing. */
  onNavigate?: (view: CostumeId) => void;
  /** Session-only directing cue: after an opening choice is acknowledged, the Hall
   *  may present its authored steward and next contract. It is never save state. */
  openingHandoff?: boolean;
  onOpeningHandoffComplete?: () => void;
  /** A scene (the hall) reports when its briefing/dialogue is open so the shell can
   *  suppress the duplicated right-rail contract controls during the handoff. */
  onBriefingActiveChange?: (active: boolean) => void;
}

export interface LegendEntry {
  glyph: string;
  color: string;
  label: string;
}

export interface Representation {
  id: CostumeId;
  label: string;
  blurb: string;
  /** Renders only the scene; fills the active-representation region. */
  Scene: (p: SceneProps) => JSX.Element;
  /** Shell-rendered hint for how to manipulate this representation. */
  controlsHint: string;
  /** One-line answer to "what is this view for / how is it different". Shell renders it
   *  as a dismissible caption inside the representation region. */
  purpose: string;
  /** Shell-rendered marker legend so node state reads at a glance, not just from labels.
   *  Empty array = no legend rendered (board is self-labelling via card state badges). */
  legend: LegendEntry[];
}

const LazyPlanetScene = lazy(async () => {
  const mod = await import("./WorldScreen.js");
  return { default: mod.PlanetScene };
});

const LazyDebugGraphScene = lazy(async () => {
  const mod = await import("./board/BoardScreen.js");
  return { default: mod.BoardScene };
});

function RendererFallback(): JSX.Element {
  return (
    <div className="renderer-fallback" role="status">
      {t("presentations.loadingRenderer")}
    </div>
  );
}

function PlanetSceneLazy(props: SceneProps): JSX.Element {
  return (
    <Suspense fallback={<RendererFallback />}>
      <LazyPlanetScene {...props} />
    </Suspense>
  );
}

function DebugGraphSceneLazy(props: SceneProps): JSX.Element {
  return (
    <Suspense fallback={<RendererFallback />}>
      <LazyDebugGraphScene {...props} />
    </Suspense>
  );
}

// Same engine states across renderers — only the surface differs. A function
// (not a module-level const) so the labels re-resolve on every call instead
// of freezing at whichever locale was active when the module first loaded.
function nodeLegend(): LegendEntry[] {
  return [
    { glyph: "●", color: "#b01c18", label: t("presentations.legend.selected") },
    { glyph: "◆", color: "#c9a14a", label: t("presentations.legend.available") },
    { glyph: "◇", color: "#5e5850", label: t("presentations.legend.locked") },
    { glyph: "✓", color: "#74ad77", label: t("presentations.legend.recorded") },
    { glyph: "⚠", color: "#e0a23a", label: t("presentations.legend.risky") },
  ];
}

/** Builds the representation list fresh on every call (rather than a frozen
 *  module-level array) so labels/blurbs/hints re-translate on locale switch. */
export function getPresentations(): Representation[] {
  const legend = nodeLegend();
  return [
    {
      id: "board",
      label: t("presentations.board.label"),
      blurb: t("presentations.board.blurb"),
      Scene: ContractBoardScene,
      controlsHint: t("presentations.board.controlsHint"),
      purpose: t("presentations.board.purpose"),
      legend: [],
    },
    {
      id: "map",
      label: t("presentations.map.label"),
      blurb: t("presentations.map.blurb"),
      Scene: WorldMapScene,
      controlsHint: t("presentations.map.controlsHint"),
      purpose: t("presentations.map.purpose"),
      legend,
    },
    {
      id: "hall",
      label: t("presentations.hall.label"),
      blurb: t("presentations.hall.blurb"),
      Scene: HallScene,
      controlsHint: t("presentations.hall.controlsHint"),
      purpose: t("presentations.hall.purpose"),
      legend: [],
    },
    {
      id: "aperture",
      label: t("presentations.aperture.label"),
      blurb: t("presentations.aperture.blurb"),
      Scene: RodohAperture,
      controlsHint: t("presentations.aperture.controlsHint"),
      purpose: t("presentations.aperture.purpose"),
      legend,
    },
    {
      id: "underworld",
      label: t("presentations.underworld.label"),
      blurb: t("presentations.underworld.blurb"),
      Scene: UnderworldScene,
      controlsHint: t("presentations.underworld.controlsHint"),
      purpose: t("presentations.underworld.purpose"),
      legend,
    },
    {
      id: "common-ship",
      label: "Common Ship",
      blurb: "Compose watches across bodies, clocks, habitats, and inherited obligations.",
      Scene: CommonShipScene,
      controlsHint: "Select an operation, compose the watch, inspect the Arc verdict, then commit.",
      purpose: "Manage the vessel as a shared polity rather than a human-normal vehicle.",
      legend,
    },
    {
      id: "globe",
      label: t("presentations.globe.label"),
      blurb: t("presentations.globe.blurb"),
      Scene: PlanetSceneLazy,
      controlsHint: t("presentations.globe.controlsHint"),
      purpose: t("presentations.globe.purpose"),
      legend,
    },
    {
      id: "graph",
      label: t("presentations.graph.label"),
      blurb: t("presentations.graph.blurb"),
      Scene: DebugGraphSceneLazy,
      controlsHint: t("presentations.graph.controlsHint"),
      purpose: t("presentations.graph.purpose"),
      legend,
    },
  ];
}
