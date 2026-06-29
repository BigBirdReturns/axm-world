// Composition root for a playing cartridge: builds the engine seam (useArcWorld) and
// the shared interaction model (useArcInteraction), then hands them to the one Shell.
// All layout, regions, costume choice, and chrome live in the Shell — this file only
// wires data to it.

import { Shell } from "./shell/Shell.js";
import type { Cartridge } from "./cartridge.js";
import { useArcWorld } from "./useArcWorld.js";
import { useArcInteraction } from "./useArcInteraction.js";

export interface WorldHostProps {
  cartridge: Cartridge;
  onExit: () => void;
}

export function WorldHost({ cartridge, onExit }: WorldHostProps): JSX.Element {
  const world = useArcWorld(cartridge);
  const interaction = useArcInteraction(world);
  return <Shell world={world} interaction={interaction} onExit={onExit} />;
}
