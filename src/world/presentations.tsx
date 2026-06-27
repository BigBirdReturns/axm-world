// Presentation registry. A "costume" is a view over the SAME arc/engine seam; the
// arc decides which costume serves its story. Adding a new costume is adding one
// entry here — every arc can then wear it. Nothing about the engine changes.

import type { Arc } from "../engine/types.js";
import { WorldScreen } from "./WorldScreen.js";
import { BoardScreen } from "./board/BoardScreen.js";
import { ArcPlayDemo } from "../game/components/ArcPlayDemo.js";

export interface CostumeProps {
  arc: Arc;
  onExit?: () => void;
}

export interface Presentation {
  id: string;
  label: string;
  blurb: string;
  Component: (p: CostumeProps) => JSX.Element;
}

function BoardCostume({ arc, onExit }: CostumeProps): JSX.Element {
  return <BoardScreen arc={arc} onExit={onExit} />;
}
function GlobeCostume({ arc, onExit }: CostumeProps): JSX.Element {
  return <WorldScreen arc={arc} onExit={onExit} />;
}
function MapCostume({ arc, onExit }: CostumeProps): JSX.Element {
  return <ArcPlayDemo arc={arc} onBack={onExit ?? (() => {})} />;
}

export const PRESENTATIONS: Presentation[] = [
  { id: "board", label: "Charter Board", blurb: "2.5D diorama — best for management arcs", Component: BoardCostume },
  { id: "globe", label: "Planet", blurb: "3D world — for spatial arcs", Component: GlobeCostume },
  { id: "map", label: "Flat Map", blurb: "2D — fast & story-forward", Component: MapCostume },
];
