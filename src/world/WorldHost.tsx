import type { Cartridge } from "./cartridge.js";
import { useArcWorld } from "./useArcWorld.js";
import { ExperienceHost } from "./experience/ExperienceHost.js";

export interface WorldHostProps {
  cartridge: Cartridge;
  onExit: () => void;
}

export function WorldHost({ cartridge, onExit }: WorldHostProps): JSX.Element {
  const world = useArcWorld(cartridge);
  return <ExperienceHost world={world} onExit={onExit} />;
}
