# Windows commissioning sequence

## 1. Build and run the native probe

```powershell
cmake -S .\native -B .\native\build -A x64
cmake --build .\native\build --config Release --parallel
.\native\build\Release\motiondeck-openxr-probe.exe --probe
```

Record the active runtime, runtime version, extension set, and HMD system result. A headless-session result is diagnostic only.

## 2. Enumerate displays

```powershell
pwsh -NoProfile -File .\powershell\Probe-Displays.ps1
```

Set the exact television `DeviceName` as `windows.televisionDisplayId`.

## 3. Implement exact hooks

At minimum:

```text
arm
disarm
recenter
controllerFallback
native2dFallback
rendererCabinetTv
rendererNative2d
captureFrame
```

Hooks must return nonzero on failure. Arm and disarm must be safe to retry.

## 4. Start in commissioning mode

Commissioning mode may exercise probed providers but has no authority. Verify:

- wrong display is refused;
- absent runtime is refused;
- stopped heartbeats disarm;
- controller fallback works while tracked input is unavailable;
- native 2D restores after a forced renderer failure;
- the output PNG is not a desktop or wrong-window capture.

## 5. Produce signed physical evidence

After the complete acceptance corpus passes, create one record per required capability, sign the document with an Ed25519 key, and configure the corresponding public key under `trustedEvidenceKeys`.

## 6. Exercise operational mode

Operational mode should be attempted only after the signed document is installed. Re-run all fallback and watchdog failures. Then perform the parent product transaction:

```text
load farm
2D -> desktop 3D -> HMD VR -> cabinet TV -> 2D
tracked-input actions
controller fallback
save through sleep
reload
remove presentation cartridge
load the same farm normally
physical player acceptance
```
