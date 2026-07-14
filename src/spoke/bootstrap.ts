// Compatibility facade for older World callers. Founding policy no longer
// lives in the spoke: every result delegates to Arc's canonical transition.

import type { Agent, Arc, Organization } from "../engine/types.js";
import { defaultFoundingInput, foundOrganization } from "../engine/founding.js";

export interface BootstrapOptions {
  /** Exact founding input seed. */
  seed?: number;
  /** Deprecated no-ops retained only for source compatibility. Canonical Arc
   * founding/fallback law determines these values. */
  rosterSize?: number;
  roleFloor?: Record<string, number>;
  startingCurrency?: number;
  startingTokens?: number;
}

function found(arc: Arc, opts: BootstrapOptions): Organization {
  const input = opts.seed === undefined
    ? defaultFoundingInput(arc)
    : { format: "axm-founding-input/1" as const, seed: opts.seed };
  return foundOrganization(arc, input);
}

/** @deprecated Use `foundOrganization` from the vendored engine. */
export function bootstrapOrg(arc: Arc, opts: BootstrapOptions = {}): Organization {
  return found(arc, opts);
}

/** @deprecated Use `Object.values(foundOrganization(arc).agents)`. */
export function bootstrapRoster(arc: Arc, opts: BootstrapOptions = {}): Agent[] {
  return Object.values(found(arc, opts).agents);
}
