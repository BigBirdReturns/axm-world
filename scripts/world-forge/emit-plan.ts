import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { validateArc } from "../../src/engine/schema.js";
import { compileWorldForgePlan } from "../../src/world/forge/index.js";

const args = process.argv.slice(2);
function option(name: string): string | null {
  const index = args.indexOf(name);
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
  return value;
}

const arcArg = option("--arc");
if (!arcArg) throw new Error("Usage: world-forge:plan -- --arc <arc.json> [--output <plan.json>]");
const arcPath = resolve(arcArg);
const outputPath = resolve(option("--output") ?? `${arcPath}.world-forge.json`);
const input = JSON.parse(readFileSync(arcPath, "utf8"));
const arc = validateArc(input);
const plan = compileWorldForgePlan(arc);
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