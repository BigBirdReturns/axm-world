import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { validateArc } from "../../src/engine/schema.js";
import { compileProjectionManifest, compileWorldForgePlan, compileWorldForgePlanV2 } from "../../src/world/forge/index.js";

const args = process.argv.slice(2);
function option(name: string): string | null {
  const index = args.indexOf(name);
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
  return value;
}

const arcArg = option("--arc");
const manifestArg = option("--manifest");
if (Boolean(arcArg) === Boolean(manifestArg)) throw new Error("Supply exactly one of --arc <arc.json> or --manifest <projection.json>; --version 2 derives a projection from Arc. Default Arc version remains 1.");
const version = option("--version") ?? (manifestArg ? "2" : "1");
if (!["1", "2"].includes(version) || (manifestArg && version !== "2")) throw new Error("Manifest input requires Forge version 2; supported versions are 1 and 2.");
const inputPath = resolve((arcArg ?? manifestArg)!);
const outputPath = resolve(option("--output") ?? `${inputPath}.world-forge.json`);
const input = JSON.parse(readFileSync(inputPath, "utf8"));
const plan = manifestArg ? compileWorldForgePlanV2(input)
  : version === "2" ? compileWorldForgePlanV2(compileProjectionManifest(validateArc(input)))
  : compileWorldForgePlan(validateArc(input));
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  format: plan.format,
  cartridge: plan.cartridge.id,
  cartridgeDigest: plan.cartridge.digest,
  planDigest: plan.planDigest,
  jobs: plan.jobs.length,
  output: outputPath,
}, null, 2));
