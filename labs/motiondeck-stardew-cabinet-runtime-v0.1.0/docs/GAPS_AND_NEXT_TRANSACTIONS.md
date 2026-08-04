# Remaining gaps

## Upstream renderer integration

The current public evidence establishes Stardew3DVR hotkeys and OpenXR modes, not a stable programmable spectator-camera API. The first live integration should prefer a public upstream API if one exists. Otherwise, place exact-version hotkey or Harmony behavior behind a narrow renderer adapter and refuse unknown renderer versions.

## Unworn Quest behavior

`XR_MND_headless` can permit a session without a graphics binding where supported. It does not prove that a Quest runtime continues useful tracking while the proximity sensor reports the HMD unworn. That needs direct device evidence.

## Television camera

Desktop duplication is not authored presentation. The accepted frame must identify the intended game window/display and demonstrate the correct camera, aspect ratio, crop, latency, and UI placement.

## Input

Controller discovery is not a semantic round trip. Acceptance must connect a physical action to a Stardew result and its receipt, then prove ordinary gamepad fallback without restarting the farm.

## Save continuity

The runtime does not own saves. The parent Stardew scene transaction must sleep-save, reload, remove the presentation cartridge, and load the same farm through ordinary SMAPI/native presentation.

## Physical player acceptance

No automated metric substitutes for the household player checking legibility, comfort, latency, camera behavior, recovery, and fun.
