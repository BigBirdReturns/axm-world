import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("Action Player Floor semantic cue receiver", () => {
  it("uses one cue-capable presentation adapter downstream of exact Arc state", () => {
    const contract = source("unity/Packages/com.axm.rodoh-action/Runtime/Unity/IActionPresentationAdapter.cs");
    const runtime = source("unity/Packages/com.axm.rodoh-action/Runtime/Unity/ActionRuntimeBehaviour.cs");
    expect(contract).toContain("bool SupportsCue(string cueId)");
    expect(contract).toContain("IReadOnlyList<string> ValidatePlayerProfile()");
    expect(contract).toContain("void ApplyCues(IReadOnlyList<ActionSemanticCue> cues)");
    expect(contract).not.toContain("ApplyEvents");
    expect(runtime).toContain("ActionStateSnapshot.Clone(_state)");
    expect(runtime).toContain("ActionCueProjector.Project(_spec, prior, _state)");
    expect(runtime).toContain("ActionCueProjector.Initial(_spec, _state)");
    expect(runtime).toContain("ValidatePresentationContract()");
    expect(runtime).toContain("_presentation.ApplyCues(cues)");
    expect(runtime).not.toContain("_presentation?.ApplyEvents");
    expect(runtime).toContain("Arc replay required");
  });

  it("refuses primitives and incomplete authored bodies in a player profile", () => {
    const primitive = source("unity/Packages/com.axm.rodoh-action/Runtime/Unity/ActionPrimitivePresentation.cs");
    const production = source("unity/Packages/com.axm.rodoh-action/Runtime/Unity/ActionProductionPresentation.cs");
    expect(primitive).toContain('public bool DiagnosticOnly => true');
    expect(primitive).toContain('diagnostic.primitive/v1 is not a player presentation');
    expect(production).toContain('public bool DiagnosticOnly => false');
    expect(production).toContain('Authored player prefab is absent.');
    expect(production).toContain('Player primitive fallback remains enabled.');
    expect(production).toContain('Authored enemy prefab is absent: ');
    expect(production).toContain('Enemy primitive fallback remains enabled: ');
    expect(production).toContain('ActionCueContract.CueCode');
    expect(production).toContain('onSemanticCue?.Invoke');
  });

  it("mirrors all seventeen Arc cue identities without gameplay mutation methods", () => {
    const cues = source("unity/Packages/com.axm.rodoh-action/Runtime/Core/ActionSemanticCues.cs");
    const required = [
      "cue.player-action-started",
      "cue.player-action-active",
      "cue.player-action-recovery",
      "cue.enemy-attack-anticipated",
      "cue.enemy-attack-active",
      "cue.enemy-attack-recovery",
      "cue.defense-window-opened",
      "cue.defense-window-closed",
      "cue.parry-succeeded",
      "cue.dodge-invulnerability",
      "cue.enemy-stagger-started",
      "cue.mechanism-available",
      "cue.mechanism-progress",
      "cue.work-window-opened",
      "cue.work-window-closed",
      "cue.objective-completed",
      "cue.encounter-completed",
    ];
    for (const cue of required) expect(cues).toContain(`"${cue}"`);
    expect(cues).toContain('actcue1_');
    expect(cues).toContain('actcuetrace1_');
    expect(cues).toContain('ActionKernel.Step');
    expect(cues).not.toMatch(/ApplyDamage|CompleteObjective|AcceptOutcome|campaign/i);
  });

  it("preserves the Arc timing profile through projection, candidate, and exact replay", () => {
    const contract = source("unity/Packages/com.axm.rodoh-action/Runtime/Core/ActionContract.cs");
    const trace = source("unity/Packages/com.axm.rodoh-action/Runtime/Core/ActionTrace.cs");
    const projection = source("unity/Conformance/project-action-spec.mjs");
    const parity = source("unity/Conformance/CueParityProgram.cs");
    const replay = source("unity/Conformance/arc-receipt-adapter.test.ts");
    expect(contract.match(/public string timingProfileId;/g)).toHaveLength(2);
    expect(trace).toContain('timingProfileId = spec.timingProfileId');
    expect(projection).toContain('timingProfileId: source.timingProfileId ?? null');
    expect(parity).toContain('candidate.timingProfileId == spec.timingProfileId');
    expect(replay).toContain('candidate.timingProfileId ?? null');
    expect(replay).toContain('actionSeed(orgSeed, candidate.cycle, challenge.id, difficultyModeId, timingProfileId)');
    expect(replay).toContain('timingProfileId,');
  });

  it("pins the exact accepted Arc donor and floor while preserving product non-acceptance", () => {
    const lock = JSON.parse(source("docs/action-player-floor.lock.json"));
    expect(lock.format).toBe("axm-action-player-floor-lock/1");
    expect(lock.floor.mainCommit).toBe("9693cb99694338e72c15d0ffbb87b5a1c5bbf16a");
    expect(lock.arc.actionPlayerCommit).toBe("aaa5685903a348b3c1ba875622fbe99d90c1da35");
    expect(lock.floor.catalogId).toBe("actionfloor1_55eb8869417b3b36a28a309263624fe04ad07028f2254337a2f1548cd03b47d8");
    expect(lock.floor.underdrainIntentId).toBe("playerintent1_91647652ca3f387b114d5fa7cfab416e2d99c5f307098b6426a17f624cdfbe6c");
    expect(lock.productAccepted).toBe(false);
    expect(lock.aggregateReadinessScore).toBeNull();
  });
});
