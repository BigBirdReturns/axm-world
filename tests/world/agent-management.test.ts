import { describe, expect, it } from "vitest";
import { applyAgentDowntime } from "../../src/world/agent-management.js";
import { makeTestAgent, makeTestOrg } from "../fixtures/state-arc.js";

describe("applyAgentDowntime", () => {
  it("rests agents by lowering stress and nudging morale", () => {
    const agent = makeTestAgent({ id: "a", stress: 5, morale: 50 });
    const org = makeTestOrg([agent]);

    const next = applyAgentDowntime(org, "a", "rest");

    expect(next.agents.a?.stress).toBe(2);
    expect(next.agents.a?.morale).toBe(51);
    expect(org.agents.a?.stress).toBe(5);
  });

  it("trains agents by accepting stress for morale growth", () => {
    const agent = makeTestAgent({ id: "a", stress: 99, morale: 99 });
    const org = makeTestOrg([agent]);

    const next = applyAgentDowntime(org, "a", "train");

    expect(next.agents.a?.stress).toBe(100);
    expect(next.agents.a?.morale).toBe(100);
  });

  it("leaves the organization untouched for unknown agents", () => {
    const org = makeTestOrg([makeTestAgent({ id: "a" })]);
    expect(applyAgentDowntime(org, "missing", "rally")).toBe(org);
  });
});
