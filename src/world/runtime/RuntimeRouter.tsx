import { useCallback, useMemo, useState } from "react";
import type { ArcWorld } from "../useArcWorld.js";
import { useArcInteraction } from "../useArcInteraction.js";
import { ExperienceHost } from "../experience/ExperienceHost.js";
import { Shell } from "../shell/Shell.js";
import { isCostumeId, loadCostume, type CostumeId } from "../presentation-prefs.js";
import { programForCartridge } from "../program-of-record.js";
import {
  RODOH_RUNTIME_EXTENSION,
  rodohRuntimeExtensionValue,
  rodohRuntimeMemory,
  type RodohRuntimeMemory,
} from "../portable-run.js";

interface Props {
  world: ArcWorld;
  onExit: () => void;
}

export function initialRuntimeMemory(world: ArcWorld): RodohRuntimeMemory {
  const restored = rodohRuntimeMemory(world.extensions);
  if (restored) return restored;
  const preferred = world.cartridge.manifest.preferredCostume;
  const representation: CostumeId = isCostumeId(preferred) ? preferred : loadCostume(world.arc);
  // Entry direction is presentation metadata bound to the cartridge's computed
  // authored identity. A same-id import cannot inherit Program 001 direction.
  const program = programForCartridge(world.cartridge);
  const guided = program?.entryExperience === "guided-first-contract"
    && world.ledger.entries.length === 0
    && !world.arcComplete;
  return { version: 1, mode: guided ? "guided" : "shell", representation };
}

function ShellRuntime(props: {
  world: ArcWorld;
  onExit: () => void;
  memory: RodohRuntimeMemory;
  onRepresentationChange: (id: CostumeId) => void;
}): JSX.Element {
  const interaction = useArcInteraction(props.world);
  return (
    <Shell
      world={props.world}
      interaction={interaction}
      onExit={props.onExit}
      initialCostumeId={props.memory.representation}
      onCostumeChange={props.onRepresentationChange}
    />
  );
}

/** Composition root for one continuing run. The guided opening teaches the
 * object; the reusable shell then carries the same ArcWorld through every
 * representation and the remainder of the campaign. */
export function RuntimeRouter({ world, onExit }: Props): JSX.Element {
  const initial = useMemo(() => initialRuntimeMemory(world), [world.cartridgeDigest]);
  const [memory, setMemory] = useState<RodohRuntimeMemory>(initial);

  const commitMemory = useCallback((next: RodohRuntimeMemory) => {
    setMemory(next);
    world.setExtension(RODOH_RUNTIME_EXTENSION, rodohRuntimeExtensionValue(next));
  }, [world]);

  const enterShell = useCallback(() => {
    commitMemory({ version: 1, mode: "shell", representation: "hall" });
  }, [commitMemory]);

  const changeRepresentation = useCallback((representation: CostumeId) => {
    commitMemory({ version: 1, mode: "shell", representation });
  }, [commitMemory]);

  if (memory.mode === "guided") {
    return <ExperienceHost world={world} onExit={onExit} onEnterRuntime={enterShell} />;
  }

  return (
    <ShellRuntime
      world={world}
      onExit={onExit}
      memory={memory}
      onRepresentationChange={changeRepresentation}
    />
  );
}
