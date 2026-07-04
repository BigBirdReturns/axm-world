import { describe, it, expect } from "vitest";
import { deriveHallView } from "../../src/world/inhabited/hall";
import type { WorldNode } from "../../src/world/contract";

type N = Pick<WorldNode, "challengeId" | "title" | "status">;
const node = (challengeId: string, title: string, status: N["status"]): N => ({ challengeId, title, status });

describe("deriveHallView — what the hall steward holds, derived from run state", () => {
  it("offers the first AVAILABLE contract, unresolved", () => {
    const view = deriveHallView([
      node("c1", "The Cellar", "available"),
      node("c2", "The Bridge Troll", "locked"),
    ]);
    expect(view).toEqual({ challengeId: "c1", challengeName: "The Cellar", resolved: false });
  });

  it("skips locked contracts to the first available one", () => {
    const view = deriveHallView([
      node("c0", "Locked Gate", "locked"),
      node("c1", "The Cellar", "available"),
    ]);
    expect(view.challengeId).toBe("c1");
    expect(view.resolved).toBe(false);
  });

  it("reflects the most recently RECORDED contract as fulfilled when none is available", () => {
    const view = deriveHallView([
      node("c1", "The Cellar", "cleared"),
      node("c2", "The Vault", "cleared"),
      node("c3", "The Keep", "locked"),
    ]);
    // The later cleared contract wins, and the steward reads as fulfilled.
    expect(view).toEqual({ challengeId: "c2", challengeName: "The Vault", resolved: true });
  });

  it("prefers an available contract even when earlier ones are cleared", () => {
    const view = deriveHallView([
      node("c1", "The Cellar", "cleared"),
      node("c2", "The Vault", "available"),
    ]);
    expect(view).toEqual({ challengeId: "c2", challengeName: "The Vault", resolved: false });
  });

  it("returns a null view when the cartridge authored no contracts", () => {
    expect(deriveHallView([])).toEqual({ challengeId: null, challengeName: null, resolved: false });
  });

  it("returns a null view when every contract is still locked", () => {
    const view = deriveHallView([node("c1", "The Cellar", "locked")]);
    expect(view).toEqual({ challengeId: null, challengeName: null, resolved: false });
  });
});
