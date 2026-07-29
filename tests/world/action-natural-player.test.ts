import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const runtime = (path: string) => readFileSync(resolve(ROOT, "unity/Packages/com.axm.rodoh-action/Runtime", path), "utf8");
const editor = (path: string) => readFileSync(resolve(ROOT, "unity/Packages/com.axm.rodoh-action/Editor", path), "utf8");

describe("Unity natural action player plane", () => {
  it("uses player-follow free look and presentation-only camera collision", () => {
    const source = runtime("Unity/ActionCombatCamera.cs");
    const collision = runtime("Unity/ActionCameraCollision.cs");
    expect(source).toContain("cameraMode = ActionCameraMode.PlayerFollow");
    expect(source).toContain("public void AddLook(Vector2 deltaDegrees)");
    expect(source).toContain("public Vector2 PlanarForward");
    expect(source).toContain("private ActionActorBinding FindPlayer()");
    expect(source).toContain("UpdatePlayerFollow()");
    expect(source).toContain("UpdateGroupFraming()");
    expect(source).toContain("Time.unscaledTime - _lastManualLookTime >= recenterDelay");
    expect(collision).toContain("Physics.SphereCast");
    expect(collision).toContain("targetCamera.transform.position = pivot + direction * resolvedDistance");
    expect(collision).toContain("never");
    expect(collision).not.toContain("ActionKernel.Step");
  });

  it("maps keyboard mouse and gamepad through one persistent rebindable input profile", () => {
    const source = runtime("Unity/ActionNaturalPlayerInput.cs");
    const bindings = runtime("Unity/ActionInputBindings.cs");
    const overlay = runtime("Unity/ActionRebindOverlay.cs");
    expect(source).toContain("cameraRig.PlanarForward");
    expect(source).toContain("cameraRig.PlanarRight");
    expect(source).toContain("right * move.x + forward * move.y");
    expect(source).toContain("bindings.IsHeld(ActionPlayerAction.Light");
    expect(source).toContain("bindings.IsHeld(ActionPlayerAction.Interact");
    expect(source).toContain("Input.GetMouseButton(0)");
    expect(source).toContain("Input.GetMouseButton(1)");
    expect(source).toContain("interactKeyboardMouse = Input.GetKey(KeyCode.E)");
    expect(source).toContain("router.SetInteract(interact)");
    expect(source).toContain("ObservedDeviceClass");
    expect(source).toContain("SawGamepad");
    expect(source).toContain("CursorLockMode.Locked");
    expect(source).toMatch(/router\?*\.SetDesktopKeyboardFallback\(false\)/);
    expect(bindings).toContain('Format = "rodoh-action-input-bindings/1"');
    expect(bindings).toContain('return "actbind1_"');
    expect(bindings).toContain("PlayerPrefs.SetString");
    expect(bindings).toContain("public bool Rebind(string action, string device, KeyCode key)");
    expect(overlay).toContain("KeyCode.F10");
    expect(overlay).toContain("BeginCapture");
    expect(overlay).toContain("bindings.Rebind");
    expect(overlay).toContain("Arc timing and action law do not change");
  });

  it("pauses unscaled deterministic tick admission while the rebind menu is open", () => {
    const host = runtime("Unity/ActionRuntimeBehaviour.cs");
    const overlay = runtime("Unity/ActionRebindOverlay.cs");
    expect(host).toContain("private bool _playerMenuPaused");
    expect(host).toContain("public void SetPlayerMenuPaused(bool paused)");
    expect(host).toContain("if (_playerMenuPaused)");
    expect(host).toContain("inputRouter?.ClearContinuousInput()");
    expect(host).toContain("_accumulator = 0d");
    expect(overlay).toContain("runtime?.SetPlayerMenuPaused(true)");
    expect(overlay).toContain("runtime?.SetPlayerMenuPaused(false)");
    expect(overlay).toContain("no action ticks advance while this menu is open");
  });

  it("buffers edges until the next legal tick while preserving held mechanism work", () => {
    const buffer = runtime("Core/ActionBufferedInput.cs");
    const router = runtime("Unity/ActionInputRouter.cs");
    const host = runtime("Unity/ActionRuntimeBehaviour.cs");
    expect(buffer).toContain("if (playerMode == ActionPlayerMode.Idle)");
    expect(buffer).toContain("if (Consume(ActionContract.Dodge))");
    expect(buffer).toContain("else if (Consume(ActionContract.Parry))");
    expect(buffer).toContain("continuous.buttons & ActionContract.Interact");
    expect(router).toContain("SetInteract(Input.GetKey(KeyCode.E)");
    expect(router).toContain("public ActionInputFrame SampleTick(ActionPlayerMode playerMode)");
    expect(host).toContain("inputRouter.SampleTick(_state.player.mode)");
  });

  it("routes exact Arc state and semantic cues through one selected presentation adapter", () => {
    const contract = runtime("Unity/IActionPresentationAdapter.cs");
    const host = runtime("Unity/ActionRuntimeBehaviour.cs");
    const diagnostic = runtime("Unity/ActionPrimitivePresentation.cs");
    const production = runtime("Unity/ActionProductionPresentation.cs");
    const batch = editor("ActionPolishAugmentBatch.cs");

    expect(contract).toContain("public interface IActionPresentationAdapter");
    expect(contract).toContain("void Initialize(ActionSpecProjection spec, ActionSimulationState state)");
    expect(contract).toContain("void Render(ActionSimulationState state, float interpolation)");
    expect(contract).toContain("bool SupportsCue(string cueId)");
    expect(contract).toContain("IReadOnlyList<string> ValidatePlayerProfile()");
    expect(contract).toContain("void ApplyCues(IReadOnlyList<ActionSemanticCue> cues)");
    expect(contract).not.toContain("ApplyEvents");
    expect(host).toContain("private IActionPresentationAdapter _presentation");
    expect(host).toContain("ValidatePresentationContract()");
    expect(host).toContain("ActionStateSnapshot.Clone(_state)");
    expect(host).toContain("ActionCueProjector.Project(_spec, prior, _state)");
    expect(host).toContain("_presentation.ApplyCues(cues)");
    expect(host).toContain('candidate.authority != "Arc replay required"');
    expect(host).not.toContain("_presentation?.ApplyEvents(_state.events)");
    expect(host).not.toContain("private ActionPrimitivePresentation presentation;");
    expect(diagnostic).toContain("IActionPresentationAdapter");
    expect(diagnostic).toContain('AdapterId => "diagnostic.primitive/v1"');
    expect(diagnostic).toContain("DiagnosticOnly => true");
    expect(production).toContain("IActionPresentationAdapter");
    expect(production).toContain('AdapterId => "production.prefab/v1"');
    expect(production).toContain("ApplyCues(IReadOnlyList<ActionSemanticCue> cues)");
    expect(production).toContain("OnSemanticCue");
    expect(production).toContain("Authored player prefab is absent.");
    expect(production).not.toContain("runtime.TickAdvanced += ApplyState");
    expect(batch).toContain("runtime.ConfigurePresentation(production, false)");
    expect(batch).toContain("primitive.enabled = false");
    expect(batch).toContain("ActionPlayerSessionEvidence");
    expect(batch).toContain("ActionInputBindings");
    expect(batch).toContain("ActionCameraCollision");
  });

  it("adds contact holds without hidden state or trace advancement", () => {
    const host = runtime("Unity/ActionRuntimeBehaviour.cs");
    const feel = runtime("Unity/ActionGameFeelController.cs");
    expect(host).toContain("public void RequestPresentationHold(float seconds)");
    expect(host).toContain("if (_presentationHoldRemaining > 0f)");
    expect(host).toContain("return;");
    expect(feel).toContain("runtime.RequestPresentationHold(seconds)");
    expect(feel).toContain('eventName == "parry"');
    expect(feel).toContain("animator.speed = 0f");
  });

  it("keeps exact receipts behind the player surface and makes controls truthful", () => {
    const hud = runtime("Unity/ActionMinimalHud.cs");
    const evidence = runtime("Unity/ActionPlayerSessionEvidence.cs");
    const performance = runtime("Unity/ActionPerformanceRecorder.cs");
    const batch = editor("ActionPolishAugmentBatch.cs");
    expect(hud).toContain("WASD move");
    expect(hud).toContain("bindings.Profile.ControlSummary()");
    expect(hud).toContain("F10 rebind");
    expect(hud).toContain("bindings?.Profile?.Primary(ActionPlayerAction.Interact)");
    expect(hud).not.toContain("candidateFileName");
    expect(hud).not.toContain("receiptDigest");
    expect(evidence).toContain('format = "rodoh-action-player-session-evidence/2"');
    expect(evidence).toContain("ActionPlayerProductIdentity");
    expect(evidence).toContain("playerProductIdentityValid");
    expect(evidence).toContain("ValidateProductIdentity()");
    expect(evidence).toContain('comprehensionReceipt = "not-issued-by-runtime"');
    expect(evidence).toContain('acceptance = "diagnostic-mechanic-session-only"');
    expect(evidence).toContain('candidateAuthority == "Arc replay required"');
    expect(performance).toContain('format = "rodoh-action-performance-receipt/2"');
    expect(performance).toContain("p95WithinBudget");
    expect(performance).toContain("p99WithinBudget");
    expect(performance).toContain("changesActionResult = false");
    expect(batch).toContain("ActionCameraMode.PlayerFollow");
    expect(batch).toContain("ActionNaturalPlayerInput");
    expect(batch).toContain("ActionGameFeelController");
    expect(batch).toContain("ActionMinimalHud");
    expect(batch.toLowerCase()).toContain("natural action player augmentation is incomplete");
  });
});
