import { useEffect, useMemo, useState } from "react";
import type { Agent, Arc, Facility, InfrastructureFacility, Organization, RunReport } from "../../engine/types.js";
import { runCycle } from "../../engine/cycle.js";
import {
  FIRST_CHARTER_STARTING_RELATIONSHIPS,
  FIRST_CHARTER_STARTING_ROSTER,
} from "../../arcs/index.js";
import {
  buildPlayAssignment,
  compileArcToPlayScene,
  recommendAgentsForChallenge,
  summarizeReport,
} from "../../play-pipeline/compile.js";
import { applyAgentDowntime, type DowntimeAction } from "./agent-management.js";

function defaultFacilities(): Record<InfrastructureFacility, Facility> {
  const names: InfrastructureFacility[] = [
    "Quarters", "Production", "Recreation", "Research", "Training", "Storage", "Medical",
  ];
  const out: Partial<Record<InfrastructureFacility, Facility>> = {};
  for (const n of names) {
    out[n] = { type: n, level: n === "Quarters" || n === "Recreation" ? 1 : 0, assignedAgents: [] };
  }
  return out as Record<InfrastructureFacility, Facility>;
}

export function buildPlayableDemoOrg(): Organization {
  const agents: Record<string, Agent> = {};
  for (const agent of FIRST_CHARTER_STARTING_ROSTER) agents[agent.id] = { ...agent };
  return {
    id: "play-pipeline-demo",
    name: "Playable Demo Charter",
    reputation: 0,
    resources: { currency: 100, materials: 0, tokens: 2 },
    infrastructure: defaultFacilities(),
    agents,
    relationships: [...FIRST_CHARTER_STARTING_RELATIONSHIPS],
    precedents: [],
    dramaQueue: [],
    cycle: 0,
    distributionPolicy: "council",
    rngSeed: 424242,
  };
}

export function usePlayableArc(arc: Arc) {
  const [org, setOrg] = useState<Organization>(() => buildPlayableDemoOrg());
  const scene = useMemo(() => compileArcToPlayScene(arc, org), [arc, org]);
  const firstAvailable = scene.nodes.find((node) => node.status === "available") ?? scene.nodes[0];
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(firstAvailable?.challengeId ?? null);
  const [reports, setReports] = useState<RunReport[]>([]);

  const selectedChallenge = arc.challenges.find((challenge) => challenge.id === selectedChallengeId) ?? arc.challenges[0];
  const selectedNode = scene.nodes.find((node) => node.challengeId === selectedChallenge?.id);
  const recommendedAgents = selectedChallenge ? recommendAgentsForChallenge(selectedChallenge, org, arc) : [];
  const [selectedAgents, setSelectedAgents] = useState<string[]>(recommendedAgents);
  const selectedLocked = selectedNode?.status === "locked";
  const lastView = reports[0] ? summarizeReport(reports[0], arc) : null;
  const minAgents = selectedChallenge?.rosterRequirements.minAgents ?? 0;
  const maxAgents = selectedChallenge?.rosterRequirements.maxAgents ?? 0;
  const canRun = !selectedLocked && selectedAgents.length >= minAgents && selectedAgents.length <= maxAgents;

  useEffect(() => {
    setSelectedAgents(recommendedAgents);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChallengeId, org.cycle]);

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) => {
      if (prev.includes(id)) return prev.filter((agentId) => agentId !== id);
      if (prev.length >= maxAgents) return prev;
      return [...prev, id];
    });
  };

  const applyDowntime = (agentId: string, action: DowntimeAction) => {
    setOrg((current) => applyAgentDowntime(current, agentId, action));
  };

  const runSelectedChallenge = () => {
    if (!selectedChallenge || !canRun) return;
    const assignment = buildPlayAssignment(selectedChallenge, org, arc);
    const result = runCycle({
      org,
      arc,
      assignments: [{ ...assignment, agentIds: selectedAgents }],
    });
    setOrg(result.org);
    setReports(result.reports);
  };

  return {
    org,
    scene,
    reports,
    selectedChallengeId,
    setSelectedChallengeId,
    selectedChallenge,
    selectedNode,
    selectedAgents,
    selectedLocked,
    lastView,
    minAgents,
    maxAgents,
    canRun,
    toggleAgent,
    applyDowntime,
    runSelectedChallenge,
  };
}
