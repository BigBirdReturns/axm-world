import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const LOCK_PATH = resolve(ROOT, "estate/post-v1/continuous-authority.lock.json");
const VERIFY = resolve(ROOT, "scripts/continuous-authority/verify-estate.mjs");

function json<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

describe("continuous post-v1 authority estate", () => {
  it("pins one explicit authority chain without changing the frozen release", () => {
    const lock = json<{
      format: string;
      status: string;
      releaseEffect: string;
      repositories: {
        world: { receiverCommit: string };
        arc: { actionAuthorityCommit: string; narrativeBaselineCommit: string; continuousAuthorityCommit: string };
        embodied: { functionalCommit: string; closureCommit: string };
      };
      genesis: { kernelCommit: string };
      unity: { version: string; physicalReceiptRequired: boolean };
      acceptance: { bookIVActivated: boolean; physicalIssue: string; operatorKitPr: string; requiredReceipts: string[] };
    }>(LOCK_PATH);

    expect(lock).toMatchObject({
      format: "rodoh-continuous-authority-lock/1",
      status: "post-v1-integration",
      releaseEffect: "none",
      repositories: {
        world: { receiverCommit: "52162c757f905aae5c2383f6896de3b258e7cf8f" },
        arc: {
          actionAuthorityCommit: "6eef311836ee7cb3a43a94ce51f448a2699c3b04",
          narrativeBaselineCommit: "3c09166af33fb24dd185b0559b5a80183d514d3e",
          continuousAuthorityCommit: "e54a7799f780d69719512db1b119c565b49637e1",
        },
        embodied: {
          functionalCommit: "69b7f9a7bad5b4a94210313ca267a9b479402f09",
          closureCommit: "a5bfe8be5340821bab7190d211856bd6a8367a80",
        },
      },
      genesis: { kernelCommit: "9074e7fb2e9cedde692b248cdd0c6a805e77d8ac" },
      unity: { version: "6000.0.66f2", physicalReceiptRequired: true },
      acceptance: {
        bookIVActivated: false,
        physicalIssue: "BigBirdReturns/axm-world#204",
        operatorKitPr: "BigBirdReturns/axm-world#205",
      },
    });
    expect(lock.acceptance.requiredReceipts).toEqual(expect.arrayContaining([
      "rodoh-action-execution-candidate/1",
      "axm-embodied-action-session/1",
      "axm-action-receipt/1",
      "axm-action-narrative-ingestion/1",
    ]));
  });

  it("validates the static lock through the same dependency-free verifier used by CI and operators", () => {
    const result = spawnSync(process.execPath, [VERIFY, "--lock", LOCK_PATH], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      format: "rodoh-continuous-authority-verification/1",
      status: "pass",
      lockFormat: "rodoh-continuous-authority-lock/1",
      mode: "static",
      physicalReceiptRequired: true,
      bookIVActivated: false,
    });
  });

  it("keeps the exact action-to-narrative seam and physical acceptance boundary visible", () => {
    const verifier = readFileSync(VERIFY, "utf8");
    expect(verifier).toContain("src/narrative/action-receipt-seam.ts");
    expect(verifier).toContain("scripts/complete-embodied-action-session.ps1");
    expect(verifier).toContain("git merge-base");
    expect(verifier).toContain("actionNarrativeIngestion");
    expect(verifier).not.toContain("bookIVActivated: true");

    const documentation = readFileSync(resolve(ROOT, "docs/CONTINUOUS_AUTHORITY_ESTATE.md"), "utf8");
    expect(documentation).toContain("accepted axm-action-receipt/1");
    expect(documentation).toContain("axm-action-narrative-ingestion/1");
    expect(documentation).toContain("campaignEffect: null");
    expect(documentation).toContain("World and Unity cannot");
    expect(documentation).toContain("Book IV");
  });
});
