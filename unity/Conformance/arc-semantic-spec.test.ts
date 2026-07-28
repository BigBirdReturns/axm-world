import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { validateArc } from "../../src/engine/schema.js";
import { compileActionEncounter } from "../../src/engine/action/compile.js";
import {
  ACTION_OBJECTIVE_EXTENSION_KEY,
  ACTION_OBJECTIVE_PROFILE_FORMAT,
  ACTION_SEMANTIC_RUNTIME_VERSION,
} from "../../src/engine/action/types.js";
import { MINI_ARC } from "../fixtures/mini-arc.js";

const output = process.env.AXM_UNITY_NATIVE_SPEC;

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing ${name}.`);
  return resolve(value);
}

describe("Unity semantic action objective source", () => {
  it("exports one exact Arc runtime-1.1 mechanism objective", () => {
    const raw = structuredClone(MINI_ARC);
    raw.meta = { ...raw.meta, engineVersion: "1.4.0" };
    raw.challenges = raw.challenges.map((challenge) => challenge.id === "mini-challenge"
      ? {
          ...challenge,
          difficultyRating: 1,
          mechanicChecks: [{
            ...challenge.mechanicChecks[0]!,
            id: "operate-pressure-valve",
            name: "Operate the pressure valve",
            description: "Set the mechanism while a defender applies pressure.",
            difficultyThreshold: 1,
          }],
          timePressure: null,
        }
      : challenge);
    raw.extensions = {
      ...(raw.extensions ?? {}),
      [ACTION_OBJECTIVE_EXTENSION_KEY]: {
        format: ACTION_OBJECTIVE_PROFILE_FORMAT,
        encounters: {
          "mini-challenge": {
            "operate-pressure-valve": {
              kind: "interact_count",
              targetCount: 1,
              radius: 3000,
            },
          },
        },
      },
    };
    const arc = validateArc(raw);
    const spec = compileActionEncounter(arc, arc.challenges[0]!);
    expect(spec.runtimeVersion).toBe(ACTION_SEMANTIC_RUNTIME_VERSION);
    expect(spec.objectives).toHaveLength(1);
    expect(spec.objectives[0]?.semanticCompletion).toMatchObject({
      kind: "interact_count",
      targetCount: 1,
    });
    const path = required(output, "AXM_UNITY_NATIVE_SPEC");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(spec, null, 2) + "\n");
  });
});
