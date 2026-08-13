# RODOH Action Runtime Bridge for Unity

This package makes Unity a renderer and embodied-input adapter for Arc-owned action encounters. It does not create a second combat resolver.

The authority chain is:

```text
Arc cartridge + challenge
  -> axm-action-spec/1
  -> Unity projection and 30 Hz conformance mirror
  -> quantized action input trace
  -> Arc replay and axm-action-receipt/1
  -> ordinary Arc cycle consequence
```

Unity owns tracked poses, control mapping, scene construction, visual interpolation, animation, camera, VFX, audio, haptics, and accessibility presentation. Arc owns action law, replay, accepted outcome, rewards, stress, relationships, progression, state mutation, and final receipt custody.

## Package layout

- `Runtime/Core`: dependency-free integer action mirror and trace recorder.
- `Runtime/Unity`: MonoBehaviour runner, embodied input router, tracked-pose quantizer, and primitive presentation.
- `Editor`: batch scene compiler and validation receipt writer.
- `Tests/Editor`: Unity EditMode conformance and boundary tests.

## Embodied-AR-Lab batch path

From an elevated PowerShell session with Unity Editor closed:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\run-unity-action-bridge.ps1 `
  -EmbodiedArLabRoot D:\Projects\Embodied-AR-Lab\worktrees\scene-compiler-v0.1-integration `
  -ActionSpec .\unity\Fixtures\frog-pit.unity-action-spec.json `
  -JobId frog-pit-001
```

The acceptance receipt is written to:

```text
local\scene-jobs\frog-pit-001\output\validation.json
```

A passing bridge receipt proves that Unity parsed the exact projected spec, built a scene, advanced the deterministic mirror twice with identical results, preserved the Arc spec digest, and left Unity physics outside combat authority. It does not by itself prove that Arc accepted the final action receipt or that a physical room is safe for locomotion.
