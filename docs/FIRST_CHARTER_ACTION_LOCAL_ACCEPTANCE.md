# First Charter action local acceptance

This is the controlling physical run for the post-v1 action estate. It does not use the committed frog-pit fixture as game authority, and it does not require the operator to prepare an action-spec, presentation manifest, Android package name, or Quest spool path by hand.

## Authority and project roots

The launcher keeps four owners separate:

- Arc action authority: `6eef311836ee7cb3a43a94ce51f448a2699c3b04`
- World Unity receiver: the clean checkout containing these scripts
- Unity project: `Embodied-AR-Lab` on Unity `6000.0.66f2`
- physical evidence: the later `axm-embodied` spool and journal lane

The launcher creates or reuses a detached Arc worktree at the exact authority commit. It never switches the operator's ordinary Arc checkout. Arc remains the only accepted action and campaign authority. Unity bodies, controllers, camera, audio, haptics, and arena assets remain presentation.

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
7. binds the source presentation floor to the generated `actspec1_` identity;
8. generates one local governed player body, five distinct enemy-kit bodies, eight motion clips, two state-driven controllers, local materials, and the cartridge-selected arena recipe;
9. refuses active rigid-body, collider, CharacterController, root-motion, remote-runtime, or neutral-fallback authority in the governed production set;
10. compiles the completed estate through Unity and runs the action-package EditMode gate;
11. optionally builds and terminal-smokes the Windows player;
12. writes one digest-bound wrapper receipt.

Governed production is the default. `-NeutralPresentation` deliberately returns to the primitive fallback for constrained testing. That switch changes presentation only.

## Turnkey Quest physical session

The two-phase physical runner builds and smokes Windows, builds and installs Quest, records the exact Android application identifier and spool root, launches the package, and then stops before claiming any physical result:

```powershell
$embodied = "D:\Projects\axm-embodied"
$serial = "<adb-device-serial>"

& "$world\scripts\run-first-charter-physical-session.ps1" `
  -Phase Prepare `
  -EmbodiedArLabRoot $lab `
  -ArcRepositoryRoot $arc `
  -AxmEmbodiedRoot $embodied `
  -JobId "first-charter-quest-001" `
  -SessionId "first-charter-quest-001" `
  -DeviceId "quest-3-primary" `
  -QuestSerial $serial `
  -DevelopmentBuild `
  -InitialQuality standard `
  -ForceCloseUnity
```

Preparation refuses an existing remote spool or local journal with the same session identity. It writes:

```text
rodoh-first-charter-physical-session-plan/1
status: awaiting-physical-execution
```

The plan contains the exact World and Arc commits, `cart1_` and `actspec1_` identities, Unity scene-job digest, governed-production receipt, Windows smoke receipt, Quest APK receipt and SHA-256, Android application identifier, remote spool path, device identity, journal path, and the next two commands. It explicitly states that no physical or campaign outcome has been accepted.

Wear the headset and complete the encounter. Then inspect the remote spool without accepting it:

```powershell
& "$world\scripts\run-first-charter-physical-session.ps1" `
  -Phase Status `
  -PlanPath "$lab\local\scene-jobs\first-charter-quest-001\physical\physical-session-plan.json" `
  -Adb adb
```

Status writes `rodoh-first-charter-physical-session-status/1`. It reports only whether the exact session start, index, entries, safety observations, and exactly one provisional candidate exist. Its authority statement remains `Quest spool observation only; Arc replay still required`.

Only after status reports `candidate-ready` may the completion phase run:

```powershell
& "$world\scripts\run-first-charter-physical-session.ps1" `
  -Phase Complete `
  -PlanPath "$lab\local\scene-jobs\first-charter-quest-001\physical\physical-session-plan.json" `
  -Adb adb `
  -KeepPulledSpool
```

Completion pulls the immutable spool, requires the prepared Android session, device ID, Arc digest, action-spec digest, and Unity job digest, ingests it through `axm-embodied`, replays the candidate through the exact Arc worktree, attaches the accepted `axm-action-receipt/1`, verifies the journal, projects the Genesis-facing shard, and writes:

```text
rodoh-first-charter-physical-session-completion/1
status: pass
```

That terminal receipt binds the plan SHA-256, device and application identity, candidate SHA-256, accepted receipt SHA-256, journal, shard SHA-256, provisional-parity result, exact Arc action authority, and exact World candidate.

## Direct Quest build without physical orchestration

A standalone Quest build remains available when only the exact APK or installation is required:

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
  -QuestSerial $serial `
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
    action.governed-presentation.json
    action.unity-action-spec.json
    action.scene-job.json
  output/
    governed-production-assets.json
    governed-motion-augmentation.json
    governed-production-run.json
    validation.json
    action-estate-v3-editmode-tests.xml
    local-run-v3.json
    first-charter-local-run.json
  build/receipts/
    build-run-windows.json
    player-smoke-windows.json
    quest-build-run.json
  physical/
    physical-session-plan.json
    physical-session-status.json
    physical-session-completion.json        only after successful Arc replay
  logs/
```

Generated Unity assets remain under:

```text
<lab>/Assets/AXM/Generated/ActionProduction/GovernedV1/
```

The exact manifest ID creates a nested governed asset root containing materials, motion clips, controllers, six body prefabs, and the authored arena recipe.

## Direct completion from an existing spool

The lower-level return path remains available for a workstation-local spool or an already known Quest spool:

```powershell
& "$world\scripts\complete-embodied-action-session.ps1" `
  -AxmEmbodiedRoot $embodied `
  -FirstCharterRunReceipt "$lab\local\scene-jobs\<job-id>\output\first-charter-local-run.json" `
  -JournalPath "D:\RODOH\action-sessions\<session-id>" `
  -RemoteSpoolPath "/sdcard/Android/data/<application-id>/files/axm-action-session-spool/<session-id>" `
  -QuestSerial $serial `
  -KeepPulledSpool
```

For a workstation-local spool, replace `-RemoteSpoolPath` and `-QuestSerial` with:

```powershell
-SpoolPath "D:\RODOH\spools\<session-id>"
```

Before journal mutation, the completion runner requires:

- a passing `rodoh-first-charter-action-local-run/1` receipt;
- the exact Arc authority worktree and a pristine Arc checkout;
- the exact action-spec SHA-256 and `actspec1_` identity named by the launcher;
- exactly one provisional candidate in the spool;
- `authority: Arc replay required`;
- the same action-spec digest in the candidate and generated Arc spec.

## Acceptance boundary

A green local wrapper receipt proves that the real Arc challenge compiled and entered the actual Unity project through the maintained package and runner. The governed-production receipt proves the local asset set is complete and authority-safe. The Windows build receipt additionally proves the generated player and internal terminal-state smoke. The Quest build receipt proves the APK, application identifier, remote spool root, and, when requested, installation to the named ADB device.

None of those records proves a physical Quest session. Physical acceptance still requires a real Android spool created by the named Quest run, exactly one provisional candidate, immutable pull, `axm-embodied` ingestion, exact Arc replay, accepted receipt attachment, completed journal, and Genesis-facing shard verification. The two-phase physical runner makes that distinction executable.

A physical safety stop remains `campaignEffect: null` and must never be converted into an Arc combat failure.
