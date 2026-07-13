# Sprite Corpus Lens orbital pass v0.1

## Strongest direction

Build **Embodiment Contract v1** before adding more characters or environmental decoration. The current slice proves the world loop, but it does not yet provide one asset grammar across the theme-owned 2D dolls, the platform-owned 3D courier, motion, arrival, encounter, and transformed place. The next pass should make those surfaces alternate scale states of one authored identity and consequence system.

This is an `AC-12 whole-game ecology` audit in interpretive platform mode. Required native states are 40, 32, 24, and 16 pixels for raster actors, plus the existing low-poly 3D world. Semantic priority is identity, action, state, relationship, material, then ornament.

## Pattern stack

| Role | Pattern | Evidence | Mechanism used here |
|---|---|---|---|
| Primary | SP-40 Whole-game asset ecology | C2 lens pattern | Audit characters, places, effects, UI, and world together rather than polishing one hero sprite. |
| Support | SP-22 Separate motion families | C2 lens pattern | Walking, arrival, strain, downed, cleared, and idle need distinct causal states. |
| Support | SP-08 Background-context test | C2 lens pattern | Identity and state must survive cream cards, dark encounters, terrain, and crowded mobile layouts. |
| Support | SP-33 Terrain as affordance | C2 lens pattern | Terrain and place mutation must visibly grant interaction and retain consequence. |

Native-scale sovereignty, hand-resolved scale families, palette-role governance, provenance, and independent expression remain mandatory lens gates rather than optional aesthetics.

## Orbit findings

### 1. One identity currently has two unrelated embodiments

`Observed:` `PixelDoll` resolves theme-owned appearance and identity accents, while `PlayerCharacter` is a fixed blue courier assembled from hardcoded materials. The 3D traveler therefore cannot inherit a cartridge theme, identity, equipment cue, or authored fallback.

`Inference:` the world and encounter are truthful about engine state but not yet one asset ecology. A new theme can change roster and encounter presentation while leaving the embodied player visually owned by the platform.

`Proposal:` extend the theme appearance pack with a neutral `worldAvatar` contract: body modules, palette roles, optional equipment anchors, scale fallbacks, and no semantic role assumptions. Resolve it through the same fallback chain as dolls.

### 2. Size changes are scaling, not authored scale states

`Observed:` `PixelDoll` uses one `16 × 18` SVG viewBox and changes its CSS size. Existing integrity tests protect grid shape and allowed pixels but do not prove separately authored 16, 24, 32, and 40 states.

`Inference:` the family is technically crisp but does not pass the lens’s hand-resolved scale-family gate. At small sizes, role and identity distinctions depend on the same topology used by the large card.

`Proposal:` add explicit `micro`, `field`, `card`, and `close` raster states to `DollAppearance`. Every state must preserve identity landmarks rather than pixel ratios. Missing states fall back downward to the nearest authored state, then to the bare doll.

### 3. Motion does not yet describe player action

`Observed:` the 3D character performs an unconditional sine bob. The controller publishes position, orientation, forward, and grounded state, but not locomotion speed or an arrival/action state. Pixel dolls expose idle, strain, downed, and cleared overlays without a shared motion vocabulary.

`Inference:` animation currently signals “alive,” not what the player is doing. The continuous loop is mechanically real but visually under-articulated at walking, arrival, and return.

`Proposal:` publish a presentation-safe motion state from the controller: `idle | walk | airborne | arrived`. Bind it to separate motion families. Do not speed up the idle bob to fake walking. Encounter-only states remain derived from engine projections and reports.

### 4. Place transformation is durable but visually generic

`Observed:` a cleared marker becomes a sphere with three fixed green cones. Durable transformation is correctly derived from cleared engine state and ledger facts, but every place receives the same presentation.

`Inference:` the player can see that something changed, but not what authored consequence occurred. The marker proves persistence while collapsing distinct world changes into one platform symbol.

`Proposal:` add a theme-owned `placeStatePack` keyed by namespaced appearance references supplied by the cartridge, with platform fallbacks for `available`, `locked`, `recorded`, and `changed`. Ledger `worldChanges` select presentation references; they never inject renderer logic.

### 5. Context and source-distance governance are strong

`Observed:` appearance bindings live in theme data; role IDs remain opaque; identity accents are derived independently; the asset-standard suite rejects unsafe glyphs and malformed grids; no external sprite binaries are present.

`Inference:` the release clears the source-binary, source-identifying reproduction, enlarged-only claim, evidence-collapse, generic-glitch, and one-franchise-collapse hard gates. “Nintendo + Roblox” must remain a mechanism statement, not a surface reference.

## Rubric snapshot

| ID | Dimension | Score | Reason |
|---|---|---:|---|
| R01 | Native recognition | 3 | Raster family is tested, but not as separate scale states. |
| R02 | Silhouette and negative space | 3 | Dolls are readable; 3D/theme family parity is absent. |
| R03 | Cluster discipline | 4 | Grid and alphabet integrity are automated. |
| R04 | Topology | 3 | Contacts and world positions are explicit; shared avatar topology is not. |
| R05 | Functional asymmetry | 2 | Most differentiation is state/color rather than action-caused silhouette. |
| R06 | Palette roles | 4 | Theme and identity palette ownership are explicit. |
| R07 | State and motion logic | 2 | Encounter states exist; locomotion and arrival families do not. |
| R08 | Modularity and layer contract | 2 | 2D layers are explicit; 3D and place-state contracts are hardcoded. |
| R09 | Environment affordance | 3 | Proximity and persistent mutation are real; mutation semantics are generic. |
| R10 | Platform literacy | 3 | Treatment is interpretive and constraint-led. |
| R11 | Scale-family authorship | 1 | One raster topology is automatically resized. |
| R12 | Sheet usability | 3 | Data is structured and tested, but scale/motion implementation notes are incomplete. |
| R13 | Evidence traceability | 4 | Engine state, ledger, custody, and tests provide traceable proof. |
| R14 | Independent expression | 4 | No copied assets or source-dependent surface is required. |

Current score: **41/56**. All hard gates pass. Release quality requires R07, R08, and R11 to reach at least 3 without reducing R13 or R14.

## Implementation gate

Embodiment Contract v1 is complete only when:

1. A cartridge theme can change both doll and 3D traveler appearance without runtime role assumptions.
2. At least 16, 24, 32, and 40 raster states are independently authored or explicitly and dignifiably absent.
3. Idle, walk, airborne, arrived, strain, downed, and cleared have causal state ownership and timing rules.
4. A recorded place can present an authored, namespaced consequence appearance with a platform fallback.
5. Native 1×, silhouette, grayscale, four-background, crowded-mobile, loop-closure, module-attachment, source-distance, provenance, and existing asset-standard tests pass.

Control question: **Can the same authored identity and consequence be recognized in the roster, encounter, walkable world, and reloaded place without relying on a label or a borrowed game surface?**
