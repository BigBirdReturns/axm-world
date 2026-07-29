import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const runtime = (path: string) => readFileSync(resolve(ROOT, "unity/Packages/com.axm.rodoh-action/Runtime", path), "utf8");
const editor = (path: string) => readFileSync(resolve(ROOT, "unity/Packages/com.axm.rodoh-action/Editor", path), "utf8");

describe("Unity natural action player plane", () => {
  it("uses player-follow free look instead of encounter-wide diorama framing", () => {
    const source = runtime("Unity/ActionCombatCamera.cs");
    expect(source).toContain("cameraMode = ActionCameraMode.PlayerFollow");
    expect(source).toContain("public void AddLook(Vector2 deltaDegrees)");
    expect(source).toContain("public Vector2 PlanarForward");
    expect(source).toContain("private ActionActorBinding FindPlayer()");
    expect(source).toContain("UpdatePlayerFollow()");
    expect(source).toContain("UpdateGroupFraming()");
    expect(source).toContain("Time.unscaledTime - _lastManualLookTime >= recenterDelay");
  });

  it("maps ordinary mouse keyboard and gamepad intent through the camera basis", () => {
    const source = runtime("Unity/ActionNaturalPlayerInput.cs");
    expect(source).toContain("cameraRig.PlanarForward");
    expect(source).toContain("cameraRig.PlanarRight");
    expect(source).toContain("right * move.x + forward * move.y");
    expect(source).toContain("Input.GetMouseButton(0)");
    expect(source).toContain("Input.GetMouseButton(1)");
    expect(source).toContain("KeyCode.Space");
    expect(source).toContain("KeyCode.Q");
    expect(source).toContain("router.SetInteract(Input.GetKey(KeyCode.E)");
    expect(source).toContain("CursorLockMode.Locked");
    expect(source).toMatch(/router\?*\.SetDesktopKeyboardFallback\(false\)/);
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

  it("routes exact Arc state through one selected presentation adapter", () => {
    const contract = runtime("Unity/IActionPresentationAdapter.cs");
    const host = runtime("Unity/ActionRuntimeBehaviour.cs");
    const diagnostic = runtime("Unity/ActionPrimitivePresentation.cs");
    const production = runtime("Unity/ActionProductionPresentation.cs");
    const batch = editor("ActionPolishAugmentBatch.cs");

    expect(contract).toContain("public interface IActionPresentationAdapter");
    expect(contract).toContain("void Initialize(ActionSpecProjection spec, ActionSimulationState state)");
    expect(contract).toContain("void Render(ActionSimulationState state, float interpolation)");
    expect(contract).toContain("void ApplyEvents(IReadOnlyList<ActionEvent> events)");
    expect(host).toContain("private IActionPresentationAdapter _presentation");
    expect(host).toContain("_presentation?.ApplyEvents(_state.events)");
    expect(host).not.toContain("private ActionPrimitivePresentation presentation;");
    expect(diagnostic).toContain("IActionPresentationAdapter");
    expect(diagnostic).toContain('AdapterId => "diagnostic.primitive/v1"');
    expect(diagnostic).toContain("DiagnosticOnly => true");
    expect(production).toContain("IActionPresentationAdapter");
    expect(production).toContain('AdapterId => "production.prefab/v1"');
    expect(production).toContain("DiagnosticOnly => false");
    expect(production).not.toContain("runtime.TickAdvanced += ApplyState");
    expect(batch).toContain("runtime.ConfigurePresentation(production, false)");
    expect(batch).toContain("primitive.enabled = false");
    expect(batch).toContain('receipt.presentationAdapterId != "production.prefab/v1"');
  });

  it("adds contact holds without hidden state or trace advancement", () => {
    const host = runtime("Unity/ActionRuntimeBehaviour.cs");
    const feel = runtime("Unity/ActionGameFeelController.cs");
    expect(host).toContain("public void RequestPresentationHold(float seconds)");
    expect(host).toContain("if (_presentationHoldRemaining > 0f)");
    expect(host).toContain("return;");
    expect(feel).toContain("runtime.RequestPresentationHold(seconds)");
    expect(feel).toContain("eventName == \"parry\"");
    expect(feel).toContain("animator.speed = 0f");
  });

  it("keeps receipts behind the player surface and installs a minimal game HUD", () => {
    const hud = runtime("Unity/ActionMinimalHud.cs");
    const batch = editor("ActionPolishAugmentBatch.cs");
    expect(hud).toContain("WASD move");
    expect(hud).toContain("LMB sweep");
    expect(hud).toContain("RMB crush");
    expect(hud).toContain("HOLD E  ·  WORK");
    expect(hud).not.toContain("candidateFileName");
    expect(hud).not.toContain("receiptDigest");
    expect(batch).toContain("ActionCameraMode.PlayerFollow");
    expect(batch).toContain("ActionNaturalPlayerInput");
    expect(batch).toContain("ActionGameFeelController");
    expect(batch).toContain("ActionMinimalHud");
    expect(batch.toLowerCase()).toContain("natural action player augmentation is incomplete");
  });
});
