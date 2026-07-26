import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");

describe("asset release workflow custody", () => {
  it("qualifies every exact product candidate through inventory, complete tests, static budgets, and browser play", () => {
    const workflow = readFileSync(resolve(ROOT, ".github/workflows/asset-release-custody.yml"), "utf8");
    expect(workflow).not.toMatch(/^\s+paths:/m);
    expect(workflow).toContain("Record exact candidate identity");
    expect(workflow).toContain("--check");
    expect(workflow).toContain("npm test\n");
    expect(workflow).toContain("audit-static-build.mjs");
    expect(workflow).toContain("npx playwright test");
    expect(workflow).toContain("Complete desktop and mobile browser product");
    expect(workflow).toContain("Preserve clean source tree");
  });
});
