# Upstream harvest and consumption map

## SMAPI

Consume as the host substrate. Do not replace its loader, manifest model, event loop, compatibility rewriting, update checks, error containment, or save-backup behavior.

Project use:

- discover and launch the real SMAPI executable;
- use `--mods-path` to bind an isolated profile;
- validate the same manifest fields SMAPI uses before launch;
- emit a graph receipt that can be attached to a MotionDeck session;
- build companion code against the official mod build package.

## Content Patcher and content packs

Treat loaded content as world authority. The presentation adapter should observe the assets and maps the host has resolved, not a manually curated replacement catalog.

Project use:

- classify content packs by `ContentPackFor`;
- require their host framework in the dependency graph;
- keep opaque IDs and paths intact;
- qualify representative expansion packs as compatibility corpora rather than project-owned content.

## Generic Mod Config Menu

Consume as the ordinary player configuration surface. Do not create a competing RODOH settings ontology for every upstream option.

Project use:

- recommend GMCM when the 3D renderer is present;
- keep MotionDeck settings limited to machine, profile, display, device, and mode custody;
- let renderer-specific pitch, yaw, turning, performance, and cutscene choices remain renderer settings.

## Stardew3DVR

Consume as the current presentation adapter rather than rebuilding its completed work.

Harvested mechanisms:

- hot transition among native 2D, desktop 3D, and VR;
- procedural use of live sprite and map data;
- voxel-like building/object lift and crossed-plane vegetation;
- OpenXR and SteamVR paths;
- motion tools, melee, and fishing;
- world-space menu pointer;
- wrist HUD;
- explicit cutscene and construction fallbacks;
- compatibility-first refusal to require bespoke replacement models.

Project improvement:

- pin the externally acquired package by manifest and optional directory digest;
- isolate it in a profile;
- preflight the known Clear Glasses conflict;
- add RODOH semantic receipts without taking gameplay authority;
- specify the cabinet-TV handshake;
- build an adapter-version boundary instead of scattering renderer assumptions through MotionDeck.

## Major content suites

Stardew Valley Expanded, Ridgeside Village, and East Scarp belong in the qualification corpus because they exercise the actual promise: the presentation layer follows a materially extended community world.

They remain holder-acquired external content. Their inclusion in a test plan does not authorize redistribution.

## Mod managers

Existing managers may remain acquisition and user-facing composition tools. The Stardew Host Seam does not need to replace their browsing or download UX.

The project-owned value is downstream:

```text
selected installed graph
  -> fail-closed admission
  -> isolated immutable profile candidate
  -> save snapshot
  -> exact launch
  -> semantic and physical session receipts
  -> rollback and repair
```

## What not to take

- Do not vendor Nexus packages without redistribution authority.
- Do not copy community art into project assets merely because it can be read at runtime.
- Do not rebrand SMAPI configuration as a proprietary cartridge format.
- Do not make the mod manager, dashboard, or headset shell the game.
- Do not hand-author 3D replacements for every expansion before accepting procedural presentation.
- Do not claim all-mod compatibility from a small fixture corpus.
