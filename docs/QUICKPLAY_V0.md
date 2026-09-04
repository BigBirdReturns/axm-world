# AXM QuickPlay v0

QuickPlay exists to optimize one denominator: **prompt to playable game**.

UNDERDRAIN, ARC promotion, Quest qualification, Shape Field, physical evidence, marketplace packaging, and long-horizon cartridge governance are downstream lanes. None is a prerequisite for first play.

## Product acceptance

A successful v0 transaction is:

```text
prompt
→ builder produces a playable web game
→ automated build/playability checks pass
→ Rodoh launches the game
→ keyboard and gamepad work through semantic actions
→ player revises by prompt
→ KEEP freezes a portable offline cartridge
→ the kept cartridge reopens without any model provider
```

The first proving prompt is a small 3D game that is visually comparable in ambition to the current prompt-to-game frontier: a tiny spherical/voxel planet, third-person movement, collectibles, one hazard/enemy loop, a win state, a loss/restart state, and controller play.

Target budgets for the first three accepted specimens:

```text
prompt → first playable build       <= 12 minutes
revision → revised playable build   <= 6 minutes
launch of kept cartridge            <= 2 seconds on the local player
provider required after KEEP        no
network required during play        no
manual source editing for pass      no
```

The time budgets are product targets, not provider claims. A slow or failed provider can be replaced without changing the cartridge/player contract.

## Keep the architecture small

QuickPlay adds one thin lane to AXM-WORLD:

```text
QuickPlay request
  ↓
local builder sidecar
  ↓
agentic game builder
  ↓
normalized single-file web build
  ↓
playability verifier
  ↓
axm-quickplay-cartridge/0
  ↓
Rodoh sandbox player
  ↓
semantic action bus
```

Existing estate responsibilities remain separate:

```text
AXM-WORLD
  player, library, offline storage, KEEP

OpenGame-class builder
  template selection, code generation, run/debug/repair loop

model providers
  interchangeable reasoning/coding providers

MotionDeck
  later maps hands, Quest, Tap, HID, and other physical controls to the same semantic actions

ScreenGhost
  observer/playtest/rehearsal surface; never the real-time gameplay loop

ARC
  optional PROMOTE destination for games that need deterministic shared law

Embodied-AR-Lab / axm-embodied
  optional physical receiver and physical evidence after a game earns promotion

Shape Field / splats / generated assets
  optional presentation codecs and asset providers, never prerequisites for PLAY
```

## Commodity floor

Do not build another game engine for v0.

AXM-WORLD already carries Vite, React, Three.js, Playwright, local/offline boot, cartridge storage, and a play pipeline. The first generated-game template therefore targets Three.js or Canvas directly.

OpenGame is consumed as a donor/sidecar for its Template Skill and Debug Skill pattern. The first integration may invoke its CLI rather than importing its internals. Builder output is accepted only after normalization into the QuickPlay contract.

Provider routing is deliberately outside the cartridge format. The builder may use Muse, OpenAI, Anthropic, Gemini, OpenRouter, GameCoder, or a local model. The kept game records which provider produced a build, but the player never depends on that provider.

World Labs, PlayCanvas, Phaser, image generation, audio generation, splats, and additional 3D generators are provider/template additions after the first Three.js path works.

## Contract v0

`src/quickplay/contracts.ts` is the first executable boundary.

A QuickPlay cartridge is intentionally smaller than an ARC cartridge. It requires:

```text
format
id and title
single game.html entry
web template identity
self-contained law mode
semantic action declarations
network disabled during play
host-owned save/storage boundary
prompt/source/build digests
builder and provider identities
```

`law.mode = self-contained` is the key separation. Generated game logic is allowed to own its own local rules during PLAY and KEEP. PROMOTE is the explicit transaction that can later translate, wrap, or replace that law with ARC authority.

## 0–6 hours: first playable cartridge

Implement the static player before integrating any model.

1. Add `src/quickplay/QuickPlayPlayer.tsx`.
2. Load one known-good `game.html` fixture in a sandboxed iframe.
3. Add the semantic action bridge using `postMessage`.
4. Map keyboard and Gamepad API inputs to `move`, `look`, `primary`, `secondary`, and `menu`.
5. Provide host-owned save/load messages.
6. Add Playwright coverage proving render, input, restart, win/loss transition, and reload.

The fixture must be a real small game, not a blank transport canary. Build the Tiny Planet specimen procedurally with Three.js so no asset-generation provider is needed for the first proof.

Exit gate: the fixture plays fullscreen with keyboard and an ordinary gamepad, and the host can destroy/recreate the iframe without losing an explicitly saved game.

## 6–16 hours: prompt-to-build sidecar

Add a local Node/Python sidecar because the static browser player cannot safely spawn coding agents.

Required verbs:

```text
quickplay build "<prompt>"
quickplay revise <run-id> "<change>"
quickplay inspect <run-id>
quickplay keep <run-id>
```

The builder transaction is:

```text
prompt
→ choose template
→ generate/edit source in an isolated run directory
→ install from an allowlisted dependency set
→ build
→ normalize to game.html
→ launch headless browser
→ drive declared controls
→ collect console/runtime failures
→ repair
→ repeat within a bounded retry/time budget
→ emit candidate cartridge
```

Use the OpenGame Template Skill / Debug Skill behavior as commodity. Do not require GameCoder-27B specifically. The provider is selected by configuration.

The v0 dependency allowlist is intentionally narrow:

```text
three
vite
vite-plugin-singlefile
(optional) phaser
```

No arbitrary postinstall scripts, native addons, filesystem access outside the run directory, or outbound network from the final game.

Exit gate: three different prompts produce playable candidates without hand-editing source.

## 16–24 hours: automated playability gate

Every generated game must pass machine tests before Rodoh offers PLAY.

Minimum verifier:

```text
build exits zero
no uncaught browser exception
first meaningful frame is nonblank
primary action produces observable state change
movement action produces observable state change when declared
restart works after loss or completion
at least one success or progression condition is reachable in scripted play
no runtime network requests after launch
```

Capture a screenshot strip and a concise failure report for the repair agent. A VLM judge may score visual usability and prompt alignment, but it is advisory for v0. Build/runtime failures remain mechanical.

Exit gate: broken candidates repair or fail visibly. They never appear in the library as playable games.

## 24–36 hours: PLAY and REVISE in Rodoh

Add one player-facing surface:

```text
Make a game: [prompt]
[BUILD]

PLAY
CHANGE IT
KEEP
DISCARD
```

`CHANGE IT` sends the current source snapshot plus a delta prompt back through the builder. It creates a new immutable candidate revision and never rewrites the previous one.

The UI should expose build progress and the last actionable error, not agent transcripts.

Exit gate: a player can create and revise the Tiny Planet game without opening a terminal or repository.

## 36–48 hours: KEEP

KEEP is the first durable transaction.

It freezes:

```text
game.html
manifest.json
source archive
semantic controls
host save namespace
prompt + revision lineage
builder/provider identities
source/build digests
preview image
```

The kept cartridge is copied into the existing local WORLD library and becomes provider-independent. Import/export must work as an ordinary portable file. The service worker should make the kept game reopen offline after its first local installation.

Exit gate: copy a kept cartridge to a second browser profile or machine, import it, and play it with networking disabled.

## 48–72 hours: television and physical controls

Do not put VLM control in the gameplay loop.

The host semantic action bus is the stable control boundary. Add adapters in this order:

```text
keyboard
Gamepad API
MotionDeck gamepad/controller bridge
MotionDeck hand-action bridge
Quest/WebXR or Unity receiver later
```

For the household v0, PC → television via the existing display path is sufficient. Fullscreen and controller-first focus behavior are part of the product gate.

ScreenGhost can watch a generated game for automated regression/playtest evidence, but it does not mediate 60/90 Hz controls.

Exit gate: launch a kept game on the television and play the same cartridge with a normal controller; then demonstrate one MotionDeck semantic action source without changing the game code.

## PROMOTE is downstream

PROMOTE does not mean "rebuild the game immediately." It produces a promotion packet:

```text
kept cartridge digest
source digest
control vocabulary
save/state model
known game-law surfaces
asset inventory
playability receipts
requested target:
  ARC deterministic law
  Unity/Quest
  MotionDeck physical profile
  multiplayer
  high-fidelity asset pipeline
```

Only the requested target invokes the deeper estate machinery.

A disposable game can remain QuickPlay forever. A beloved household game can be kept without ARC. A game that needs deterministic campaign law or physical qualification earns the heavier train.

## Provider fan-out after v0

Once the Three.js path passes, add providers independently:

```text
builder providers
  Muse
  OpenAI
  Anthropic
  Gemini
  OpenRouter
  local models

runtime templates
  Phaser
  PlayCanvas

world providers
  World Labs Marble → SPZ + collider mesh
  procedural generators
  local 3D generation

presentation providers
  image
  audio
  music
  voice
  Shape Field
```

World Labs is especially compatible with the existing Three.js floor because its recommended Spark renderer is Three.js-based and its API returns splat assets plus a collider mesh. It is an optional world/asset provider, not the game engine.

## Kill rules

QuickPlay v0 is held if work begins drifting into any of these before the first three prompt-built games pass:

```text
new general-purpose engine
new deterministic law framework
new evidence ontology
Quest-first implementation
Shape Field-first implementation
multiplayer
marketplace
cloud identity
provider-specific cartridge format
unbounded dependency installation
real-time VLM gameplay control
```

## Definition of done

QuickPlay v0 is done when a child can describe a small game, play the generated result on the television with a controller, request a change, play the revision, say KEEP, and reopen that same kept game later with the model provider and internet unavailable.

Everything after that is improvement or promotion.
