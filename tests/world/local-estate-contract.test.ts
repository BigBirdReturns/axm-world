import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (path: string): string => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const json = <T>(path: string): T => JSON.parse(read(path)) as T;

const lock = json<{
  format: string;
  releaseTarget: string;
  repositories: {
    arc: { branch: string; requiredAncestor: string; requiredCommit: string; productAuthorityCommit: string };
    world: { branch: string; requiredAncestor: string; productAuthorityCommit: string };
  };
  protocols: Record<string, unknown>;
  products: Record<string, string>;
  publication: { bundle: string; sha256: string; requiredForOperatorAcceptance: boolean };
  localGate: { receipt: { format: string; required: boolean; blocksV1Release: boolean; path: string; mayBeGeneratedOnlyAfterAutomatedPass: boolean } };
}>("estate/estate.lock.json");

const matrix = json<{
  format: string;
  automated: Array<{ id: string }>;
  human: Array<{ id: string }>;
  terminalReceipt: { format: string; requiredFor: string[] };
}>("estate/acceptance-matrix.json");

const publication = json<{
  format: string;
  bundle: { filename: string; sha256: string; bytes: number; entries: number };
  volumes: Array<{ id: string; implementationStatus: string }>;
}>("estate/publication/PUBLICATION_MANIFEST.json");

describe("local estate replication contract", () => {
  it("freezes the two repository authority boundaries without claiming v1.0.0", () => {
    expect(lock.format).toBe("rodoh-local-estate-lock/1");
    expect(lock.releaseTarget).toBe("RODOH v1.0.0");
    expect(lock.repositories.arc).toMatchObject({
      branch: "release/local-estate-replication",
      requiredAncestor: "94c0e965c09e090d768e73ad29f7820aa50606c0",
      requiredCommit: "c935cd1118b96fba8cc141ec45918352d59271d8",
      productAuthorityCommit: "94c0e965c09e090d768e73ad29f7820aa50606c0",
    });
    expect(lock.repositories.world.branch).toBe("release/local-estate-replication");
    expect(lock.repositories.world.requiredAncestor).toBe("4c280be0f2e8e8cf9b07619de01a4eef2d9aecc0");
    expect(json<{ version: string }>("package.json").version).toBe("0.0.1");
  });

  it("pins every current product identity and the common custody protocols", () => {
    expect(lock.products).toEqual({
      "first-charter": "cart1_d8888842c6a7a7ba758a8eea567c71fcc8f998ff8af75208ed44ef4eee74edeb",
      karazhan: "cart1_776adac1b9372d0331ddd774af8b94c80b46bd6bbc4763334cf01def46111144",
      "kind-gods-of-ilyon": "cart1_17054e128dc6fd517fc47f163d92da58d72f9302a84d9d3b04589083afc10f0e",
      "lamp-district": "cart1_05530ae780a30f2f79fb0ddf030ba0e92321d736f146e8e16ddb325ae948b23e",
      "relief-circuit": "cart1_15a9f3792ff8a68948053a06cefcbf586e9960158ca051a187e1ab341b7a2e65",
      "orchard-at-low-tide": "cart1_3be11e31edc0d7674abf930aad1027281089ca5c2ec2a34f4edb83168b6b86bb",
    });
    expect(lock.protocols).toMatchObject({
      engine: "1.3.0",
      engineSave: 3,
      portableRun: "axm-cartridge-run/v3",
      connectedOperation: "axm-connected-operation/v1",
      secondRecension: "godscar.second-recension@1",
    });
  });

  it("makes the local human receipt a conjunctive release gate", () => {
    expect(matrix.format).toBe("rodoh-local-acceptance-matrix/1");
    expect(matrix.automated.map((entry) => entry.id)).toEqual(expect.arrayContaining([
      "toolchain-doctor",
      "exact-source-sync",
      "offline-dependency-hydration",
      "machine-contract",
      "reproducible-builds",
      "arc-complete-suite",
      "world-complete-suite",
      "full-browser-supergate",
      "offline-source-custody",
    ]));
    expect(matrix.human.map((entry) => entry.id)).toEqual(expect.arrayContaining([
      "arc-opens",
      "world-opens",
      "bundled-play",
      "clean-room-import",
      "portable-run-roundtrip",
      "publication-library",
      "snapshot-recovery",
    ]));
    expect(lock.localGate.receipt).toEqual({
      format: "rodoh-local-operator-acceptance/1",
      required: true,
      path: ".rodoh-estate/receipts/local-operator-acceptance.json",
      mayBeGeneratedOnlyAfterAutomatedPass: true,
      blocksV1Release: true,
    });
    expect(matrix.terminalReceipt.requiredFor).toContain("RODOH v1.0.0");
  });

  it("binds the complete reviewed publication without registering Book IV as runtime", () => {
    expect(publication.format).toBe("godscar-publication-manifest/1");
    expect(publication.bundle).toEqual({
      filename: "The_Godscar_Codex_Professional_Reviewed_Four_Books_and_Addenda.zip",
      sha256: "4c969b20bda7eacd062077a71da2c552aa4c6521abaaef186d01b0c13468822a",
      bytes: 10875275,
      entries: 12,
    });
    expect(lock.publication.bundle).toBe(publication.bundle.filename);
    expect(lock.publication.sha256).toBe(publication.bundle.sha256);
    expect(lock.publication.requiredForOperatorAcceptance).toBe(true);
    expect(publication.volumes.find((volume) => volume.id === "book-iv-lineage-commons")?.implementationStatus)
      .toBe("staged-post-1.0");
  });

  it("ships a one-command Windows lane and cross-platform machine tools", () => {
    for (const path of [
      "RODOH.cmd",
      "scripts/local-estate/Invoke-RodohEstate.ps1",
      "scripts/local-estate/estate-tools.mjs",
      "scripts/local-estate/static-server.mjs",
      "estate/START_HERE.md",
      "estate/LOCAL_REPLICATION.md",
      "estate/MACHINE_CONTRACT.md",
      "estate/TROUBLESHOOTING_WINDOWS.md",
    ]) {
      expect(existsSync(new URL(`../../${path}`, import.meta.url)), path).toBe(true);
    }

    const launcher = read("RODOH.cmd");
    expect(launcher).toContain("Invoke-RodohEstate.ps1");
    expect(launcher).toMatch(/pwsh\.exe/);
    expect(launcher).toMatch(/powershell\.exe/);

    const powershell = read("scripts/local-estate/Invoke-RodohEstate.ps1");
    expect(powershell).toContain("rodoh-local-operator-acceptance/1");
    expect(powershell).toContain("bundle', 'create'");
    expect(powershell).toContain("--offline");
    expect(powershell).not.toContain("reset --hard");

    for (const path of ["scripts/local-estate/estate-tools.mjs", "scripts/local-estate/static-server.mjs"]) {
      const absolute = new URL(`../../${path}`, import.meta.url);
      const result = spawnSync(process.execPath, ["--check", fileURLToPath(absolute)], { encoding: "utf8" });
      expect(result.status, result.stderr).toBe(0);
    }
  });
});
