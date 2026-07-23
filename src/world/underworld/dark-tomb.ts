import type { Arc } from "../../engine/types.js";
import type { CartridgeStateValue } from "../../engine/abi13.js";
import type {
  DarkTombConsequence,
  DarkTombDelveBlueprint,
  DarkTombLayer,
  DarkTombPocketSource,
} from "../../dark-tomb/types.js";
import type { WorldNode } from "../contract.js";
import { inspectWorldSourcePlanes } from "../source-plane-inspection.js";

export type DarkTombWorldInspection =
  | { status: "none" }
  | { status: "invalid"; errors: string[] }
  | { status: "valid"; source: DarkTombPocketSource };

export interface UnderworldDelveView {
  source: DarkTombDelveBlueprint;
  node: WorldNode | null;
}

export interface UnderworldLayerView {
  source: DarkTombLayer;
  delves: UnderworldDelveView[];
  active: boolean;
  cleared: boolean;
}

export interface UnderworldInheritanceView {
  source: DarkTombConsequence;
  stateId: string;
  inherited: boolean;
}

export interface UnderworldView {
  source: DarkTombPocketSource;
  alarmPhase: string;
  signatureStatus: string;
  visibilityStatus: string;
  layers: UnderworldLayerView[];
  inherited: UnderworldInheritanceView[];
  hubChanged: boolean;
  availableChallengeId: string | null;
  clearedCount: number;
}

export function inspectDarkTombWorld(arc: Arc): DarkTombWorldInspection {
  const inspection = inspectWorldSourcePlanes(arc).known.find((entry) => entry.id === "dark-tomb-pocket");
  if (!inspection) return { status: "none" };
  if (inspection.status === "invalid" || inspection.source === undefined) {
    return { status: "invalid", errors: inspection.errors.length > 0 ? inspection.errors : ["The embedded Dark Tomb source is invalid."] };
  }
  return { status: "valid", source: inspection.source as DarkTombPocketSource };
}

export function consequenceStateId(consequence: DarkTombConsequence): string {
  return `consequence:${consequence.kind}:${consequence.id}`;
}

function stateString(state: Readonly<Record<string, CartridgeStateValue>>, id: string, fallback: string): string {
  const value = state[id];
  return typeof value === "string" ? value : fallback;
}

export function deriveUnderworldView(params: {
  source: DarkTombPocketSource;
  nodes: WorldNode[];
  cartridgeState: Readonly<Record<string, CartridgeStateValue>>;
  selectedChallengeId?: string | null;
}): UnderworldView {
  const { source, nodes, cartridgeState, selectedChallengeId } = params;
  const nodeByChallenge = new Map(nodes.map((node) => [node.challengeId, node]));
  const delvesByLayer = new Map<string, UnderworldDelveView[]>();
  for (const delve of source.delves) {
    const list = delvesByLayer.get(delve.layer) ?? [];
    list.push({ source: delve, node: nodeByChallenge.get(delve.id) ?? null });
    delvesByLayer.set(delve.layer, list);
  }

  const layers = source.anatomy.map((layer) => {
    const delves = delvesByLayer.get(layer.kind) ?? [];
    return {
      source: layer,
      delves,
      active: delves.some((entry) => entry.source.id === selectedChallengeId || entry.node?.status === "available"),
      cleared: delves.length > 0 && delves.every((entry) => entry.node?.status === "cleared"),
    };
  });

  const inherited = source.consequences.map((consequence) => {
    const stateId = consequenceStateId(consequence);
    return { source: consequence, stateId, inherited: cartridgeState[stateId] === true };
  });

  return {
    source,
    alarmPhase: stateString(cartridgeState, "alarm-phase", source.alarm.currentPhase),
    signatureStatus: stateString(cartridgeState, "signature-status", "credible"),
    visibilityStatus: stateString(cartridgeState, "visibility-status", "hidden"),
    layers,
    inherited,
    hubChanged: inherited.some((entry) => entry.inherited),
    availableChallengeId: nodes.find((node) => node.status === "available")?.challengeId ?? null,
    clearedCount: nodes.filter((node) => node.status === "cleared").length,
  };
}
