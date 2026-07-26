import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");

describe("Gate 7 entry-transition custody", () => {
  it("bounds the skip click and treats transition disappearance as a successful race", () => {
    const source = readFileSync(resolve(ROOT, "e2e/gate7-clean-room.spec.ts"), "utf8");

    expect(source).toContain("await Promise.race([");
    expect(source).toContain("skip.click({ timeout: 250 }).catch(() => undefined)");
    expect(source).toContain('transition.waitFor({ state: "hidden", timeout: 250 }).catch(() => undefined)');
    expect(source).toContain("the terminal shell assertion");
    expect(source).not.toContain("await skip.click();");
  });
});
