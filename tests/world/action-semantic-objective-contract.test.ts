import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("semantic action objective receiver", () => {
  it("retains legacy runtime identity and adds the governed interaction input", () => {
    const contract = source("unity/Packages/com.axm.rodoh-action/Runtime/Core/ActionContract.cs");
    expect(contract).toContain('RuntimeVersion = "1.0.0"');
    expect(contract).toContain('SemanticRuntimeVersion = "1.1.0"');
    expect(contract).toContain("ButtonMask = 31");
    expect(contract).toContain("Interact = 16");
    expect(contract).toContain("ActionObjectiveSemanticCompletion");
  });

  it("advances authored mechanisms through deterministic progress", () => {
    const kernel = source("unity/Packages/com.axm.rodoh-action/Runtime/Core/ActionKernel.cs");
    expect(kernel).toContain("StepSemanticObjective(spec, state, input)");
    expect(kernel).toContain("ObjectiveComplete(state, objective)");
    expect(kernel).toContain("objectiveInteractions += 1");
    expect(kernel).toContain("objectiveHoldTicks += 1");
  });

  it("projects strict runtime 1.1 source law", () => {
    const projection = source("unity/Conformance/project-action-spec.mjs");
    expect(projection).toContain('["1.0.0", "1.1.0"]');
    expect(projection).toContain("semanticCompletion(objective.semanticCompletion");
    expect(projection).toContain("Runtime 1.1 requires at least one semantic objective");
  });

  it("keeps World provisional and binds the candidate to the projected runtime", () => {
    const trace = source("unity/Packages/com.axm.rodoh-action/Runtime/Core/ActionTrace.cs");
    const contract = source("unity/Packages/com.axm.rodoh-action/Runtime/Core/ActionContract.cs");
    expect(trace).toContain("runtimeVersion = spec.runtimeVersion");
    expect(contract).toContain('authority = "Arc replay required"');
  });

  it("provides keyboard/API ingress and an exact semantic parity referee", () => {
    const router = source("unity/Packages/com.axm.rodoh-action/Runtime/Unity/ActionInputRouter.cs");
    expect(router).toContain("PressInteract");
    expect(router).toContain("KeyCode.E");
    expect(source("unity/Conformance/SemanticParityProgram.cs")).toContain("Arc runtime-1.1 vector controls");
  });

  it("keeps cartridge-specific names out of shared action law", () => {
    const shared = [
      source("unity/Packages/com.axm.rodoh-action/Runtime/Core/ActionContract.cs"),
      source("unity/Packages/com.axm.rodoh-action/Runtime/Core/ActionKernel.cs"),
      source("unity/Packages/com.axm.rodoh-action/Runtime/Core/ActionTrace.cs"),
    ].join("\n").toLowerCase();
    expect(shared.includes("underdrain")).toBe(false);
    expect(shared.includes("pump-seven")).toBe(false);
  });
});
