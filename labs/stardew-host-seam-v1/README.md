# Stardew Host Seam v0.1.0

A host-native Stardew Valley commodity layer for the AXM / RODOH / MotionDeck estate.

This package does **not** remake Stardew Valley, vendor community mods, or seize simulation authority. Stardew Valley, SMAPI, the active mod graph, and the player's saves remain authoritative. The seam owns admission, isolated profiles, dependency and conflict checks, launch planning, semantic action receipts, and the extension point for MotionDeck cabinet play.

## Implemented

- recursive SMAPI `manifest.json` inventory with bounded parsing;
- normalized mod and content-pack dependency graph;
- duplicate ID, missing dependency, missing entry DLL, self-edge, cycle, and unsafe-path refusal;
- policy admission for the current Stardew3DVR seam, including the known `Clear Glasses` renderer conflict;
- deterministic mod-graph and profile-lock digests;
- `native-2d`, `desktop-3d`, `hmd-vr`, and `cabinet-tv` launch profiles;
- non-destructive isolated Mods-profile staging by verified copy;
- explicit save snapshot transaction with content ledger and receipt;
- dependency-free Node CLI and qualification suite;
- PowerShell wrapper for the Windows estate;
- a SMAPI bridge source project that records lifecycle and semantic-presentation actions without taking gameplay authority;
- machine-readable upstream catalog, compatibility policy, action vocabulary, qualification corpus, and cabinet-TV contract.

## Deliberately not claimed

- No Stardew, SMAPI, Nexus, or community-mod binary is redistributed.
- The upstream Stardew3DVR DLL has not been patched or decompiled here.
- `cabinet-tv` is a governed integration target, not a falsely claimed finished renderer split. It still requires an in-process adapter that keeps OpenXR tracking live while emitting an authored monoscopic television camera.
- The C# bridge source is structurally qualified here, but this environment has neither the Stardew assemblies nor .NET SDK needed to compile it.
- No real save, installed mod set, Windows launch, headset, television, controller, or hand-tracking session is inferred from fixture tests.

## Commands

```text
node ./bin/stardew-seam.mjs discover

node ./bin/stardew-seam.mjs inspect \
  --game-dir "C:\Program Files (x86)\Steam\steamapps\common\Stardew Valley" \
  --out stardew-inspection.json

node ./bin/stardew-seam.mjs qualify \
  --game-dir "D:\SteamLibrary\steamapps\common\Stardew Valley" \
  --mode desktop-3d \
  --out stardew-profile-lock.json

node ./bin/stardew-seam.mjs plan \
  --game-dir "D:\SteamLibrary\steamapps\common\Stardew Valley" \
  --mods-dir "D:\MotionDeck\profiles\stardew-family\Mods" \
  --mode hmd-vr

node ./bin/stardew-seam.mjs stage-profile \
  --game-dir "D:\SteamLibrary\steamapps\common\Stardew Valley" \
  --source-mods-dir "D:\SteamLibrary\steamapps\common\Stardew Valley\Mods" \
  --profile-dir "D:\MotionDeck\profiles\stardew-family" \
  --mode desktop-3d

node ./bin/stardew-seam.mjs snapshot-saves \
  --saves-dir "%APPDATA%\StardewValley\Saves" \
  --backup-root "D:\MotionDeck\custody\stardew-saves"
```

The Windows wrapper exposes the same operations:

```powershell
.\powershell\Invoke-StardewHostSeam.ps1 `
  -Command Qualify `
  -GameDir 'D:\SteamLibrary\steamapps\common\Stardew Valley' `
  -Mode desktop-3d
```

## Exit codes

```text
0   admitted / command completed
1   execution or filesystem failure
2   qualification blocked by the discovered state
64  invalid command line
```

## Architecture

```text
Stardew Valley + save
  authoritative simulation and continuity

SMAPI + active mod graph
  host-native code/content seam and community world

Stardew3DVR or later presentation adapter
  alternate camera, render lift, world-space UI, motion interpretation

RODOH Stardew Bridge
  observation, semantic action vocabulary, receipts, adapter handshake

Stardew Host Seam
  discovery, graph custody, profile isolation, launch and rollback plans

MotionDeck / QuestStage
  device, display, OpenXR, television, spectator, household custody
```

The core rule is simple: **universal outside the game process; host-native inside it**.

## Qualification

```bash
npm test
npm run selftest
```

The suite creates synthetic SMAPI installations and proves both admission and refusal. It requires no network, package install, game binary, or community mod.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/UPSTREAM_HARVEST.md`](docs/UPSTREAM_HARVEST.md), [`docs/COMMUNITY_COMMODITY_MAP.md`](docs/COMMUNITY_COMMODITY_MAP.md), and [`docs/QUALIFICATION.md`](docs/QUALIFICATION.md).
