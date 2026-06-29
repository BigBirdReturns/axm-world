// Presentation registry. A "costume" is a view over the SAME cartridge/engine seam;
// the cartridge decides which costume serves its story. Adding a costume is one entry
// here — every cartridge can then wear it. Nothing about the engine changes.

import { WorldScreen } from "./WorldScreen.js";
import { BoardScreen } from "./board/BoardScreen.js";
import type { ArcInteraction } from "./useArcInteraction.js";
import type { ArcWorld } from "./useArcWorld.js";

export interface CostumeProps {
  world: ArcWorld;
  interaction: ArcInteraction;
  onExit?: () => void;
}

export interface Presentation {
  id: string;
  label: string;
  blurb: string;
  Component: (p: CostumeProps) => JSX.Element;
}

function BoardCostume({ world, interaction, onExit }: CostumeProps): JSX.Element {
  return <BoardScreen world={world} interaction={interaction} onExit={onExit} />;
}
function GlobeCostume({ world, interaction, onExit }: CostumeProps): JSX.Element {
  return <WorldScreen world={world} interaction={interaction} onExit={onExit} />;
}

export const PRESENTATIONS: Presentation[] = [
  { id: "board", label: "Run Graph", blurb: "Reusable engine graph — nodes, requirements, outcomes, cartridge marks", Component: BoardCostume },
  { id: "globe", label: "Planet", blurb: "3D world — for spatial arcs", Component: GlobeCostume },
];
