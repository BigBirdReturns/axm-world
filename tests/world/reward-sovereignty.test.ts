import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("reward sovereignty", () => {
  it("routes the receiver's choice through Arc law rather than awarding an item directly", () => {
    const bridge = read("src/world/useArcWorld.ts");
    expect(bridge).toContain('import { resolvePendingRewardChoice } from "../engine/rewards.js"');
    expect(bridge).toContain("const resolution = resolvePendingRewardChoice(org, arc, choice, agentId)");
    expect(bridge).not.toContain("awardItem(");
  });

  it("keeps the reward unresolved until the operator selects an eligible founder", () => {
    const experience = read("src/world/experience/ExperienceHost.tsx");
    expect(experience).toContain('data-testid="reward-choice"');
    expect(experience).toContain("disabled={receiptLoot.length > 0}");
    expect(experience).toContain("world.claimLoot(choice.id, candidate.id)");
  });

  it("projects the Arc-recorded precedent into both the hall and next contract", () => {
    const experience = read("src/world/experience/ExperienceHost.tsx");
    expect(experience).toContain('data-testid="changed-hall-memory"');
    expect(experience).toContain('data-testid="carried-consequence"');
    expect(experience).toContain("world.latestReward.decisionBasis");
  });
});
