# Qualification ladder

## Gate 0: source floor

The dependency-free Node suite must pass on Linux and Windows.

It proves:

- bounded manifest parsing;
- deterministic graph digests;
- dependency ordering;
- duplicate, missing, cycle, path-escape, and known-conflict refusal;
- mode requirements;
- isolated profile copy;
- save snapshot custody;
- deterministic receipts.

This gate does not prove SMAPI or Stardew execution.

## Gate 1: installed-machine preflight

Run `qualify` against the exact selected installation and profile.

Required evidence:

```text
Stardew executable present
SMAPI executable present
Mods directory present
all manifests bounded and readable
all entry DLLs present
required dependencies complete
no duplicate IDs
no required cycles
no hard conflict
renderer present for 3D/VR modes
RODOH bridge present for cabinet-TV
profile lock written
```

## Gate 2: profile custody

Before first launch:

1. snapshot the selected saves;
2. stage a copied profile;
3. rescan the staged profile;
4. require the staged graph digest to equal the source candidate;
5. retain `profile.lock.json` beside the copied Mods tree;
6. launch only with the exact staged `--mods-path`.

## Gate 3: ordinary player transaction

The host bridge and SMAPI log should prove:

```text
GameLaunched
selected graph and renderer presence
SaveLoaded
presentation mode action
world interaction
save start and save completion
ReturnedToTitle
```

The software transaction must exercise:

```text
load existing farm
2D -> 3D -> target mode -> 2D
walk and map transition
interact and dialogue
tool use and charge
inventory and shop
fishing
combat
cutscene fallback
sleep and save
reload exact profile
disable profile and load natively
```

A save hash or semantic comparison must show that disabling the presentation profile does not strand the farm in a presentation-owned format.

## Gate 4: expansion corpus

Repeat Gate 3 with externally acquired, exact-version profiles for:

- a representative Content Patcher pack;
- Stardew Valley Expanded;
- Ridgeside Village;
- East Scarp;
- a deliberately incompatible Clear Glasses profile that must refuse before launch.

Results are profile- and version-bounded. “All mods” is never inferred.

## Gate 5: HMD VR

Qualify the exact OpenXR runtime, headset path, controller bindings, wrist HUD, menu pointer, tool angle, recenter, frame timing, and fallback transitions.

This gate is separate from desktop 3D because device and runtime custody are different even when the same renderer DLL is used.

## Gate 6: cabinet-TV

The adapter must prove all of the following on one exact profile:

```text
OpenXR controller or hand poses continue updating
television receives a monoscopic authored camera
no HMD-worn view is required for the player transaction
camera remains stable across map transitions and menus
ordinary controller works without mode reconstruction
tracked and ordinary input can hand off without save or process restart
2D fallback remains available
spectator output cannot alter simulation state
```

Until Gate 6 exists, the package truthfully exposes `cabinet-tv` as a blocked target contract. It requires the exact `BigBirdReturns.RodohStardewCabinetAdapter` manifest and still cannot claim real operation until the renderer-bound adapter and physical transaction pass.

## Evidence vocabulary

```text
source-qualified
  code and deterministic fixtures passed

machine-admitted
  exact installation and profile passed preflight

host-executed
  Stardew and SMAPI completed the bounded journey

hmd-qualified
  exact OpenXR/HMD path passed

cabinet-qualified
  unworn-headset television path passed
```

These terms must not be collapsed into a single percentage.
