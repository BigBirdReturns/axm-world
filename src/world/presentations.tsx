// Representation registry. A representation is the *content* of the shell's active
// representation region — nothing more. It renders the engine's nodes through the
// shared interaction seam; the shell owns all chrome (status, roster, contract,
// readiness, report, decision, cartridge). Adding a representation is one entry here;
// the engine and the shell are untouched, so every cartridge can wear it.

import { PlanetScene } from "./WorldScreen.js";
import { BoardScene } from "./board/BoardScreen.js";
import type { CostumeId } from "./presentation-prefs.js";
import type { ArcInteraction } from "./useArcInteraction.js";
import type { ArcWorld } from "./useArcWorld.js";

export interface SceneProps {
  world: ArcWorld;
  interaction: ArcInteraction;
  modalOpen?: boolean;
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
  /** Shell-rendered marker legend so node state reads at a glance, not just from labels. */
  legend: LegendEntry[];
}

// Same engine states across costumes — only the surface differs.
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
    label: "Run Graph",
    blurb: "Reusable engine graph — nodes, requirements, outcomes, cartridge marks",
    Scene: BoardScene,
    controlsHint: "drag to orbit · scroll to zoom · click a ◆ contract",
    purpose: "The cartridge's contracts as a dependency graph: what's available, what's locked by prerequisites, what's recorded. Best for planning the order of runs.",
    legend: NODE_LEGEND,
  },
  {
    id: "globe",
    label: "Planet",
    blurb: "3D world — for spatial arcs",
    Scene: PlanetScene,
    controlsHint: "drag to orbit · scroll to zoom · right-drag to pan · click a ◆ contract",
    purpose: "The same contracts placed in the world. Orbit to find a marker, select it to inspect readiness; the selected marker flags risk in place, and recorded contracts stay marked on the globe.",
    legend: NODE_LEGEND,
  },
];
