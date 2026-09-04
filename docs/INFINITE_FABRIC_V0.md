# AXM Infinite Fabric v0

## Product recovery

This is not a new product invented in response to a competitor demo. It is the implementation recovery of the product already named in the original AXM-ARC to PLAYABLE WORLDS work:

```text
AUTHOR       AXM-ARC
CARTRIDGE    PACKAGE
ENGINE       AXM-WORLD
PLANET       3D RUNTIME
PLAY         NINTENDO + ROBLOX
```

The existing product law remains:

```text
The cartridge is the source of truth.
The engine is the simulator.
The world is the playground.

CART → SIM → WORLD → PLAY
```

The original BlockQuest Builder concept already joined a Roblox-ready voxel world to judgment, party cost, world reaction, and a persistent memory ledger. The runtime plan already joined Board, Map, Planet, Play, co-op, and UGC/share as views and uses of one cartridge. QuickPlay is therefore one creation ingress into this product. It is not the destination and it does not replace the cartridge, world, or memory architecture.

## Product definition

AXM Infinite Fabric is a creator-owned persistent world substrate in which people and replaceable generation providers can add or revise bounded world cells, functional entities, encounters, and presentation assets without surrendering the world to a model vendor, renderer, or hosting platform.

The player-facing product remains Rodoh. AXM-WORLD is the first runtime implementation. AXM-ARC remains the authored-law authority for The First Charter and any world that requires deterministic shared consequences. QuickPlay supplies the fastest prompt-to-play lane. MotionDeck supplies physical controls. ScreenGhost supplies observation and automated playtest. Embodied-AR-Lab supplies the premium Unity and XR receiver. Shape Field, splats, voxel assets, meshes, images, audio, and world-generation APIs remain replaceable presentation providers.

“Infinite” means that a world can grow through an unbounded sequence of accepted, content-addressed cells and branches. It does not mean that a model hallucinates the entire game as transient video every frame.

## The complete system

```text
player or creator intent
          │
          ▼
      RODOH MAKE
          │
          ├── QuickPlay web-game target
          │     fast arbitrary sandbox candidate
          │
          └── Infinite Fabric target
                structured world patch
                         │
                         ▼
               provider-neutral compiler
                 ├── Muse
                 ├── OpenAI
                 ├── Anthropic
                 ├── Gemini
                 ├── local models
                 └── future providers
                         │
                         ▼
              axm-infinite-fabric-patch/0
                         │
              validate → preview → accept
                         │
                         ▼
              axm-infinite-fabric-world/0
                 ├── stable world cells
                 ├── stable entity identities
                 ├── versioned behavior schemas
                 ├── content-addressed assets
                 ├── append-only memory ledger
                 └── revision and branch graph
                         │
              ┌──────────┼───────────┐
              ▼          ▼           ▼
            BOARD       PLANET       PLAY
                         │
                  semantic actions
                         │
            keyboard / gamepad / MotionDeck
                         │
                     TV / browser
                         │
               Unity / Quest after proof
```

## Two creation targets

QuickPlay and Infinite Fabric solve different latency classes and must remain distinct.

### QuickPlay target

QuickPlay accepts a generated, self-contained web game inside a constrained sandbox. It optimizes prompt-to-play latency and is allowed to retain local game logic. It is suitable for disposable experiments, arcade games, and mechanics that do not yet map cleanly to the Fabric schema set.

A QuickPlay candidate may be played and revised immediately. It can be frozen as an incubation artifact. It does not automatically become a canonical persistent Rodoh world.

### Infinite Fabric target

The Fabric compiler emits structured data only. It proposes cells, entities, assets, state, topology, and references to known behavior schemas. It may not introduce arbitrary runtime code, directly rewrite the memory ledger, change authored law, or require its generation provider during play.

A canonical Fabric KEEP freezes the accepted world revision, patch lineage, schema identities, assets, controls, and ledger. The resulting world reopens offline and remains playable when the generation provider is absent.

The first Tiny World must be Fabric-native from its first playable build. It is the Planet and Play representation of The First Charter, not an unrelated spherical demo.

## Authority model

```text
AXM-ARC
  owns authored deterministic law and accepted consequences for ARC worlds

Fabric host
  owns cell and entity identity, patch acceptance, persistence, branches,
  schema execution, and the append-only world memory ledger

Generation provider
  proposes a patch and assets; it never mutates canonical world state directly

AXM-WORLD / Rodoh receiver
  renders and accepts semantic player input; it cannot invent ARC outcomes

MotionDeck
  maps physical devices to semantic actions; it cannot change world law

ScreenGhost
  observes and tests; it cannot become the real-time gameplay controller

Embodied-AR-Lab
  receives a promoted world in Unity or XR; it does not become cartridge law
```

Canonical Fabric worlds therefore carry an explicit law binding:

```text
mode
  arc
  or fabric-schema

authorityRef
  stable ARC or schema-runtime identity

authorityDigestSha256
  exact authority bytes

receiverMayAuthorOutcomes
  false
```

Generation patches always carry:

```text
proposalOnly                 true
requiresHostAcceptance       true
changesLaw                   false
modifiesLedgerDirectly       false
arbitraryRuntimeCode         false
networkRequiredDuringPlay    false
```

## World intermediate representation

The first Fabric world package has this shape:

```text
world.json
schemas/
assets/
cells/
patches/
ledger/
previews/
```

### World

`axm-infinite-fabric-world/0` binds:

```text
world id
branch id
revision digest
law authority
root cell
runtime profile
semantic controls
behavior-schema registry
asset registry
cell graph
append-only memory ledger
builder and provider provenance
```

### Cells

A cell is the bounded unit of generation, validation, streaming, rollback, and sharing. A cell may be a sphere patch, local volume, interior, or connector. It owns a seed, spatial envelope, neighboring cell references, generation receipt, and entity set.

Cell boundaries are an implementation and evidence unit, not a visible loading-screen requirement. The first Tiny World may contain a single root sphere cell and a handful of generated neighboring patches.

### Entities

Every persistent object has a stable identity, cell, transform, behavior-schema reference, asset references, and schema-owned state. Provider-specific object identifiers may be retained in provenance but never replace the stable Fabric identity.

### Memory ledger

The ledger is append-only. It records accepted authoring patches, player actions that matter to the world, consequences, relationship changes, resource changes, discovered facts, and branch decisions. A generation provider may read a bounded projection of the ledger to propose a coherent continuation. It may not rewrite or delete earlier events.

### Patches

`axm-infinite-fabric-patch/0` is the only AI authoring transaction for canonical Fabric state. V0 operations are deliberately small:

```text
add-cell
upsert-entity
remove-entity
link-cells
set-entity-state
```

The host validates schema references, asset references, parent revision, stable identities, spatial and resource budgets, capability limits, and law boundaries before a patch can enter preview. Acceptance creates a new immutable revision. Refusal preserves the proposal and leaves the world unchanged.

## V0 functional schema set

The frontier insight is correct that a generated 3D object becomes useful only when its parts, states, and behaviors are known. AXM owns an open behavior-schema registry rather than depending on one model’s latent conventions.

The first schema set is intentionally bounded:

```text
static
  visible or collidable world object

collectible
  available → collected → spent or retained

hazard
  dormant → warning → active → recovering

chaser
  idle → acquire → pursue → strike → disengage

interactable
  available → focused → activated → cooldown

portal
  closed → available → traversing → arrived

npc
  idle → aware → engaged → changed relationship state

quest
  offered → accepted → progressed → resolved

resource
  available → harvested → depleted → regenerated

weather
  inactive → transition → active → clearing
```

The first playable slice needs only static, collectible, hazard, chaser, interactable, portal, NPC, and quest. Resource and weather enter with the first persistent world-reaction revision.

A new behavior class may be generated in a quarantined QuickPlay run. It joins the canonical registry only after it is named, versioned, tested, content-addressed, and executable without its originating provider.

## The proving world

The first world is The First Charter Tiny World. It must preserve the original product loop:

```text
choose contract
→ build party
→ enter the planet
→ play an encounter
→ record outcome
→ world reacts
→ memory ledger changes
→ new opportunity becomes playable
```

Board, Map, Planet, and Play are projections of the same cartridge and world revision. The player must be able to move from management to embodiment and back without changing to a different game or losing consequence custody.

The first public transaction is:

```text
1. Load The First Charter Tiny World.
2. Walk the spherical voxel planet with keyboard or gamepad.
3. Open MAKE while still inside the world.
4. Prompt: “Add a small village on the north side with a bridge and a shy shopkeeper.”
5. Receive a structured patch and a ghost preview.
6. Accept the patch.
7. Walk to the new village without restarting the product.
8. Speak to the shopkeeper and accept a functional quest.
9. Resolve the quest through play.
10. See the village, relationship state, and memory ledger change.
11. Prompt: “Make the bridge wash out in heavy rain unless we repair it.”
12. Preview and accept a second branch revision.
13. Export the world.
14. Close the provider and disable the network.
15. Import or reopen the world and continue playing from the same state.
```

That demonstration establishes the actual platform thesis. A model writing a one-off voxel game does not.

## Immediate execution sequence

### Now through hour 4: recover the product publicly

```text
name AXM Infinite Fabric
bind QuickPlay as one ingress
publish the original Tiny World and BlockQuest architecture in the repository
publish the Fabric world and patch contracts
publish the first end-to-end acceptance transaction
place UNDERDRAIN and Shape Field in maintenance hold for this sprint
```

Exit condition: a public repository visitor can understand that the product is a provider-neutral, creator-owned persistent generative world fabric, not a prompt-to-game wrapper.

### Hour 4 through hour 24: make Tiny World real

```text
procedural tiny spherical/voxel planet
third-person tangent movement and camera
keyboard and Gamepad API semantic controls
one authored root cell
static, collectible, hazard, chaser, interactable, portal, NPC, quest schemas
one contract and one playable encounter
world reaction after success, partial, or failure
append-only memory ledger
Board / Map / Planet / Play continuity
local save and offline reload
```

Exit condition: The First Charter is playable in Planet and Play mode and returns a visible consequence to Board and Ledger. No model is required for this gate.

### Hour 24 through hour 72: make the world authorable by prompt

```text
provider-neutral prompt-to-patch compiler
structured JSON output with schema-constrained repair
patch validator
preview and diff surface
accept / refuse / undo / branch
in-world MAKE prompt
village patch
shopkeeper and quest patch
rain and bridge-repair patch
mechanical playability checks
provider-off offline reload
```

Exit condition: the full fifteen-step proving transaction passes without manual source editing.

### Days 4 through 7: make it visibly frontier-ready

```text
background cell generation queue
cell streaming around the player
asset-provider adapter for voxel or mesh outputs
provider switch between at least two coding models
local-model fallback for structured patches
ScreenGhost regression observer
television fullscreen and controller-first focus
portable KEEP package
60–90 second public capture
live repository demo and technical explainer
```

Exit condition: a viewer can watch one running world grow, become functional, remember a consequence, export, and reopen offline.

### Days 8 through 14: make it a fabric rather than one demo

```text
versioned schema registry
schema conformance fixtures
second world topology: interior or connected local volume
branch comparison and rollback
bounded world-context projection for generators
second rendering adapter or MotionDeck input adapter
asset substitution without state loss
first external cartridge import
```

Exit condition: two distinct worlds consume the same world, patch, schema, control, and ledger contracts without importing Tiny World implementation code.

### Days 15 through 30: creator alpha

```text
creator-facing world browser
shareable content-addressed world branches
community schema package format
provider routing and budget controls
optional hosted generation queue
Unity or WebXR receiver
first ARC-promoted Fabric world
co-op authority design after the single-player fabric is stable
```

Exit condition: another creator can make, revise, keep, export, import, and continue a Fabric world without using our source tree or one mandatory model provider.

## Public readiness packet

The first public packet should contain:

```text
original AXM-ARC → PLAYABLE WORLDS design lineage
original Tiny World and BlockQuest screenshots
AXM Infinite Fabric architecture
world, patch, schema, and ledger contracts
live Tiny World URL
one downloadable world cartridge
one provider-off replay
one 60–90 second capture
one comparison showing provider substitution
```

The public claim is architectural and executable:

> AXM Infinite Fabric turns authored or generated intent into portable, persistent, functional worlds whose law, memory, and custody survive changes in model provider, renderer, device, and host.

Do not claim that another company copied the work without evidence of access. The stronger position is that our dated work already contained the same convergence and a materially different control model.

## Commodity map

```text
Own
  Fabric world IR
  patch and acceptance protocol
  open functional-schema registry
  stable identities and branches
  memory ledger
  cartridge custody
  semantic controls
  Board / Map / Planet / Play continuity

Consume
  coding and reasoning models
  voxel, mesh, splat, image, audio, and world generators
  Three.js, PlayCanvas, Unity, and WebXR renderers
  physics and pathfinding libraries
  browser build and test tooling
  MotionDeck device providers
```

The model is not the platform. The renderer is not the platform. The asset generator is not the platform. The owned fabric is the stable layer that makes all of them replaceable.

## Anti-drift rules

Until the first Tiny World prompt-to-persistent-world transaction passes:

```text
no new general engine
no unrelated prompt-to-game showcase
no marketplace
no cloud identity requirement
no multiplayer implementation
no Quest-first implementation
no Shape Field-first implementation
no arbitrary generated code in canonical Fabric
no provider-specific world format
no direct model mutation of canonical world state
no regeneration that destroys an accepted branch
no receiver-authored outcomes for ARC worlds
no evidence ontology expansion
```

UNDERDRAIN remains useful as a promoted-world qualification specimen. It does not gate the existence of Infinite Fabric.

## Acceptance ledger

### Fabric Alpha 0

```text
The First Charter Tiny World exists as structured Fabric data.
Planet and Play are real.
One accepted action changes Board and Memory Ledger state.
The world reopens offline.
```

### Fabric Alpha 1

```text
A prompt proposes a structured patch.
The player previews and accepts it.
A new functional cell and NPC appear in the running world.
The provider is absent during subsequent play.
```

### Fabric Alpha 2

```text
A second prompt revises existing world behavior.
The prior revision remains recoverable.
World reaction and ledger continuity survive the revision.
The exported world imports into a clean browser profile.
```

### Fabric Alpha 3

```text
A second model provider proposes a valid patch.
A second world consumes the same schema runtime.
One MotionDeck or alternate renderer adapter consumes the same semantic surface.
```

At Alpha 3 we have a platform candidate rather than a single impressive demo.

## Control question

Can The First Charter grow from one Tiny World into a branchable persistent universe through accepted provider-neutral patches while every world consequence, memory, asset, behavior, control, and revision remains portable and attributable after the originating model, renderer, and network are removed?
