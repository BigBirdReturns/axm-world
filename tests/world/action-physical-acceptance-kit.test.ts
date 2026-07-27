import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const scriptPath = resolve(root, "tools/action-physical-acceptance/Invoke-RodohActionPhysicalAcceptance.ps1");
const readmePath = resolve(root, "tools/action-physical-acceptance/README.md");

describe("frozen action physical-acceptance kit", () => {
  it("pins the exact accepted World, Arc, embodied, and Genesis authority set", () => {
    expect(existsSync(scriptPath)).toBe(true);
    const script = readFileSync(scriptPath, "utf8");
    expect(script).toContain('52162c757f905aae5c2383f6896de3b258e7cf8f');
    expect(script).toContain('6eef311836ee7cb3a43a94ce51f448a2699c3b04');
    expect(script).toContain('69b7f9a7bad5b4a94210313ca267a9b479402f09');
    expect(script).toContain('9074e7fb2e9cedde692b248cdd0c6a805e77d8ac');
    expect(script).toContain('worktree add --detach');
  });

  it("separates prepare, status, and completion authority", () => {
    const script = readFileSync(scriptPath, "utf8");
    expect(script).toContain('[ValidateSet("Prepare", "Status", "Complete")]');
    expect(script).toContain('status = "awaiting-physical-execution"');
    expect(script).toContain('Quest spool observation only; Arc replay still required');
    expect(script).toContain('$candidates.Count -eq 1');
    expect(script).toContain('complete-embodied-action-session.ps1');
    expect(script).toContain('format = "rodoh-action-physical-acceptance/1"');
    expect(script).toContain('acceptedReceiptSha256');
    expect(script).toContain('genesisShardSha256');
  });

  it("requires the real Unity, Windows, Quest, governed-production, and Android receipts", () => {
    const script = readFileSync(scriptPath, "utf8");
    expect(script).toContain('-BuildWindows');
    expect(script).toContain('-BuildQuest');
    expect(script).toContain('-InstallQuest');
    expect(script).toContain('editModeTests -ne "pass"');
    expect(script).toContain('bodyPrefabs -ne 6');
    expect(script).toContain('controllers -ne 2');
    expect(script).toContain('playerSmoke -ne "pass"');
    expect(script).toContain('sessionStart.platform -ne "Android"');
    expect(script).toContain('immutable evidence is never replaced');
  });

  it("documents the exact operator sequence without claiming the observations early", () => {
    expect(existsSync(readmePath)).toBe(true);
    const readme = readFileSync(readmePath, "utf8");
    expect(readme).toContain('-Phase Prepare');
    expect(readme).toContain('-Phase Status');
    expect(readme).toContain('-Phase Complete');
    expect(readme).toContain('No physical or campaign result is accepted at this phase.');
    expect(readme).toContain('A safety stop remains physical evidence with no campaign effect.');
  });
});
