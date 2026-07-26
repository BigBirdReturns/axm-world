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

function staticAudit(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), "rodoh-static-audit-"));
  const build = join(dir, "build");
  mkdirSync(build);
  for (const [name, content] of Object.entries(files)) {
    const path = join(build, name);
    mkdirSync(resolve(path, ".."), { recursive: true });
    writeFileSync(path, content);
  }
  const budgets = join(dir, "budgets.json");
  const receipt = join(dir, "receipt.json");
  writeFileSync(budgets, JSON.stringify({ staticBuild: generousStaticBudgets }));
  const result = runNode(STATIC_AUDIT, ["--build", build, "--budgets", budgets, "--output", receipt]);
  return { result, receipt: JSON.parse(readFileSync(receipt, "utf8")) };
}

describe("browser support and performance custody", () => {
  it("detects direct JavaScript network-capable call sites without counting bundled documentation or namespace strings", () => {
    const rejected = staticAudit({
      "app.js": [
        'fetch("https://api.example.test/runtime.json");',
        'new WebSocket("wss://socket.example.test/stream");',
        'new Worker("//cdn.example.test/worker.js");',
        'navigator.sendBeacon("https://telemetry.example.test/receipt");',
        'const request = new XMLHttpRequest(); request.open("GET", "https://api.example.test/other");',
        'import("https://modules.example.test/remote.mjs");',
      ].join("\n"),
    });
    expect(rejected.result.status).not.toBe(0);
    expect(rejected.receipt.failures).toContainEqual({ label: "externalReferences", actual: 6, maximum: 0 });
    expect(rejected.receipt.files[0].externalReferenceUrls).toEqual([
      "//cdn.example.test/worker.js",
      "https://api.example.test/other",
      "https://api.example.test/runtime.json",
      "https://modules.example.test/remote.mjs",
      "https://telemetry.example.test/receipt",
      "wss://socket.example.test/stream",
    ]);

    const accepted = staticAudit({
      "app.js": [
        'const svgNamespace = "http://www.w3.org/2000/svg";',
        'const mathNamespace = "http://www.w3.org/1998/Math/MathML";',
        'const reactDocs = "https://reactjs.org/docs/error-decoder.html?invariant=";',
        'const lightingNotes = "https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733";',
        'const domainRegex = /\\/\\/i.test(value);',
        'console.log(svgNamespace, mathNamespace, reactDocs, lightingNotes, domainRegex);',
      ].join("\n"),
    });
    expect(accepted.result.status, accepted.result.stderr || accepted.result.stdout).toBe(0);
    expect(accepted.receipt).toMatchObject({ status: "pass", summary: { externalReferences: 0 } });
  });

  it("continues to refuse direct HTML, CSS, and SVG external asset references", () => {
    const rejected = staticAudit({
      "index.html": '<img src="https://cdn.example.test/image.png">',
      "screen.css": 'body { background: url("//cdn.example.test/background.png"); }',
      "mark.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><image href="https://cdn.example.test/raster.png"/></svg>',
    });
    expect(rejected.result.status).not.toBe(0);
    expect(rejected.receipt.summary.externalReferences).toBe(3);
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
    expect(workflow).not.toMatch(/^\s+paths:/m);
    expect(workflow).toContain("Record exact candidate identity");
    expect(workflow).toContain("TypeScript, support contracts, and complete World regression");
    expect(workflow).toMatch(/npm test\s*\n/);

    const recorder = readFileSync(resolve(ROOT, "scripts/accessibility/Record-NvdaEdgeAcceptance.ps1"), "utf8");
    expect(recorder).toContain('Invoke-GitText $worldRepo @("status", "--porcelain")');
    expect(recorder).toContain('Invoke-GitText $arcRepo @("status", "--porcelain")');
    expect(recorder).toContain("merge-base --is-ancestor");
    expect(recorder).toContain("playwrightVersion");
    expect(recorder).toContain('$worldBranch = Invoke-GitText $worldRepo @("rev-parse", "--abbrev-ref", "HEAD")');
    expect(recorder).toContain('$arcBranch = Invoke-GitText $arcRepo @("rev-parse", "--abbrev-ref", "HEAD")');
    expect(recorder).toContain("World package version $worldPackageVersion does not match estate lock");
    expect(recorder).toContain("Arc package version $arcPackageVersion does not match estate lock");
    const statusGenerator = readFileSync(STATUS_GENERATOR, "utf8");
    expect(statusGenerator).toContain("value?.world?.head");
    expect(statusGenerator).toContain("value?.arc?.head");

    const schema = JSON.parse(readFileSync(resolve(ROOT, "estate/nvda-edge-acceptance.schema.json"), "utf8"));
    expect(schema.required).toEqual(expect.arrayContaining(["nodeVersion", "npmVersion", "playwrightVersion"]));
  });

  it("coalesces exact pixel ledgers instead of emitting one cold-shelf node per pixel", () => {
    const icons = readFileSync(resolve(ROOT, "src/world/pixel-ui/PixelIcon.tsx"), "utf8");
    const mark = readFileSync(resolve(ROOT, "src/world/brand/RodohRuntimeMark.tsx"), "utf8");
    expect(icons).toContain("const GLYPH_PATHS");
    expect(icons).toContain("pathForTone");
    expect(icons).not.toContain("cells.push(<rect");
    expect(mark).toContain("const ROOT_PATHS");
    expect(mark).toContain("<RodohDandelionGlyph size={RODOH_ROOT_MARK_WIDTH * cell} />");
    expect(mark).not.toContain("RODOH_ROOT_MARK_MAP.flatMap");
  });

  it("refuses every fully valid acceptance receipt that names a different repository pair", () => {
  const estateRoot = mkdtempSync(join(tmpdir(), "rodoh-status-"));
  const receipts = resolve(estateRoot, ".rodoh-estate/receipts");
  const wrongWorld = "0".repeat(40);
  const wrongArc = "1".repeat(40);
  const hash = "a".repeat(64);
  writeReceipt(resolve(receipts, "windows-replication.json"), {
    format: "rodoh-windows-replication-receipt/1",
    generatedAt: new Date().toISOString(),
    status: "pass",
    worldHead: wrongWorld,
    arcHead: wrongArc,
    node: "v22.0.0",
    npm: "10.0.0",
    operatingSystem: "Windows 11",
    checks: ["doctor", "hydrate", "vendored-plane", "double-build", "arc-suite", "world-suite", "gate6", "gate7", "complete-playwright", "static-health"],
  });
  writeReceipt(resolve(receipts, "local-operator-acceptance.json"), {
    format: "rodoh-local-operator-acceptance/1",
    acceptedAt: new Date().toISOString(),
    status: "pass",
    releaseTarget: "RODOH v1.0.0",
    machineFingerprintSha256: hash,
    worldPackageVersion: "1.0.0",
    arcPackageVersion: "1.0.0",
    world: { head: wrongWorld, branch: "main" },
    arc: { head: wrongArc, branch: "main" },
    snapshot: { archive: "rodoh-estate.zip", archiveSha256: hash, manifestSha256: hash },
    publicationSha256: "4c969b20bda7eacd062077a71da2c552aa4c6521abaaef186d01b0c13468822a",
    checks: {
      arcOpens: true,
      worldOpens: true,
      bundledPlay: true,
      cleanRoomImport: true,
      portableRunRoundtrip: true,
      publicationLibrary: true,
      snapshotRecovery: true,
    },
  });
  writeReceipt(resolve(receipts, "nvda-edge-acceptance.json"), {
    format: "rodoh-nvda-edge-acceptance/1",
    acceptedAt: new Date().toISOString(),
    status: "pass",
    machineFingerprintSha256: hash,
    operatingSystem: "Windows 11",
    edgeVersion: "150.0.0",
    nvdaVersion: "2026.1",
    nodeVersion: "v22.0.0",
    npmVersion: "10.0.0",
    playwrightVersion: "1.49.0",
    worldCommit: wrongWorld,
    arcCommit: wrongArc,
    checks: {
      shelfAndIdentity: true,
      keyboardEntry: true,
      viewSwitcher: true,
      contractAndParty: true,
      decisionAndConsequence: true,
      encounterAndRecord: true,
      runExportRestore: true,
      holderEstate: true,
      forcedColorsAndMotion: true,
      semanticRedundancy: true,
    },
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
  expect(status.localEvidence.windowsReplication.valid).toBe(true);
  expect(status.localEvidence.localOperator.valid).toBe(true);
  expect(status.localEvidence.nvdaEdge.valid).toBe(true);
  expect(status.release.ready).toBe(false);
  expect(status.release.blockers).toEqual(expect.arrayContaining([
    expect.stringMatching(/^Local operator receipt names World /),
    expect.stringMatching(/^Local operator receipt names Arc /),
    expect.stringMatching(/^Windows replication receipt names World /),
    expect.stringMatching(/^Windows replication receipt names Arc /),
    expect.stringMatching(/^NVDA and Edge receipt names World /),
    expect.stringMatching(/^NVDA and Edge receipt names Arc /),
  ]));
  expect(status.release.blockers).not.toEqual(expect.arrayContaining([
    expect.stringMatching(/^Vendored Arc product authority /),
    "One or more required estate capabilities are not present in this checkout.",
  ]));
  expect(status.capabilities).toMatchObject({
    boundedJsonImports: true,
    cart1Canonicalization: true,
  });
  expect(status.release).toMatchObject({
    packageVersion: "1.0.0",
    arcPackageVersion: "1.0.0",
  });
  expect(status.repositories.arc).toMatchObject({
    vendoredCommit: "4b07539a06d40b131591f1e9c7d5b90a96ceec31",
    productAuthorityCommit: "4b07539a06d40b131591f1e9c7d5b90a96ceec31",
    releaseEvidenceCommit: "7b576898f7a82409669a97187bcd836296a77e24",
  });
  expect(status.repositories.world.commit).toBe(git("rev-parse", "HEAD"));
});

it("rejects structurally incomplete pass receipts even when their commits are exact", () => {
  const estateRoot = mkdtempSync(join(tmpdir(), "rodoh-status-incomplete-"));
  const receipts = resolve(estateRoot, ".rodoh-estate/receipts");
  const exactWorld = git("rev-parse", "HEAD");
  const exactArc = "7b576898f7a82409669a97187bcd836296a77e24";
  writeReceipt(resolve(receipts, "windows-replication.json"), {
    format: "rodoh-windows-replication-receipt/1",
    status: "pass",
    worldHead: exactWorld,
    arcHead: exactArc,
  });
  writeReceipt(resolve(receipts, "local-operator-acceptance.json"), {
    format: "rodoh-local-operator-acceptance/1",
    status: "pass",
    worldCommit: exactWorld,
    arcCommit: exactArc,
  });
  writeReceipt(resolve(receipts, "nvda-edge-acceptance.json"), {
    format: "rodoh-nvda-edge-acceptance/1",
    status: "pass",
    worldCommit: exactWorld,
    arcCommit: exactArc,
  });

  const output = resolve(receipts, "status.json");
  const result = runNode(STATUS_GENERATOR, [
    "--repo", ROOT,
    "--estate-root", estateRoot,
    "--output-json", output,
    "--output-markdown", resolve(receipts, "status.md"),
  ]);
  expect(result.status, result.stderr || result.stdout).toBe(0);
  const status = JSON.parse(readFileSync(output, "utf8"));
  expect(status.localEvidence.windowsReplication.valid).toBe(false);
  expect(status.localEvidence.localOperator.valid).toBe(false);
  expect(status.localEvidence.nvdaEdge.valid).toBe(false);
  expect(status.release.blockers).toEqual(expect.arrayContaining([
    "Windows replication receipt is absent or invalid.",
    "Local operator acceptance receipt is absent or invalid.",
    "NVDA and Edge acceptance receipt is absent or invalid.",
  ]));
});
});
