import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUTPUT_ROOT = resolve(ROOT, "local/playwright-underdrain");
const OUTPUT = resolve(OUTPUT_ROOT, "index.html");
const DEMO = resolve(ROOT, "demos/underdrain-draft");
const ARC_COMMIT = "ea16757fe9df65405b322af13d95351896f43157";

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export default function globalSetup(): void {
  rmSync(OUTPUT_ROOT, { recursive: true, force: true });

  const worldCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
  if (!/^[0-9a-f]{40}$/.test(worldCommit)) {
    throw new Error(`Playwright could not resolve an exact World commit: ${worldCommit}`);
  }

  const build = spawnSync(process.execPath, [
    resolve(ROOT, "scripts/demos/build-underdrain-draft.mjs"),
    "--root", DEMO,
    "--output", OUTPUT,
    "--world-commit", worldCommit,
  ], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (build.status !== 0) {
    throw new Error([
      "Playwright could not assemble the exact represented Underdrain standalone.",
      build.stdout,
      build.stderr,
    ].filter(Boolean).join("\n"));
  }

  const verify = spawnSync(process.execPath, [
    resolve(ROOT, "scripts/demos/verify-underdrain-draft.mjs"),
    "--root", DEMO,
    "--html", OUTPUT,
    "--world-commit", worldCommit,
    "--arc-commit", ARC_COMMIT,
    "--authoring-sha256", sha256(resolve(DEMO, "authoring.json")),
    "--presentation-sha256", sha256(resolve(DEMO, "presentation.json")),
  ], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (verify.status !== 0) {
    throw new Error([
      "Playwright refused the Underdrain representation boundary before launching a browser.",
      verify.stdout,
      verify.stderr,
    ].filter(Boolean).join("\n"));
  }
}
