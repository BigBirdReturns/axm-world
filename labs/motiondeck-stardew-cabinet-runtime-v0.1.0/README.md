# MotionDeck Stardew Cabinet Runtime v0.1.0

This package closes the next missing seam between the governed Stardew/SMAPI scene and the household cabinet topology.

It is **not another Stardew renderer**. `GingasVR.Stardew3D` remains the host-native presentation supplier. This package owns the local machine boundary which that renderer cannot honestly own by itself:

```text
Stardew Valley + selected SMAPI graph
        |
        | versioned JSON SMAPI API
        v
BigBirdReturns.MotionDeckCabinetRuntime provider mod
        |
        | authenticated local named pipe / Unix socket
        v
MotionDeck cabinet host
        |
        +-- OpenXR runtime probe
        +-- television/display selection
        +-- exact renderer and fallback hooks
        +-- lease watchdog and emergency disarm
        +-- frame and event evidence
        +-- signed physical acceptance records
```

## Exact identities

```text
renderer
GingasVR.Stardew3D

Stardew control plane
BigBirdReturns.RodohStardewCabinetAdapter 0.2.0

SMAPI runtime provider
BigBirdReturns.MotionDeckCabinetRuntime 0.1.0

external host package
@axm/motiondeck-stardew-cabinet-runtime 0.1.0
```

## What is implemented

- authenticated local IPC with bounded newline-delimited JSON;
- one-string SMAPI API boundary, avoiding provider-owned record types across assemblies;
- deterministic request and response identities;
- idempotent request handling with request-ID collision refusal;
- exclusive transaction ownership;
- bounded renewable device/display lease;
- watchdog disarm when heartbeats stop;
- operator fail-safe disarm which does not require the original adapter transaction;
- fixture, commissioning, and operational evidence modes;
- Windows OpenXR and display observation plane;
- exact no-shell command hooks for arm, disarm, renderer modes, recenter, fallbacks, and capture;
- hash-chained, credential-redacted JSONL evidence ledger;
- Ed25519-signed physical-evidence admission;
- dependency-free diagnostic PNG generation for synthetic qualification;
- source-complete SMAPI provider and v0.2 cabinet adapter;
- native C++ OpenXR probe pinned to Khronos OpenXR SDK 1.1.62 source;
- cross-platform Node contract tests and Windows native-build workflow.

## Authority model

Three modes exist, and they are deliberately not synonyms.

### `synthetic`

Only the bounded fixture adapter may arm. Every required capability must be available at the `synthetic` tier.

```text
local lease: simulated
product authority: none
production authority: none
```

### `commissioning`

The live adapter and every required capability must be available at least at the `probed` tier. This is for wiring commands, displays, and logs before physical acceptance.

```text
local lease: commissioning only
product authority: none
production authority: none
```

### `operational`

Every required capability must be present in a complete, unexpired, machine-bound, Ed25519-signed physical-evidence document. The adapter must then successfully execute the exact arm hook.

```text
local authority: local-device-display-lease
player-product authority: still external to this package
production authority: none until the complete Stardew transaction is accepted
```

OpenXR runtime discovery, `XR_MND_headless`, a connected headset, a configured television ID, or a hotkey never proves unworn-HMD cabinet play by itself.

## Required capabilities

```text
openxr.tracking.unworn-hmd
display.television.monoscopic
input.quest-controller
input.gamepad-fallback
presentation.native-2d-fallback
tracking.recenter
evidence.frame-capture
```

## Fixture transaction

```powershell
pwsh ./powershell/Invoke-MotionDeckCabinetRuntime.ps1 -Command Selftest
```

Or directly:

```text
node ./bin/motiondeck-cabinet-runtime.mjs selftest
```

The selftest starts a private local server, proves operational refusal, arms the synthetic fixture, renews its lease, recenters, captures a non-degenerate PNG, exercises controller and native-2D fallbacks, disarms, and reopens the evidence ledger to verify its hash chain.

## Live server

Create a machine-specific config from `config/default.json` and `fixtures/windows-config.example.json`, then:

```powershell
pwsh ./powershell/Invoke-MotionDeckCabinetRuntime.ps1 `
  -Command Serve `
  -Config .\cabinet.local.json
```

The server creates a private token file and listens on:

```text
\\.\pipe\BigBirdReturns.MotionDeckCabinetRuntime.v1
```

The token is consumed by the SMAPI provider mod. It is never returned through IPC or written to evidence.

## Native OpenXR probe

The optional native helper observes:

- the Windows active-runtime manifest;
- runtime name and version;
- instance extensions;
- HMD system availability;
- whether `XR_MND_headless` exists;
- whether a headless session and local reference space can be created.

It always emits:

```text
observationsOnly: true
productAuthority: none
headless.provesUnwornHmdTracking: false
```

Build it on Windows:

```powershell
cmake -S .\native -B .\native\build -A x64
cmake --build .\native\build --config Release --parallel
.\native\build\Release\motiondeck-openxr-probe.exe --selftest
.\native\build\Release\motiondeck-openxr-probe.exe --probe
```

## Source qualification

```text
npm run verify-source
npm run check
npm test
npm run selftest
```

## Deliberately unqualified

This package does not claim that:

- the SMAPI projects compile without an owned Stardew installation;
- Stardew3DVR exposes a stable direct camera API;
- Quest tracking continues while the HMD is physically unworn;
- a television receives the intended authored camera;
- tracked controllers or hands complete an in-game action round trip;
- a real frame contains the correct Stardew view;
- native 2D restores successfully after a cabinet failure;
- a farm saves, reloads, and survives removal of the presentation cartridge;
- a household player accepts the experience.

Those are the next live and physical transactions. The package makes them executable and fail-closed; it does not substitute synthetic evidence for them.

## Physical-evidence operator tools

Generate a signing keypair once for the acceptance operator:

```text
node ./bin/motiondeck-cabinet-runtime.mjs keygen \
  --private-key ./operator.private.pem \
  --public-key ./operator.public.pem
```

Sign a completed unsigned acceptance document:

```text
node ./bin/motiondeck-cabinet-runtime.mjs sign-evidence \
  --input ./physical-evidence.unsigned.json \
  --private-key ./operator.private.pem \
  --out ./physical-evidence.signed.json
```

Verify it independently before adding the public key ID and path to the machine config:

```text
node ./bin/motiondeck-cabinet-runtime.mjs verify-evidence \
  --input ./physical-evidence.signed.json \
  --public-key ./operator.public.pem \
  --machine-fingerprint cabinetmachine1_<sha256>
```

The private key is never consumed by the runtime host.
