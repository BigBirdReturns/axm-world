// Difficulty-mode choice — the SECOND encounter-agency type. It must appear only
// when the cartridge authors the lever (difficultyModes), recompile the encounter
// under the chosen posture, and shift the projection — all through the same
// applyDifficultyMode transform the resolver uses. First Charter authors no modes,
// so its encounters (The Cellar included) stay fixed. The Waking Tower authors Heroic.

import { describe, expect, it } from "vitest";
import { FIRST_CHARTER, KARAZHAN } from "../../src/arcs/index.js";
import { bootstrapOrg } from "../../src/spoke/bootstrap.js";
import { applyDifficultyMode } from "../../src/engine/difficulty.js";
import { compileEncounter } from "../../src/world/encounter/compile-encounter.js";
import { evaluateParty } from "../../src/world/readiness.js";
import { recommendAgentsForChallenge } from "../../src/play-pipeline/compile.js";
import { BUNDLED_CARTRIDGES } from "../../src/world/cartridge.js";

const heroic = KARAZHAN.difficultyModes[0]!;
const attumen = KARAZHAN.challenges.find((c) => c.id === "attumen")!;

describe("difficulty-mode choice is a property of the authored contract", () => {
  it("the lever exists only where authored — and Karazhan is reachable as a bundled game", () => {
    expect(FIRST_CHARTER.difficultyModes).toHaveLength(0); // fixed: no posture choice
    expect(KARAZHAN.difficultyModes.length).toBeGreaterThan(0); // authored lever
    // The proof is reachable live: The Waking Tower is now a bundled world cartridge.
    expect(BUNDLED_CARTRIDGES.some((c) => c.arc.meta.id === KARAZHAN.meta.id)).toBe(true);
  });

  it("choosing the posture recompiles the encounter — harder objectives, added mechanics", () => {
    const org = bootstrapOrg(KARAZHAN);
    const base = compileEncounter(attumen, org, KARAZHAN);
    const heroicSpec = compileEncounter(applyDifficultyMode(attumen, heroic), org, KARAZHAN);

    // Heroic authors an extra mechanic → an extra objective in the compiled encounter.
    expect(heroicSpec.objectives.length).toBeGreaterThan(base.objectives.length);

    // A shared objective's target rises under the 1.3x posture — the reach the
    // player must beat is genuinely higher, not cosmetic.
    const baseCharge = base.objectives.find((o) => o.id === "attumen-charge")!;
    const heroicCharge = heroicSpec.objectives.find((o) => o.id === "attumen-charge")!;
    expect(heroicCharge.targetThreshold).toBeGreaterThan(baseCharge.targetThreshold);
  });

  it("the projection shifts before commit — same squad, harder posture, lower margin", () => {
    const org = bootstrapOrg(KARAZHAN);
    const party = recommendAgentsForChallenge(attumen, org, KARAZHAN).map((id) => org.agents[id]!);

    const baseR = evaluateParty(attumen, party, KARAZHAN);
    const heroicR = evaluateParty(applyDifficultyMode(attumen, heroic), party, KARAZHAN);

    const baseCharge = baseR.checks.find((c) => c.id === "attumen-charge")!;
    const heroicCharge = heroicR.checks.find((c) => c.id === "attumen-charge")!;

    // Higher threshold, same squad → strictly less margin. The choice reaches the
    // engine-faithful projection before the player commits.
    expect(heroicCharge.threshold).toBeGreaterThan(baseCharge.threshold);
    expect(heroicCharge.margin).toBeLessThan(baseCharge.margin);
  });

  it("a fixed cartridge is untouched: applying a mode it never authored is a no-op", () => {
    // First Charter authors no modes, so the shell never offers one — but even if a
    // stray id arrived, there is no mode to apply. The Cellar stays exactly fixed.
    const org = bootstrapOrg(FIRST_CHARTER);
    const cellar = FIRST_CHARTER.challenges.find((c) => c.id === "cellar")!;
    const spec = compileEncounter(cellar, org, FIRST_CHARTER);
    expect(spec.objectives).toHaveLength(cellar.mechanicChecks.length);
    expect(FIRST_CHARTER.difficultyModes.find((m) => m.id === "heroic")).toBeUndefined();
  });
});
