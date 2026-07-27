# RODOH action physical-acceptance kit

This disposable kit runs the remaining machine-bound acceptance without modifying the frozen World action candidate.

It pins:

```text
World candidate       52162c757f905aae5c2383f6896de3b258e7cf8f
Arc action authority  6eef311836ee7cb3a43a94ce51f448a2699c3b04
Embodied custody      69b7f9a7bad5b4a94210313ca267a9b479402f09
Genesis kernel        9074e7fb2e9cedde692b248cdd0c6a805e77d8ac
Unity                  6000.0.66f2
```

The script creates detached worktrees at those exact commits. The acceptance kit itself is not the World product candidate and must not merge into it.

## Prepare

Keep Unity closed, connect the Quest with ADB, then run:

```powershell
.\Invoke-RodohActionPhysicalAcceptance.ps1 `
  -Phase Prepare `
  -WorldRepositoryRoot "D:\Projects\axm-world" `
  -ArcRepositoryRoot "D:\Projects\axm-arc" `
  -EmbodiedRepositoryRoot "D:\Projects\axm-embodied" `
  -EmbodiedArLabRoot "D:\Projects\Embodied-AR-Lab\worktrees\scene-compiler-v0.1-integration" `
  -QuestSerial "<adb-device-serial>" `
  -DevelopmentBuild `
  -ForceCloseUnity
```

Repository roots may also point to estate directories whose real checkout is the `main` child. `-AllowFetch` is optional and is required only when an exact pinned commit is absent locally.

Prepare performs the real Arc compilation, governed body and motion generation, Unity 6000 import and EditMode tests, Windows build and terminal smoke, Quest build and installation, exact package verification, and optional Quest launch. It then writes a plan with:

```text
status: awaiting-physical-execution
```

No physical or campaign result is accepted at this phase.

## Status

Complete the encounter in the headset, then use the exact plan path printed by Prepare:

```powershell
.\Invoke-RodohActionPhysicalAcceptance.ps1 `
  -Phase Status `
  -PlanPath "<physical-acceptance-plan.json>"
```

Status inspects only the immutable Quest spool. It requires the session start and index and reports the number of candidate and safety-observation entries. It does not pull the spool or accept an outcome.

## Complete

Run completion only when Status reports `candidate-ready`:

```powershell
.\Invoke-RodohActionPhysicalAcceptance.ps1 `
  -Phase Complete `
  -PlanPath "<physical-acceptance-plan.json>"
```

Completion pulls the exact Quest spool, ingests it through the pinned `axm-embodied` donor, replays the one provisional candidate through the exact Arc authority, attaches and verifies the accepted `axm-action-receipt/1`, verifies the embodied journal, and writes the Genesis-facing shard.

The terminal receipt is:

```text
rodoh-action-physical-acceptance/1
status: pass
```

It binds the frozen World, Arc, embodied, and Genesis commits; named Quest serial and model; application ID; Android session identity; cartridge and action-spec identities; candidate SHA-256; accepted receipt SHA-256; journal; and shard SHA-256.

## Boundary

A safety stop remains physical evidence with no campaign effect. The kit cannot turn it into an Arc combat failure. A Quest candidate remains provisional until exact Arc replay succeeds. An existing remote spool or local journal with the same session identity is refused rather than overwritten.
