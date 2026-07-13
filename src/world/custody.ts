import type { Arc, Organization } from "../engine/types.js";
import type { Cartridge } from "./cartridge.js";
import type { WorldNode } from "./contract.js";
import type { Ledger } from "./ledger.js";
import { deriveWorldTransformations, type WorldTransformation } from "./world-state.js";

export interface CustodyObject {
  format: "axm-cartridge-run/v2";
  manifest: Cartridge["manifest"];
  arc: Arc;
  runState: {
    cycle: number;
    openingChoice: string | null;
    clearedCount: number;
    totalNodes: number;
    roster: Array<{ name: string; morale: number; stress: number }>;
    /** Readable durable location mutations. Derived from restored engine state
     * and its ledger, so export and reload agree on what the world remembers. */
    transformedLocations: WorldTransformation[];
  };
  ledger: Ledger;
}

/** Pure custody boundary used by the UI download and deterministic acceptance
 * tests. JSON round-tripping this value is the actual export contract. */
export function buildCustodyObject(params: {
  cartridge: Cartridge;
  org: Organization;
  openingChoice: string | null;
  nodes: readonly WorldNode[];
  ledger: Ledger;
}): CustodyObject {
  const clearedCount = params.nodes.filter((node) => node.status === "cleared").length;
  return {
    format: "axm-cartridge-run/v2",
    manifest: params.cartridge.manifest,
    arc: params.cartridge.arc,
    runState: {
      cycle: params.org.cycle,
      openingChoice: params.openingChoice,
      clearedCount,
      totalNodes: params.nodes.length,
      roster: Object.values(params.org.agents).map((agent) => ({
        name: agent.name,
        morale: Math.round(agent.morale),
        stress: Math.round(agent.stress),
      })),
      transformedLocations: deriveWorldTransformations(params.nodes, params.ledger),
    },
    ledger: params.ledger,
  };
}
