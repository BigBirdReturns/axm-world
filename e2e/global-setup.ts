import { execFileSync, spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUTPUT_ROOT = resolve(ROOT, "local/playwright-underdrain");
const OUTPUT = resolve(OUTPUT_ROOT, "index.html");

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
    "--root", resolve(ROOT, "demos/underdrain-draft"),
    "--output", OUTPUT,
    "--world-commit", worldCommit,
  ], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (build.status !== 0) {
    throw new Error([
      "Playwright could not assemble the exact Underdrain standalone.",
      build.stdout,
      build.stderr,
    ].filter(Boolean).join("\n"));
  }
}
