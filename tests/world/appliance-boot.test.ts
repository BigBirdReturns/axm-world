// Canonical founding guard for the embodied client. World may stage the result
// differently, but it must not derive its own roster, resources, seed, opening,
// relationships, or facilities.

import { beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import { cartridgeForEntry, importCartridgeFromJson } from "../../src/world/cartridge-bay.js";
import { firstLockoutCartridgeJson } from "../../src/world/appliance/index.js";
import { foundOrganization } from "../../src/engine/founding.js";
import { MINI_ARC } from "../fixtures/mini-arc.js";
import type { Arc } from "../../src/engine/types.js";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, value); }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = new MemoryStorage();
});

function bootFirstLockout(): Arc {
  const result = importCartridgeFromJson(firstLockoutCartridgeJson());
  if (!result.ok) throw new Error(`import failed: ${result.errors.join(", ")}`);
  return cartridgeForEntry(result.entry).arc;
}

function read(rel: string): string {
  return fs.readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
}

describe("World fresh boot delegates to canonical engine founding", () => {
  it("wires useArcWorld directly to foundOrganization and no parallel policy", () => {
    const source = read("src/world/useArcWorld.ts");
    expect(source).toContain('import { foundOrganization } from "../engine/founding.js"');
    expect(source).toContain("return foundOrganization(arc);");
    expect(source).not.toContain("bootstrapOrg");
    expect(source).not.toContain("applianceBootOptions");
    expect(source).not.toContain("generateAgent");
    expect(source).not.toContain("buildOpeningCard");
    expect(source).not.toContain("Math.random");
  });

  it("legacy fallback sizes first-lockout from authored encounter requirements", () => {
    const arc = bootFirstLockout();
    const org = foundOrganization(arc);
    expect(Object.keys(org.agents)).toHaveLength(10);
  });

  it("legacy fallback reconciles simultaneous role floors", () => {
    const guardian = MINI_ARC.roles.find((role) => role.id === "guardian")!;
    const striker = MINI_ARC.roles.find((role) => role.id === "striker")!;
    const roleHeavyArc: Arc = {
      ...MINI_ARC,
      roles: [
        striker,
        guardian,
        { ...guardian, id: "healer", name: "Healer" },
        { ...striker, id: "support", name: "Support" },
      ],
      challenges: [{
        ...MINI_ARC.challenges[0]!,
        rosterRequirements: {
          minAgents: 5,
          maxAgents: 6,
          roleRequirements: [
            { roleId: "guardian", count: 2 },
            { roleId: "healer", count: 2 },
            { roleId: "striker", count: 1 },
          ],
        },
      }],
    };

    const roster = Object.values(foundOrganization(roleHeavyArc).agents);
    expect(roster).toHaveLength(6);
    const counts = new Map<string, number>();
    for (const agent of roster) {
      if (agent.role) counts.set(agent.role, (counts.get(agent.role) ?? 0) + 1);
    }
    for (const floor of roleHeavyArc.challenges[0]!.rosterRequirements.roleRequirements) {
      expect(counts.get(floor.roleId) ?? 0, floor.roleId).toBeGreaterThanOrEqual(floor.count);
    }
  });

  it("requirement-free legacy arcs keep the frozen six-founder fallback deterministically", () => {
    const arc: Arc = { ...MINI_ARC, challenges: [] };
    const first = foundOrganization(arc);
    const second = foundOrganization(arc);
    expect(Object.keys(first.agents)).toHaveLength(6);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
