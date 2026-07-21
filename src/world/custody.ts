// Compatibility facade for the historical World custody helper. The canonical
// export is now axm-cartridge-run/v3 from the shared engine contract.

import type { Organization } from "../engine/types.js";
import type { Cartridge } from "./cartridge.js";
import type { WorldNode } from "./contract.js";
import type { Ledger } from "./ledger.js";
import { buildRodohPortableRun } from "./portable-run.js";
import type { PortableRunV3 } from "../engine/portable-run.js";

export type CustodyObject = PortableRunV3;

export function buildCustodyObject(params: {
  cartridge: Cartridge;
  org: Organization;
  openingChoice: string | null;
  openingChoiceId?: string | null;
  nodes: readonly WorldNode[];
  ledger: Ledger;
}): CustodyObject {
  void params.nodes; // world mutations are represented by the ledger extension.
  return buildRodohPortableRun({
    cartridge: params.cartridge,
    org: params.org,
    extensions: {},
    ledger: params.ledger,
    openingChoice: params.openingChoice,
    openingChoiceId: params.openingChoiceId ?? null,
  });
}
