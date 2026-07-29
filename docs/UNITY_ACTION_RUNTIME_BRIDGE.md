# Unity action runtime bridge

## Purpose

The Unity bridge turns an Arc-owned `axm-action-spec/1` encounter into a spatial, animated, embodied play surface without allowing Unity to become a second combat or campaign authority.

The bridge is deliberately split into five records:

```text
Arc cartridge challenge
  -> axm-action-spec/1                 authoritative action law
  -> rodoh-unity-action-spec/1         lossless Unity-friendly projection
  -> quantized 30 Hz input trace       player execution evidence
  -> provisional Unity candidate       renderer-side custody, no outcome authority
  -> axm-action-receipt/1              Arc replay, verification, and accepted outcome
```

Unity may render a provisional success or failure immediately for responsiveness. The campaign changes only after Arc reconstructs the exact action spec, replays the trace, verifies the terminal state, and applies the ordinary challenge outcome through the shared cycle.

## Existing estate reused

This train uses the existing Embodied-AR-Lab rather than building another engine shell. The expected integration project is the Unity 6000.0.66f2 scene-compiler worktree whose runner already waits for compilation, emits machine receipts, and accepts only `local/scene-jobs/<job>/output/validation.json` with `status = pass`.

The existing scene compiler contributes:

- a licensed, proven Unity batch path;
- deterministic scene-job directories and output custody;
- the accepted `unit-box-v1` primitive identity and mesh-validation discipline;
- standalone build and smoke-test infrastructure;
- Quest and desktop presentation experiments;
- camera, tracking, and registration work that is already separate from semantic authority.

The action bridge contributes:

- the Arc action-spec projection;
- a dependency-free integer C# conformance mirror;
- fixed-step trace recording;
- a Unity scene compiler entry point;
- a low-power primitive renderer;
- tracked-pose input quantization;
- a physical-session stop gate;
- a provisional execution candidate that Arc can replay.

The Unity project should reuse its existing scene compiler for production arena geometry. The package's primitive arena is a cold-start proof and fallback, not a competing asset pipeline.

## Authority boundary

### Arc owns

- cartridge identity and authored challenge meaning;
- action profile, action spec, and their digests;
- fixed-step combat law and conformance vectors;
- accepted success, partial, or failure classification;
- rewards, stress, morale, relationships, state tracks, progression, and ledger writes;
- final `axm-action-receipt/1` creation and verification.

### World and Unity own

- loading and presenting the exact action spec;
- sampling keyboard, controller, accessibility, XR, hand, body, or remote input;
- quantizing that input into the four bounded buttons and four signed axes;
- scene construction, art, animation, camera, VFX, audio, haptics, and interpolation;
- preserving the compressed input trace and source spec digest;
- showing a provisional terminal result while Arc verification completes.

### Unity physics does not own

- hit detection;
- dodge invulnerability;
- parry windows;
- enemy damage;
- stagger;
- objective completion;
- success, partial, or failure;
- any campaign consequence.

Primitive colliders are disabled and the bridge creates no `Rigidbody`. Production scenes may use colliders for camera obstruction, raycasts, foot placement, environmental presentation, or physical-space safety, but those queries cannot determine the action receipt.

## Low-power execution model

The simulation runs at an exact 30 Hz using integers. Rendering may run at any supported display rate and interpolate presentation between ticks. The core uses no rigid-body world, NavMesh authority, runtime inference, procedural planning, dynamic shadow requirement, or post-processing requirement. The first production target is twelve active enemies, one player, one unshadowed directional light, bounded primitive or instanced geometry, and presentation quality that degrades without changing the trace or result.

Unity's value is concentrated where it produces the most perceptual return:

- humanoid and non-humanoid animation graphs;
- retargeted motion libraries;
- Animation Rigging and procedural look/aim layers;
- camera framing, impulse, hit stop, and time-domain presentation;
- GPU particles and trails driven by deterministic events;
- spatial audio and haptics;
- Quest tracking and passthrough composition;
- asset import, LOD, texture compression, batching, and platform builds.

None of those systems needs to recompute combat truth.

## Embodied input

`ActionInputRouter` is the only ingress into the fixed-step runner. Continuous sources set move and aim vectors. Discrete sources latch light, heavy, dodge, and parry edges for the next simulation tick. This allows several input embodiments to coexist:

- keyboard and controller;
- seated XR controller sticks and buttons;
- hand-tracked explicit gestures;
- room-scale displacement converted into directional intent;
- accessibility switches or dwell controls;
- remote or recorded traces.

`TrackedPoseQuantizer` converts horizontal tracked velocity into bounded directional intent with deadzone, hysteresis, and smoothing. It does not write the action position directly. A tracking recenter therefore changes the input frame rather than silently teleporting the authoritative player state.

Attack gestures should remain explicit, small, and independently calibratable. A punch-like motion may trigger `light`, but the physical hand trajectory does not become a hitbox. Arc determines whether the attack connects from the action state and authored timing law.

## Physical-session safety

`ActionSafetyGate` stops the Unity session on non-finite tracking, a discontinuous tracking jump, excessive vertical deviation, insufficient guardian clearance, an unknown guardian state when required, or loss of application focus. A safety stop produces `rodoh-embodied-action-observation/1`, clears continuous input, and pauses the action runner. It does not invent a campaign failure.

The observation is an input to the existing `axm-embodied` evidence path. It can be sealed as physical-session evidence beside camera or sensor captures. It is distinct from the action receipt:

- the action receipt says what the deterministic game encounter accepted;
- the embodied observation says why the physical presentation stopped;
- neither record may claim the authority of the other.

## Scene compiler contract

The batch method is:

```text
Axm.Rodoh.Action.Editor.ActionBridgeBatch.Run
```

Required argument:

```text
-actionSpec <path-to-rodoh-unity-action-spec.json>
```

Supported arguments:

```text
-outputRoot <receipt-directory>
-jobId <stable-job-id>
-scenePath Assets/<path>/<scene>.unity
-createDesktopRig true|false
```

The compiler:

1. parses and validates the projected spec;
2. preserves the Arc cartridge and action-spec identities;
3. embeds the projection as a Unity `TextAsset`;
4. creates a scene containing the runtime, input router, and presentation adapter;
5. optionally creates a desktop camera and unshadowed light;
6. advances a deterministic policy trace to a terminal state;
7. replays the compressed trace from the same seed;
8. refuses divergent fingerprints or enabled physics authority;
9. saves the scene;
10. writes `validation.json`.

A pass receipt includes the Unity version, source digests, tick rate, scene path, trace and state fingerprints, deterministic replay result, and physics-authority refusal.

## Installing into Embodied-AR-Lab

The turnkey PowerShell runner embeds the package under the Unity project's `Packages` directory, runs the scene compiler, validates the receipt, then runs the package EditMode tests:

```powershell
cd D:\Projects\axm-world

powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\run-unity-action-bridge.ps1 `
  -EmbodiedArLabRoot D:\Projects\Embodied-AR-Lab\worktrees\scene-compiler-v0.1-integration `
  -ActionSpec .\unity\Fixtures\frog-pit.unity-action-spec.json `
  -JobId frog-pit-001
```

Unity Editor must be closed. The runner defaults to:

```text
C:\Program Files\Unity\Hub\Editor\6000.0.66f2\Editor\Unity.exe
```

The output estate is:

```text
local/scene-jobs/frog-pit-001/
  logs/
    unity-action-compile.log
    unity-action-tests.log
  output/
    validation.json
    action-editmode-tests.xml
    local-run.json
```

## Native spec projection

`project-action-spec.mjs` converts one trusted Arc `axm-action-spec/1` JSON object into the Unity array-oriented projection consumed by `JsonUtility`:

```bash
node unity/Conformance/project-action-spec.mjs \
  encounter.action-spec.json \
  encounter.unity-action-spec.json
```

The converter is strict, refuses unknown fields, preserves the exact Arc and action-spec digests, orders player attacks and enemy laws canonically, enforces the twelve-enemy ceiling, and does not recalculate or reinterpret action law.

## Conformance ladder

The bridge is not complete merely because a Unity scene opens. Acceptance advances through these gates:

1. **Source pin.** World names the exact accepted Arc action-authority commit.
2. **Projection parity.** Native action spec deterministically rebuilds the committed Unity projection.
3. **Source-law parity.** Format identifiers, kits, tick rate, and fixed numeric laws match the pinned Arc source.
4. **C# determinism.** The dependency-free mirror reaches the same state twice from an identical trace.
5. **Unity compilation.** Unity imports the package and builds the generated scene.
6. **Unity EditMode tests.** Input latching, trace compression, deterministic replay, identity custody, and physics refusal pass.
7. **Arc replay parity.** Arc and C# produce the same canonical state and result for maintained cross-language vectors.
8. **Campaign commit.** Arc accepts the execution and performs the ordinary consequence write exactly once.
9. **Quest presentation.** The same trace and receipt survive headset tracking, reduced rendering quality, pause, resume, and export.
10. **Two-cartridge generalization.** Two materially different cartridges compile into distinct Unity fights with no challenge-id branch.

Gates 1 through 6 are implemented by this branch. Gate 7 is the next hard boundary. Until it closes, the C# runtime is a conformance mirror and Unity output remains provisional.

## Production sequence

After cross-language state parity, production work should proceed through shared kits rather than individual encounters:

- one canonical player skeleton and three moveset families;
- one event-to-animation contract for startup, active, recovery, dodge, parry, stagger, defeat, and objective transitions;
- five enemy behavior and silhouette kits matching Arc's bounded enemy laws;
- ring, lane, and islands scene-compiler templates;
- one low-cost impact stack consisting of pose response, contact flash, short trail, camera impulse, hit stop, audio cue, and optional haptic pulse;
- deterministic event capture for animation and presentation regression;
- cartridge-owned environment, body, material, audio, and motif manifests with a complete neutral fallback.

The control question for every Unity feature is whether it increases embodied legibility or production value while leaving the Arc trace, replay, and campaign consequence unchanged.
