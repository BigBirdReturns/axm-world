import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCartridge, FIRST_CHARTER_CARTRIDGE } from "../../src/world/cartridge.js";

// The platform constitution's teeth (docs/adr/0002-platform-constitution.md).
// Where an article is mechanically testable, it is enforced here; the remaining
// articles are enforced by the suites the ADR names. Deleting a guard here is
// amending the constitution — do it in the ADR first.

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

function read(rel: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
}

function listSourceFiles(dirRel: string): string[] {
  const abs = path.join(REPO_ROOT, dirRel);
  if (!fs.existsSync(abs)) return [];
  return (fs.readdirSync(abs, { recursive: true }) as string[])
    .filter((f) => (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.endsWith(".d.ts"))
    .map((f) => path.join(dirRel, f).split(path.sep).join("/"));
}

describe("constitution: Article 1 — the cartridge belongs to its holder", () => {
  it("runtime source contains ZERO network primitives: playing never requires a server", () => {
    // Playing a cartridge you hold must never require a server, account, or
    // permission. Growth features may be added AROUND this (a separate sync
    // module the runtime works without), never THROUGH it.
    const NETWORK = /\bfetch\s*\(|XMLHttpRequest|new WebSocket|sendBeacon|EventSource|from ["']axios["']/;
    const offenders: string[] = [];
    for (const dir of ["src/world", "src/engine", "src/play-pipeline", "src/game", "src/spoke"]) {
      for (const rel of listSourceFiles(dir)) {
        if (NETWORK.test(read(rel))) offenders.push(rel);
      }
    }
    expect(offenders, `network primitives found in runtime code:\n${offenders.join("\n")}`).toEqual([]);
  });
});

describe("constitution: Article 2 — trust is a layer, never a gate", () => {
  it("an unsigned import parses to a playable cartridge wearing its provenance", () => {
    // The same authored content, arriving unsigned, must boot — it just wears
    // "imported-unsigned" transparently. (Full behavioral proof that an imported
    // cartridge bootstraps and compiles lives in cartridge-bay.test.ts.)
    // Round-trip through JSON exactly as a .cart file import would arrive.
    const cartridge = parseCartridge(JSON.parse(JSON.stringify(FIRST_CHARTER_CARTRIDGE.arc)), "imported-unsigned");
    expect(cartridge.manifest.trust).toBe("imported-unsigned");
    expect(cartridge.arc.challenges.length).toBeGreaterThan(0);
  });
});

describe("constitution: the document itself", () => {
  it("the ADR exists and carries all six articles", () => {
    const adr = read("docs/adr/0002-platform-constitution.md");
    for (const article of [
      "Article 1 — The cartridge belongs to its holder",
      "Article 2 — Identity is computed, not claimed",
      "Article 3 — Memory belongs to the run",
      "Article 4 — The dev kit is free",
      "Article 5 — Old cartridges always boot",
      "Article 6 — The runtime may not claim what it cannot prove",
    ]) {
      expect(adr, `missing: ${article}`).toContain(article);
    }
  });

  it("the suites the ADR leans on actually exist (the constitution cannot rot silently)", () => {
    for (const suite of [
      "tests/world/save.test.ts",
      "tests/world/cartridge-bay.test.ts",
      "tests/world/ledger.test.ts",
      "tests/world/consequence.test.ts",
      "tests/world/consequence-schema.test.ts",
      "tests/world/result-ledger-v2.test.ts",
      "tests/world/recorded-wording.test.ts",
      "tests/engine/save.test.ts",
      "tests/engine/cartridge-digest.test.ts",
    ]) {
      expect(fs.existsSync(path.join(REPO_ROOT, suite)), `missing suite: ${suite}`).toBe(true);
    }
  });

  it("the table is set: CLAUDE.md orients the next contributor to the constitution", () => {
    const claude = read("CLAUDE.md");
    expect(claude).toContain("docs/adr/0002-platform-constitution.md");
    expect(claude).toContain("npm run check");
  });
});
