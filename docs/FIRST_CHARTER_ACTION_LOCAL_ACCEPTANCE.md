# First Charter action local acceptance

This is the first controlling physical run for the post-v1 action estate. It does not use the committed frog-pit action fixture as game authority and it does not require the operator to prepare an action-spec path by hand.

## Authority and project roots

The launcher keeps four owners separate:

- Arc action authority: `6eef311836ee7cb3a43a94ce51f448a2699c3b04`
- World Unity receiver: the clean checkout containing this script
- Unity project: `Embodied-AR-Lab` on Unity `6000.0.66f2`
- physical evidence: the later `axm-embodied` spool and journal lane

The launcher creates or reuses a detached Arc worktree at the exact authority commit. It never switches the operator's ordinary Arc checkout.

## First Unity and Windows run

Keep Unity Editor closed, then run from PowerShell:

```powershell
$world = "D:\Projects\axm-world"
$lab = "D:\Projects\Embodied-AR-Lab\worktrees\scene-compiler-v0.1-integration"
$arc = "D:\Projects\axm-arc"

& "$world\scripts\run-first-charter-action.ps1" `
  -EmbodiedArLabRoot $lab `
  -ArcRepositoryRoot $arc `
  -JobId "first-charter-action-001" `
  -SessionId "first-charter-action-001" `
  -DeviceId "windows-local" `
  -InitialQuality standard `
  -BuildWindows `
  -ForceCloseUnity
```

The launcher performs the following transaction:

1. refuses a dirty World checkout;
2. creates a detached Arc worktree at the exact action authority;
3. installs the exact Arc dependencies;
4. temporarily installs the reviewed real-cartridge adapter into that worktree;
5. compiles `The First Charter / The Cellar` through `compileActionEncounter`;
6. removes the temporary adapter and requires a clean Arc worktree;
7. binds the neutral presentation floor to the generated `actspec1_` identity;
8. runs `run-unity-action-estate-v3.ps1` with Unity tests enabled;
9. optionally builds and terminal-smokes the Windows player;
10. writes one digest-bound wrapper receipt.

## Quest build and optional installation

After the desktop run is green:

```powershell
& "$world\scripts\run-first-charter-action.ps1" `
  -EmbodiedArLabRoot $lab `
  -ArcRepositoryRoot $arc `
  -JobId "first-charter-action-quest-001" `
  -SessionId "first-charter-quest-001" `
  -DeviceId "quest-3-primary" `
  -Quest `
  -BuildQuest `
  -DevelopmentBuild `
  -InstallQuest `
  -QuestSerial "<adb-device-serial>" `
  -InitialQuality standard `
  -ForceCloseUnity
```

Omit `-InstallQuest` when only the exact APK is required. `-OneHanded`, `-DominantHand left`, `-ReducedMotion`, and `-HighContrast` are independent presentation and ingress options. They do not alter action law.

## Required retained evidence

For job `<job-id>`, retain:

```text
<lab>/local/scene-jobs/<job-id>/
  authority/
    first-charter.action-spec.json
    first-charter.action-spec.json.receipt.json
    first-charter.presentation.json
  input/
    action.unity-action-spec.json
    action.scene-job.json
  output/
    validation.json
    action-estate-v3-editmode-tests.xml
    local-run-v3.json
    first-charter-local-run.json
  build/receipts/
    build-run-windows.json          when -BuildWindows was used
    quest-build-run.json            when -BuildQuest or -InstallQuest was used
  logs/
```

The terminal wrapper receipt is:

```text
rodoh-first-charter-action-local-run/1
```

It binds the exact World commit, Arc action-authority commit, Arc cartridge digest, action-spec digest, action-spec SHA-256, presentation SHA-256, Unity estate receipt, and optional platform-build receipts.

## Acceptance boundary

A green local wrapper receipt proves that the real Arc challenge compiled and entered the actual Unity project through the maintained package and runner. The Windows build receipt additionally proves the generated player and internal terminal-state smoke. The Quest build receipt proves the APK and, when requested, installation to the named ADB device.

None of those records proves a physical Quest session. Physical acceptance still requires:

1. a real headset session;
2. guardian and tracking-loss observations;
3. immutable spool pull;
4. `axm-embodied` ingestion;
5. exact Arc replay of the candidate trace;
6. accepted `axm-action-receipt/1` attachment;
7. completed journal and Genesis-facing shard verification.

A physical safety stop remains `campaignEffect: null` and must never be converted into an Arc combat failure.
