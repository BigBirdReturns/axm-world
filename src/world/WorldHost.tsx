// Composition root: select a compatible host before creating any run state.
import { RuntimeRouter } from "./runtime/RuntimeRouter.js";
import type { Cartridge } from "./cartridge.js";

export interface WorldHostProps {
  cartridge: Cartridge;
  onExit: () => void;
  apertureDaemonProjection?: unknown;
}

export function WorldHost(props: WorldHostProps): JSX.Element {
  return <RuntimeRouter {...props} />;
}
