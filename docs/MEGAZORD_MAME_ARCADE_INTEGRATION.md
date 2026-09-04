# Megazord integration through the existing MAME-derived arcade floor

## Correction

The chapter factory, Infinite Fabric, Demo Forge, and Rodoh must not create a second cabinet, launcher, title database, adapter detector, profile stack, trust authority, session authority, or household frontend. The estate already assigns those responsibilities to MotionDeck Cabinet Floor and QuestStage.

MAME has two distinct roles in the estate:

1. a real emulation runtime and title supplier for legally held arcade software; and
2. the architectural donor for the universal cabinet that discovers machines, admits software, binds controls, owns launch custody, records outputs, retains state, neutralizes failed providers, and permits frontends to be replaced.

## Existing cabinet law

```text
MAME machine driver     -> runtime or game-machine topology
MAME software list      -> chapter, title, and cartridge catalog
ROM evidence set        -> immutable source, build, asset, and receipt bundle
DIP switches            -> difficulty, age, control, device, and policy profile
input ports             -> semantic actions and physical control bindings
lamps / outputs         -> score, haptics, status, gates, and receipts
save state              -> deterministic chapter checkpoint
NVRAM                   -> retained player, world, and cabinet history
watchdog                -> stuck process, stale authority, and provider neutralization
attract mode            -> Demo Forge, showcase, and unattended chapter previews
plugin sidecar          -> provider adapters, MAME Lua, observers, and optional bridges
replaceable frontend    -> MotionDeck Home, Rodoh, MAME, browser, or future shell
```

## Megazord placement

```text
First Charter Program of Record
        │
        ▼
Marathon Chapter Factory
        │
        ├── local Qwen / llama.cpp
        ├── cloud coding models
        ├── OpenGame-derived build and repair loop
        ├── asset generators
        ├── Playwright
        └── ScreenGhost
        │
        ▼
chapter candidate cartridge
        ├── machine profile
        ├── software-list identity
        ├── immutable source and playable bundle
        ├── semantic input ports
        ├── save and NVRAM mappings
        ├── observable outputs
        ├── watchdog and rollback policy
        └── world-consequence proposal
        │
        ▼
MotionDeck Cabinet Floor
        ├── discover and fingerprint
        ├── select adapter and profile
        ├── enforce trust and authority
        ├── launch under process custody
        ├── retain session evidence
        ├── neutralize failed providers
        └── return to the household shell
        │
        ├── Rodoh / Infinite Fabric receiver
        ├── Canvas or Three.js chapter
        ├── MAME title
        ├── Steam title
        ├── Unity or Quest receiver
        └── generic bounded executable
```

Demo Forge is therefore the authoring and attract-mode surface. Infinite Fabric owns persistent world cells, entities, revisions, and memory. Rodoh is a playable receiver and world frontend. MotionDeck Cabinet Floor is the household machine and launch authority. MAME itself remains one runtime supplier among several.

## First factory transaction

Chapter Six, Bridge of Rain, must be emitted as a cabinet-admissible software item rather than as a standalone project:

```text
machine profile
  axm.canvas-chapter/1

software item
  first-charter/bridge-of-rain

input ports
  move.x
  move.y
  primary
  secondary
  menu
  restart

outputs
  score
  lives
  bridge-repaired
  villagers-escorted
  chapter-win
  chapter-loss
  memory-event

save state
  active attempt checkpoint

NVRAM
  high score
  completion receipt
  restored world consequence

watchdog
  build timeout
  startup timeout
  no-progress timeout
  provider timeout
  stuck-output neutralization
```

The chapter factory produces the source and playable bytes. MotionDeck admits, launches, supervises, and returns from them. Infinite Fabric accepts or refuses the proposed North Village consequence. ARC enters only when the chapter requires authoritative campaign consequences.

## Production sequence

```text
1. Adapt the First Charter Program of Record into a MotionDeck software list.
2. Define one reusable Canvas chapter machine profile.
3. Map the existing semantic control bus to cabinet input ports.
4. Map chapter state and receipts to outputs, save state, and NVRAM.
5. Route Demo Forge previews through cabinet attract mode.
6. Make the Marathon Chapter Factory emit complete cartridge candidates.
7. Assimilate Bridge of Rain through the ordinary MotionDeck catalog path.
8. Launch and play it from the household cabinet, then return to shell.
9. Repeat unchanged for Market of Masks and Orchard of Sparks.
10. Admit MAME, Steam, Rodoh, and generated chapters through one cabinet catalog.
```

## Refusal boundary

A generated chapter is refused when it requires another title database, frontend, launcher, trust system, profile system, session authority, or process supervisor. It is also refused when it cannot expose semantic input ports, observable outputs, save-state boundaries, NVRAM ownership, provider-free replay, and a watchdog-neutralization path.

## Control question

Can the same MotionDeck cabinet discover, present, launch, supervise, stop, resume, and retain history for a MAME title, a Steam title, a generated Canvas chapter, a Tiny World session, and a promoted Unity receiver without any one supplier owning the household game system?
