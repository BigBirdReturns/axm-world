import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const STATIC_AUDIT = resolve(ROOT, "scripts/performance/audit-static-build.mjs");
const STATUS_GENERATOR = resolve(ROOT, "scripts/estate/generate-current-status.mjs");

function runNode(script: string, args: string[]) {
  return spawnSync(process.execPath, [script, ...args], { cwd: ROOT, encoding: "utf8" });
}
function git(...args: string[]): string {
  const result = spawnSync("git", ["-C", ROOT, ...args], { encoding: "utf8" });
  expect(result.status, result.stderr).toBe(0);
  return result.stdout.trim();
}
function writeReceipt(path: string, value: unknown): void {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

const generousStaticBudgets = {
  maximumFiles: 100,
  maximumTotalBytes: 10_000_000,
  maximumJavaScriptBytes: 10_000_000,
  maximumLargestJavaScriptBytes: 10_000_000,
  maximumCssBytes: 10_000_000,
  maximumSvgBytes: 10_000_000,
  maximumLargestSvgBytes: 10_000_000,
  maximumSvgElementsPerFile: 10_000,
  maximumFontBytes: 10_000_000,
  maximumExternalReferences: 0,
};

describe("browser support and performance custody", () => {
  it("detects executable JavaScript network dependencies without counting standards namespaces", () => {
    const dir = mkdtempSync(join(tmpdir(), "rodoh-static-audit-"));
    const build = join(dir, "build");
    mkdirSync(build);
    const budgets = join(dir, "budgets.json");
    const receipt = join(dir, "receipt.json");
    writeFileSync(budgets, JSON.stringify({ staticBuild: generousStaticBudgets }));
    writeFileSync(join(build, "app.js"), 'fetch("https://example.com/runtime.json");\n');

    const rejected = runNode(STATIC_AUDIT, ["--build", build, "--budgets", budgets, "--output", receipt]);
    expect(rejected.status).not.toBe(0);
    const rejectedReceipt = JSON.parse(readFileSync(receipt, "utf8"));
    expect(rejectedReceipt.failures).toContainEqual({ label: "externalReferences", actual: 1, maximum: 0 });
    expect(rejectedReceipt.files[0].externalReferenceUrls).toEqual(["https://example.com/runtime.json"]);

    writeFileSync(join(build, "app.js"), [
      'const svgNamespace = "http://www.w3.org/2000/svg";',
      "// https-like prose is not an executable dependency when no URL literal is present.",
      "",
    ].join("\n"));
    const accepted = runNode(STATIC_AUDIT, ["--build", build, "--budgets", budgets, "--output", receipt]);
    expect(accepted.status, accepted.stderr || accepted.stdout).toBe(0);
    expect(JSON.parse(readFileSync(receipt, "utf8"))).toMatchObject({
      status: "pass",
      summary: { externalReferences: 0 },
    });
  });

  it("binds support browsers and the NVDA recorder to the declared exact environment", () => {
    const supportConfig = readFileSync(resolve(ROOT, "playwright.support.config.ts"), "utf8");
    expect(supportConfig).toContain("npm run dev -- --host 127.0.0.1 --port 5173 --strictPort");

    const smoke = readFileSync(resolve(ROOT, "e2e/support-smoke.spec.ts"), "utf8");
    expect(smoke).toContain("resolvePendingDecisions");
    expect(smoke).not.toContain("resolveOpeningDecision");

    const workflow = readFileSync(resolve(ROOT, ".github/workflows/browser-support-performance.yml"), "utf8");
    expect(workflow).toContain("set -euo pipefail");
    expect(workflow).toContain("Hosted Windows Edge smoke");
    expect(workflow).not.toContain("Windows 11 Edge smoke");

    const recorder = readFileSync(resolve(ROOT, "scripts/accessibility/Record-NvdaEdgeAcceptance.ps1"), "utf8");
    expect(recorder).toContain('Invoke-GitText $worldRepo @("status", "--porcelain")');
    expect(recorder).toContain('Invoke-GitText $arcRepo @("status", "--porcelain")');
    expect(recorder).toContain("merge-base --is-ancestor");
    expect(recorder).toContain("playwrightVersion");

    const schema = JSON.parse(readFileSync(resolve(ROOT, "estate/nvda-edge-acceptance.schema.json"), "utf8"));
    expect(schema.required).toEqual(expect.arrayContaining(["nodeVersion", "npmVersion", "playwrightVersion"]));
  });

  it("refuses every valid-looking acceptance receipt that names a different repository pair", () => {
    const estateRoot = mkdtempSync(join(tmpdir(), "rodoh-status-"));
    const receipts = resolve(estateRoot, ".rodoh-estate/receipts");
    const wrongWorld = "0".repeat(40);
    const wrongArc = "1".repeat(40);
    writeReceipt(resolve(receipts, "windows-replication.json"), {
      format: "rodoh-windows-replication-receipt/1",
      status: "pass",
      worldHead: wrongWorld,
      arcHead: wrongArc,
    });
    writeReceipt(resolve(receipts, "local-operator-acceptance.json"), {
      format: "rodoh-local-operator-acceptance/1",
      status: "pass",
      worldCommit: wrongWorld,
      arcCommit: wrongArc,
    });
    writeReceipt(resolve(receipts, "nvda-edge-acceptance.json"), {
      format: "rodoh-nvda-edge-acceptance/1",
      status: "pass",
      worldCommit: wrongWorld,
      arcCommit: wrongArc,
    });

    const output = resolve(receipts, "status.json");
    const markdown = resolve(receipts, "status.md");
    const result = runNode(STATUS_GENERATOR, [
      "--repo", ROOT,
      "--estate-root", estateRoot,
      "--output-json", output,
      "--output-markdown", markdown,
    ]);
    expect(result.status, result.stderr || result.stdout).toBe(0);
    const status = JSON.parse(readFileSync(output, "utf8"));
    expect(status.release.ready).toBe(false);
    expect(status.release.blockers).toEqual(expect.arrayContaining([
      expect.stringMatching(/^Local operator receipt names World /),
      expect.stringMatching(/^Local operator receipt names Arc /),
      expect.stringMatching(/^Windows replication receipt names World /),
      expect.stringMatching(/^Windows replication receipt names Arc /),
      expect.stringMatching(/^NVDA and Edge receipt names World /),
      expect.stringMatching(/^NVDA and Edge receipt names Arc /),
    ]));
    expect(status.repositories.world.commit).toBe(git("rev-parse", "HEAD"));
  });
});
