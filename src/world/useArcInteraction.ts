// Shared selection + party + gated-run logic for any presentation (globe, board,
// 2D map). A costume just renders these values; the rules live here once. Reused by
// WorldScreen and BoardScreen so no presentation re-derives the interaction model.

import { useCallback, useEffect, useState } from "react";
import type { ArcWorld, ChallengeReq } from "./useArcWorld.js";
import type { WorldNode } from "./contract.js";

export interface ArcInteraction {
  selectedId: string | null;
  select: (challengeId: string | null) => void;
  party: string[];
  toggleAgent: (id: string) => void;
  selected: WorldNode | null;
  req: ChallengeReq | null;
  canRun: boolean;
  run: () => void;
}

export function useArcInteraction(world: ArcWorld): ArcInteraction {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [party, setParty] = useState<string[]>([]);

  // When the player picks a different contract, seed the party with the engine's
  // recommendation; they can then add/remove members.
  useEffect(() => {
    setParty(selectedId ? world.recommendedParty(selectedId) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const toggleAgent = useCallback(
    (id: string) => {
      setParty((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        const max = selectedId ? world.reqFor(selectedId).maxAgents : 0;
        if (prev.length >= max) return prev;
        return [...prev, id];
      });
    },
    [selectedId, world],
  );

  const selected = selectedId ? world.nodes.find((n) => n.challengeId === selectedId) ?? null : null;
  const req = selectedId ? world.reqFor(selectedId) : null;
  const canRun =
    selected !== null &&
    selected.status === "available" &&
    req !== null &&
    party.length >= req.minAgents &&
    party.length <= req.maxAgents;

  const run = useCallback(() => {
    if (selectedId) world.runChallenge(selectedId, party);
  }, [selectedId, party, world]);

  return { selectedId, select: setSelectedId, party, toggleAgent, selected, req, canRun, run };
}
