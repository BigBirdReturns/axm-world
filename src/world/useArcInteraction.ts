// Shared selection + party + gated-run logic for any presentation (globe, board,
// 2D map). A costume just renders these values; the rules live here once. Reused by
// WorldScreen and BoardScreen so no presentation re-derives the interaction model.

import { useCallback, useEffect, useState } from "react";
import type { ArcWorld, ChallengeReq } from "./useArcWorld.js";
import type { WorldNode } from "./contract.js";

export function firstAvailableNodeId(nodes: Pick<WorldNode, "challengeId" | "status">[], excludeId?: string | null): string | null {
  return nodes.find((node) => node.status === "available" && node.challengeId !== excludeId)?.challengeId ?? null;
}

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

  const selected = selectedId ? world.nodes.find((n) => n.challengeId === selectedId) ?? null : null;

  // Cold start: focus the first actionable engine node once blocking decisions are
  // resolved. After a run records the selected node, advance focus to the next
  // available node while the graph still highlights what changed.
  useEffect(() => {
    if (world.pendingDecision) return;
    if (!selectedId) {
      const next = firstAvailableNodeId(world.nodes);
      if (next) setSelectedId(next);
      return;
    }
    if (world.lastReport?.challengeId === selectedId && selected?.status === "cleared") {
      const next = firstAvailableNodeId(world.nodes, selectedId);
      if (next) setSelectedId(next);
    }
  }, [selected?.status, selectedId, world.lastReport?.challengeId, world.nodes, world.pendingDecision]);

  // When focus moves to a different node, seed the party with the engine's
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
