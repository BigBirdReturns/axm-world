// Renderer registry. Rodoh owns one cartridge state and lets multiple renderer
// adapters look at it: lightweight 2D board by default, optional 3D planet, and a
// dev/debug graph. Heavy 3D renderers are lazy-loaded so the default board path
// does not pay the WebGL bundle cost.

import { lazy, Suspense } from "react";
import { ContractBoardScene } from "./contract-board/ContractBoard.js";
import type { CostumeId } from "./presentation-prefs.js";
import type { ArcInteraction } from "./useArcInteraction.js";
import type { ArcWorld } from "./useArcWorld.js";

export interface SceneProps {
  world: ArcWorld;
  interaction: ArcInteraction;
  modalOpen?: boolean;
  /** False when this renderer is mounted but not the visible one. Most renderers are
   *  mounted only when active; this remains for renderer adapters that can pause loops. */
  active?: boolean;
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
      Loading renderer…
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

// Same engine states across renderers — only the surface differs.
const NODE_LEGEND: LegendEntry[] = [
  { glyph: "●", color: "#b01c18", label: "selected" },
  { glyph: "◆", color: "#c9a14a", label: "available" },
  { glyph: "◇", color: "#5e5850", label: "locked" },
  { glyph: "✓", color: "#74ad77", label: "recorded" },
  { glyph: "⚠", color: "#e0a23a", label: "risky (projected to fall short)" },
];

export const PRESENTATIONS: Representation[] = [
  {
    id: "board",
    label: "Board",
    blurb: "2D contract board — readable cards, gates, risk, rewards, recorded marks",
    Scene: ContractBoardScene,
    controlsHint: "select a contract card",
    purpose: "The cartridge's work as board-game cards: choose a place, inspect gates and risk, then manage the roster.",
    legend: [],
  },
  {
    id: "globe",
    label: "Planet",
    blurb: "3D world — optional spatial renderer",
    Scene: PlanetSceneLazy,
    controlsHint: "drag to orbit · scroll to zoom · right-drag to pan · click a ◆ contract",
    purpose: "The same cartridge state placed in a 3D world. Useful only when location matters for the cartridge.",
    legend: NODE_LEGEND,
  },
  {
    id: "graph",
    label: "Debug Graph",
    blurb: "Developer dependency graph",
    Scene: DebugGraphSceneLazy,
    controlsHint: "drag to orbit · scroll to zoom · click a ◆ contract",
    purpose: "Developer view of the dependency graph. Not the default player surface.",
    legend: NODE_LEGEND,
  },
];
