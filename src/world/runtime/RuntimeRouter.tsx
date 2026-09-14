import type { WorldHostProps } from "../WorldHost.js";
import { useArcWorld } from "../useArcWorld.js";
import { SequenceHost } from "../sequence/SequenceHost.js";
import { SimulationRuntime } from "./SimulationRuntime.js";
import { StrategyBoardRuntime } from "./StrategyBoardRuntime.js";
import { RuntimeRefusal } from "./RuntimeRefusal.js";
import { resolveRuntimeHost, type RuntimeSelection } from "./host-registry.js";

// Retain the public helper for existing callers; memory is simulation-specific.
export { initialRuntimeMemory } from "./SimulationRuntime.js";

function SimulationHost({ cartridge, onExit }: WorldHostProps): JSX.Element {
  const world = useArcWorld(cartridge);
  return <SimulationRuntime world={world} onExit={onExit} />;
}

type SelectedHostProps = WorldHostProps & { selection: RuntimeSelection };

const HOSTS = {
  simulation: SimulationHost,
  "canonical-story": ({ selection, ...props }: SelectedHostProps) => {
    if (selection.host !== "canonical-story") throw new Error("Incompatible runtime host selection.");
    return <SequenceHost {...props} story={selection.story} timedMedia={selection.timedMedia} />;
  },
  "strategy-board": ({ selection, cartridge, onExit }: SelectedHostProps) => {
    if (selection.host !== "strategy-board") throw new Error("Incompatible runtime host selection.");
    return <StrategyBoardRuntime arc={cartridge.arc} program={selection.program} driver={selection.driver} onExit={onExit} />;
  },
} satisfies Record<RuntimeSelection["host"], (props: SelectedHostProps) => JSX.Element>;

/** Generic dispatch owns no simulation state, story cursor, or adjudication. */
export function RuntimeRouter(props: WorldHostProps): JSX.Element {
  const result = resolveRuntimeHost(props.cartridge.arc);
  if (!result.ok) return <RuntimeRefusal {...result.refusal} onExit={props.onExit} />;
  const Host = HOSTS[result.selection.host];
  return <Host {...props} selection={result.selection} />;
}
