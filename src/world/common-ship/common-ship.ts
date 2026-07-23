import type { Arc } from "../../engine/types.js";
import type { CartridgeStateValue } from "../../engine/abi13.js";
import type {
  CommonShipCastMemberV2,
  CommonShipEmbodimentProfile,
  CommonShipPocketSourceV2,
  CommonShipWatchBlueprintV2,
} from "../../common-ship/embodiment.js";
import type { ShipStateTrack } from "../../common-ship/types.js";
import type { WorldNode } from "../contract.js";
import { inspectWorldSourcePlanes } from "../source-plane-inspection.js";

export type CommonShipWorldInspection =
  | { status: "none" }
  | { status: "invalid"; errors: string[] }
  | { status: "valid"; source: CommonShipPocketSourceV2 };

export interface CommonShipProfileView {
  source: CommonShipEmbodimentProfile;
  cast: CommonShipCastMemberV2[];
}

export interface CommonShipWatchView {
  source: CommonShipWatchBlueprintV2;
  node: WorldNode | null;
  active: boolean;
  cleared: boolean;
}

export interface CommonShipStateView {
  source: ShipStateTrack;
  value: number;
  changed: boolean;
}

export interface CommonShipView {
  source: CommonShipPocketSourceV2;
  profiles: CommonShipProfileView[];
  watches: CommonShipWatchView[];
  shipState: CommonShipStateView[];
  selectedWatchId: string | null;
  availableChallengeId: string | null;
  clearedCount: number;
  hasChangedState: boolean;
}

/**
 * World may recognize and project a registered Common Ship source. It does not
 * compile the source or resolve Common Watch constraints.
 */
export function inspectCommonShipWorld(arc: Arc): CommonShipWorldInspection {
  const inspection = inspectWorldSourcePlanes(arc).known.find((entry) => entry.id === "common-ship-pocket");
  if (!inspection) return { status: "none" };
  if (inspection.status === "invalid" || inspection.source === undefined) {
    return {
      status: "invalid",
      errors: inspection.errors.length > 0
        ? inspection.errors
        : ["The embedded Common Ship source is invalid."],
    };
  }
  return { status: "valid", source: inspection.source as CommonShipPocketSourceV2 };
}

function stateNumber(
  state: Readonly<Record<string, CartridgeStateValue>>,
  id: string,
  fallback: number,
): number {
  const value = state[id];
  return typeof value === "number" ? value : fallback;
}

/**
 * Derive a display model from creator source, Arc-owned challenge status, and
 * engine-owned cartridge state. This function intentionally does not recompute
 * role coverage, temporal overlap, habitat compatibility, translation
 * resilience, handoff continuity, or life-fraction fairness.
 */
export function deriveCommonShipView(params: {
  source: CommonShipPocketSourceV2;
  nodes: WorldNode[];
  cartridgeState: Readonly<Record<string, CartridgeStateValue>>;
  selectedChallengeId?: string | null;
}): CommonShipView {
  const { source, nodes, cartridgeState, selectedChallengeId = null } = params;
  const nodeByChallenge = new Map(nodes.map((node) => [node.challengeId, node]));

  const profiles = source.embodimentProfiles.map((profile) => ({
    source: profile,
    cast: source.cast.filter((member) => member.profileId === profile.id),
  }));

  const watches = source.watches.map((watch) => {
    const node = nodeByChallenge.get(watch.id) ?? null;
    return {
      source: watch,
      node,
      active: watch.id === selectedChallengeId || node?.status === "available",
      cleared: node?.status === "cleared",
    };
  });

  const shipState = source.shipState.map((track) => {
    const value = stateNumber(cartridgeState, track.kind, track.value);
    return { source: track, value, changed: value !== track.value };
  });

  return {
    source,
    profiles,
    watches,
    shipState,
    selectedWatchId: selectedChallengeId,
    availableChallengeId: nodes.find((node) => node.status === "available")?.challengeId ?? null,
    clearedCount: nodes.filter((node) => node.status === "cleared").length,
    hasChangedState: shipState.some((track) => track.changed),
  };
}
