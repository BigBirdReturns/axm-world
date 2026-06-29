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
}

export interface Representation {
  id: CostumeId;
  label: string;
  blurb: string;
  /** Renders only the scene; fills the active-representation region. */
  Scene: (p: SceneProps) => JSX.Element;
  /** Shell-rendered hint for how to manipulate this representation. */
  controlsHint: string;
}

export const PRESENTATIONS: Representation[] = [
  {
    id: "board",
    label: "Run Graph",
    blurb: "Reusable engine graph — nodes, requirements, outcomes, cartridge marks",
    Scene: BoardScene,
    controlsHint: "drag to orbit · scroll to zoom · click a ◆ contract",
  },
  {
    id: "globe",
    label: "Planet",
    blurb: "3D world — for spatial arcs",
    Scene: PlanetScene,
    controlsHint: "drag to orbit · scroll to zoom · right-drag to pan · click a ◆ contract",
  },
];
