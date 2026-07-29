import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { compileActionEncounter } from "../src/engine/action/compile.js";
import {
  UNDERDRAIN_PLAYER_ARC,
  UNDERDRAIN_PLAYER_PUMP_CHALLENGE,
} from "../src/demos/underdrain/index.js";

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index < 0 ? null : process.argv[index + 1] ?? null;
}

const output = resolve(argument("--output") ?? "local/action-player-floor/action-spec.json");
const timingProfileId = argument("--timing-profile") ?? "forgiving";
const spec = compileActionEncounter(
  UNDERDRAIN_PLAYER_ARC,
  UNDERDRAIN_PLAYER_PUMP_CHALLENGE,
  null,
  timingProfileId,
);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(spec, null, 2) + "\n");
console.log(JSON.stringify({
  format: "axm-action-player-spec-build/1",
  status: "pass",
  output,
  challengeId: spec.challengeId,
  timingProfileId: spec.timingProfileId,
  actionSpecDigest: spec.specDigest,
  arcDigest: spec.arcDigest,
}, null, 2));
