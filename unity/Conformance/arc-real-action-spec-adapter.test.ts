import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { FIRST_CHARTER } from "../../src/arcs/first-charter.js";
import { compileActionEncounter } from "../../src/engine/action/compile.js";
import { actionSeed } from "../../src/engine/action/receipt.js";

const outputPath = process.env.AXM_REAL_ACTION_SPEC_OUT;
const ORG_SEED = 20_775;
const CYCLE = 4;
const CONTROLLED_AGENT_ID = "real-cartridge-player";

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing ${name}.`);
  return resolve(value);
}

describe("real Arc action-spec adapter", () => {
  it("compiles one bundled First Charter challenge through the exact Arc API", () => {
    const destination = required(outputPath, "AXM_REAL_ACTION_SPEC_OUT");
    const challenge = FIRST_CHARTER.challenges.find((value) => value.mechanicChecks.length > 0)
      ?? FIRST_CHARTER.challenges[0];
    expect(challenge).toBeTruthy();

    const spec = compileActionEncounter(FIRST_CHARTER, challenge, null);
    const seed = actionSeed(ORG_SEED, CYCLE, challenge.id, null);
    expect(spec.format).toBe("axm-action-spec/1");
    expect(spec.arcDigest).toMatch(/^cart1_[0-9a-f]{64}$/);
    expect(spec.challengeId).toBe(challenge.id);
    expect(spec.specDigest).toMatch(/^actspec1_[0-9a-f]{64}$/);
    expect(spec.tickRate).toBe(30);

    const execution = {
      orgSeed: ORG_SEED,
      cycle: CYCLE,
      seed,
      controlledAgentId: CONTROLLED_AGENT_ID,
      partyAgentIds: [CONTROLLED_AGENT_ID],
    };
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, JSON.stringify(spec, null, 2) + "\n");
    writeFileSync(destination + ".receipt.json", JSON.stringify({
      format: "rodoh-real-action-spec-adapter/2",
      status: "pass",
      arcActionAuthorityCommit: process.env.ARC_ACTION_AUTHORITY_SHA ?? "unknown",
      arcExport: "FIRST_CHARTER",
      arcId: FIRST_CHARTER.meta.id,
      arcDigest: spec.arcDigest,
      challengeId: challenge.id,
      compiler: "compileActionEncounter",
      compilerInvocation: "FIRST_CHARTER, challenge, null",
      profileSource: "Arc-owned generic compiler or axm.action@1 extension",
      actionSpecDigest: spec.specDigest,
      tickRate: spec.tickRate,
      execution,
    }, null, 2) + "\n");
  });
});
