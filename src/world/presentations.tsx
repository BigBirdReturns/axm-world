// Presentation registry. A "costume" is a view over the SAME cartridge/engine seam;
// the cartridge decides which costume serves its story. Adding a costume is one entry
// here — every cartridge can then wear it. Nothing about the engine changes.

import { WorldScreen } from "./WorldScreen.js";
import { BoardScreen } from "./board/BoardScreen.js";
import type { Cartridge } from "./cartridge.js";

export interface CostumeProps {
  cartridge: Cartridge;
  onExit?: () => void;
}

export interface Presentation {
  id: string;
  label: string;
  blurb: string;
  Component: (p: CostumeProps) => JSX.Element;
}

function BoardCostume({ cartridge, onExit }: CostumeProps): JSX.Element {
  return <BoardScreen cartridge={cartridge} onExit={onExit} />;
}
function GlobeCostume({ cartridge, onExit }: CostumeProps): JSX.Element {
  return <WorldScreen cartridge={cartridge} onExit={onExit} />;
}

export const PRESENTATIONS: Presentation[] = [
  { id: "board", label: "Charter Board", blurb: "2.5D diorama — best for management arcs", Component: BoardCostume },
  { id: "globe", label: "Planet", blurb: "3D world — for spatial arcs", Component: GlobeCostume },
];
