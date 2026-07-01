// Shared selection + party + gated-run logic for any presentation (globe, board,
// 2D map). A costume just renders these values; the rules live here once. Reused by
// WorldScreen and BoardScreen so no presentation re-derives the interaction model.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ArcWorld, ChallengeReq } from "./useArcWorld.js";
import type { WorldNode } from "./contract.js";
import type { ContractRequirements, FixSuggestion, PartyReadiness } from "./readiness.js";

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
  /** Structured requirements for the selected contract (null when none selected). */
  contract: ContractRequirements | null;
  /** Faithful projection of the resolver for the current selection + party. */
  readiness: PartyReadiness | null;
  /** Why the recommended party is recommended (selected contract). */
  recommendation: string | null;
  /** Actionable ways to recover from weak/invalid readiness. */
  fixPlan: FixSuggestion[] | null;
  applyFix: (fix: FixSuggestion) => void;
}

export function useArcInteraction(world: ArcWorld): ArcInteraction {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [party, setParty] = useState<string[]>([]);

  const selected = selectedId ? world.nodes.find((n) => n.challengeId === selectedId) ?? null : null;

  // Cold start: focus the first actionable engine node once blocking decisions are
  // resolved — but only once. An explicit deselect (select(null)) must stick, so the
  // roster can answer "who exists" instead of "who do I send" when nothing is chosen.
  // After a run records the selected node, advance focus to the next available node
  // while the graph still highlights what changed.
  const coldStartDone = useRef(false);
  useEffect(() => {
    if (world.pendingDecision) return;
    if (!selectedId) {
      if (coldStartDone.current) return;
      const next = firstAvailableNodeId(world.nodes);
      if (next) {
        setSelectedId(next);
        coldStartDone.current = true;
      }
      return;
    }
    coldStartDone.current = true;
    if (world.lastReport?.challengeId === selectedId && selected?.status === "cleared") {
      const next = firstAvailableNodeId(world.nodes, selectedId);
      if (next) setSelectedId(next);
    }
  }, [selected?.status, selectedId, world.lastReport?.challengeId, world.nodes, world.pendingDecision]);

  // When focus moves to a different node, seed the party with the engine's
  // recommendation; they can then add/remove members.
  useEffect(() => {
    if (!selectedId) {
      setParty([]);
      return;
    }
    const node = world.nodes.find((item) => item.challengeId === selectedId);
    setParty(node?.status === "available" ? world.recommendedParty(selectedId) : []);
    // Seed only when focus changes. Do not wipe manual roster edits on every world/state update.
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

  const applyFix = useCallback(
    (fix: FixSuggestion) => {
      if (fix.kind === "add-agent") {
        setParty((prev) => {
          if (prev.includes(fix.agentId)) return prev;
          const max = selectedId ? world.reqFor(selectedId).maxAgents : 0;
          if (prev.length >= max) return prev;
          return [...prev, fix.agentId];
        });
        return;
      }

      if (fix.kind === "swap-agent") {
        setParty((prev) => {
          const without = prev.filter((id) => id !== fix.removeAgentId && id !== fix.addAgentId);
          return [...without, fix.addAgentId];
        });
        return;
      }

      if (fix.kind === "downtime") {
        world.applyDowntime(fix.agentId, fix.action);
      }
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

  const contract = useMemo(
    () => (selectedId ? world.describeContract(selectedId) : null),
    [selectedId, world],
  );
  const readiness = useMemo(
    () => (selectedId ? world.evaluateParty(selectedId, party) : null),
    [selectedId, party, world],
  );
  const recommendation = useMemo(
    () => (selectedId ? world.recommendationFor(selectedId) : null),
    [selectedId, world],
  );
  const fixPlan = useMemo(
    () => (selectedId ? world.fixPlanFor(selectedId, party) : null),
    [selectedId, party, world],
  );

  return { selectedId, select: setSelectedId, party, toggleAgent, selected, req, canRun, run, contract, readiness, recommendation, fixPlan, applyFix };
}
