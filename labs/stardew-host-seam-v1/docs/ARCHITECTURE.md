# Architecture: consume the Stardew scene without bending to it

## Controlling decision

The Stardew seam is a host-native adapter ecology, not a new engine and not a launcher page that merely points at community projects.

The active Stardew process already contains the valuable authority:

- exact save continuity;
- calendar, economy, relationship, quest, combat, farming, fishing, and event state;
- map and asset data loaded by the game;
- SMAPI code mods;
- Content Patcher and other content-pack outputs;
- expansion locations, NPCs, objects, crops, dialogue, and encounters;
- the player's chosen compatibility compromises.

RODOH and MotionDeck should consume those authorities and add bounded capabilities around them. They should not translate the world into a second private cartridge ontology before the player can use it.

## Five planes

### 1. Host authority

Stardew Valley and the selected save decide what exists and what happens. The seam never claims to replay the simulation independently.

### 2. Mod-graph authority

SMAPI manifests define code mods, content packs, dependencies, update keys, and loadable entry points. The host seam inventories that graph, verifies its local shape, and refuses known unsafe combinations before launch.

The graph digest is not a claim that all mod binaries are trusted. It is a custody identifier for the exact local selection. A future malware or trust service can add signatures and attestations without changing the graph model.

### 3. Presentation authority

An in-process renderer such as Stardew3DVR consumes the game and mod scene after it has loaded. That position is the reason procedural presentation can follow content that was never hand-converted for RODOH.

The renderer may own:

- perspective or stereo cameras;
- sprite-to-volume and billboard projection;
- world-space HUD and menu projection;
- tracked tool pose interpretation;
- cutscene fallback policy;
- per-map visual workarounds.

It may not silently become save or simulation authority.

### 4. Semantic action plane

RODOH names player intention independently of any one device:

```text
locomotion.move
tool.use
world.interact
fishing.hook
menu.pointer-primary
presentation.recenter
```

The SMAPI bridge records presentation and lifecycle events and becomes the handshake point for later adapters. It deliberately does not reflect into private renderer internals or synthesize gameplay outcomes.

### 5. Machine and household custody

MotionDeck owns what should remain universal:

- installation and Steam-library discovery;
- isolated Mods profiles;
- save snapshots and rollback;
- executable and process custody;
- display and audio routing;
- controller, OpenXR, hand, and accessibility device selection;
- television spectator framing;
- evidence and repair receipts.

## Profile model

Each profile binds:

```text
selected game directory
selected SMAPI executable
selected Mods directory
manifest and optional package fingerprints
resolved dependency order
mode
launch arguments
device/display requirements
save-snapshot policy
known compatibility decisions
```

Profiles are copied rather than linked by default. Many SMAPI mods write `config.json` beside their DLL, so sharing one mod directory across household modes would leak settings between profiles.

## Cabinet-TV boundary

`cabinet-tv` is not ordinary headset mirroring. The host seam refuses the mode unless the exact project-owned adapter ID `BigBirdReturns.RodohStardewCabinetAdapter` is present in the selected SMAPI graph.

Its required split is:

```text
OpenXR tracking and controller poses
  remain live

HMD eye cameras
  are not the household player's required view

television camera
  is monoscopic, stable, authored, and game-aware

native input
  remains an immediate fallback

2D / desktop 3D
  remain callable fallbacks inside the same save session
```

The correct implementation point is a companion in-process adapter beside the renderer, not screen scraping. The adapter should use a public renderer handshake when one exists. Until then, any Harmony or binary-interoperation work must be isolated behind an exact upstream-version adapter and refused on unknown versions.

## Extension standard for other games

The same outer contract applies elsewhere, while the inner host adapter changes:

```text
Stardew      SMAPI
MAME         emulator-native hooks and machine metadata
Alyx         Source 2 / established mod seam
Unity games  Unity plugin or project-native receiver
other games  supported mod loader or engine hook first; external adaptation only as fallback
```

This is the commodity: one custody and semantic-action floor, many host-native adapters.
