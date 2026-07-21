// Composition root for a playing cartridge. One ArcWorld is created once and
// survives the guided opening -> reusable Rodoh runtime handoff.

import type { Cartridge } from "./cartridge.js";
import { useArcWorld } from "./useArcWorld.js";
import { RuntimeRouter } from "./runtime/RuntimeRouter.js";

export interface WorldHostProps {
  cartridge: Cartridge;
  onExit: () => void;
}

export function WorldHost({ cartridge, onExit }: WorldHostProps): JSX.Element {
  const world = useArcWorld(cartridge);
  return <RuntimeRouter world={world} onExit={onExit} />;
}
