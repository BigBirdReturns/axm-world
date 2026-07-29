# UNDERDRAIN: The Bloom Below

Status: **authored continuity retained; representation rework in progress**.

> A municipal plumber is drafted into a secret war against the hidden fungus kingdom causing every drain problem in town.

## What is real

The single-file offline executable retains one continuous Arc-owned episode:

```text
Mrs. Kett service call
  -> inspect the living trap joint
  -> restore one household's water with zero hostile actors
  -> municipal draft and authored Pump Seven entry method
  -> reroute three living spore valves
  -> hold the purge wheel
  -> balance the Crown Sluice
  -> exact Arc action acceptance
  -> visible town and relationship changes
  -> playable Root Gate parley
  -> exact Arc compact acceptance
  -> durable episode record and exact resume
```

Combat supplies pressure around the plumbing operation. Defeating pressure actors cannot complete a valve, wheel, or sluice.

Arc authority remains:

```text
ea16757fe9df65405b322af13d95351896f43157
```

## What was misclassified

The previous player surface displayed **48 cartridge assets**. That was incorrect.

`presentation.json` declares 48 representation **roles**: the emblem, environments, portraits, bodies, mechanism states, pressure actors, route marks, persistent-state marks, and record mark the completed cartridge must contain. Most of those roles currently resolve through one procedural prototype renderer, `assets/underdrain-art.js`.

The independently authored production-art inventory is currently:

```text
declared representation roles   48
production roles                 1
prototype roles                 47
production sources               1
production coverage              mixed
```

The one exact production source is:

```text
role       underdrain:scene-pump-seven
media      image/webp
size       960 x 540
sha256     c5810b7362b511a8789e26300517ab0156b2593f99c9b45227765f465ef871ca
```

Its five source chunks live under `assets/production/` and are bound by `production.json`.

A representation-role plan is not an asset pack. Mixed production coverage fails the release representation gate and blocks machine-qualified authored-pilot status.

## Representation custody

The candidate now separates two authorities:

```text
presentation.json
  rodoh-representation-plan/1
  what must be represented

production.json
  rodoh-representation-production/1
  which roles have exact production sources
```

The build and runtime retain independent SHA-256 identities for authoring, the role plan, production coverage, and the Pump Seven source bytes. The session, structural evidence, episode record, static verifier, direct-file receipt, and workflow artifact all report:

```text
productionCoverageComplete = false
releaseClassification = representation-rework
```

The visible status is `ART REWORK · 1/48 production roles`. No runtime or workflow may convert the role count into a production-asset count.

## Player-space repair

The screenshot that triggered this correction showed the objective ribbon and touch controls covering the action scene. The new DOM makes that impossible through ordinary layout:

```text
stage-shell
├── stage
│   ├── canvas
│   ├── HUD
│   └── recovery surface
└── command-deck
    ├── current objective
    └── touch controls
```

On desktop, the objective deck sits below the rendered world and touch controls remain hidden. On narrow portrait screens, the command deck stacks below the world. On short landscape screens, it becomes a dedicated right rail.

The controlling browser geometry test runs both 390 x 844 portrait and 844 x 390 landscape and requires:

- zero intersection between canvas or stage and the command deck;
- zero intersection between canvas and objective ribbon, touch cluster, or any button;
- at least 44 x 44 CSS-pixel touch targets;
- label ink contained inside each target;
- no pairwise button overlap;
- a minimum unobstructed canvas size.

## Build and run

```text
npm ci
node scripts/demos/build-underdrain-draft.mjs --world-commit <40-character-world-commit>
```

Open:

```text
local/underdrain-draft/index.html
```

The file requires no backend, account, installation service, asset host, font host, analytics endpoint, or network connection.

## Persistence

HTTP or HTTPS uses browser-profile `localStorage`.

Direct `file:` use installs a namespaced `window.name` adapter before session boot:

```text
persistence.mode = window-name
persistence.durability = current-tab
persistence.exactReload = true
persistence.closeTabRequiresExport = true
```

Use **Download episode record** before closing a direct-file tab when durable custody is required.

## Controls

- Move: `WASD` or arrow keys
- Work: `E` or `F`
- Wrench: `J` or `Space`
- Dodge: `Shift`
- Mobile: dedicated directional, dodge, wrench, and work targets in the command deck

## Acceptance boundary

The structural authored-experience gate can pass while representation release remains rejected.

```text
Arc authored continuity        pass
browser reachability           diagnostic pass
exact resume                   pass
role-plan completeness         pass
production-art coverage        fail: mixed 1/48
machine-qualified pilot        false
blind-player eligibility       blocked
```

The next production train must replace the remaining 47 prototype roles with exact cartridge-owned sources. Only complete production coverage can re-enter the machine-qualified authored-pilot gate. An independent zero-assistance player receipt remains a separate later requirement.

No Unity import, native Windows-player, Quest, headset, guardian, tracking, or physical-session evidence is claimed.

## Source map

- `authoring.json`: exact Arc authoring manifest
- `presentation.json`: 48-role representation obligation plan
- `production.json`: honest production coverage receipt
- `assets/production/`: exact Pump Seven production source chunks
- `assets/provenance.json`: original-project provenance
- `assets/underdrain-art.js`: procedural prototype-role renderer
- `source/body.html`: stage and command-deck structure
- `source/mobile-controls.css`: portrait and landscape no-overlay law
- `source/presentation-surface.js`: runtime representation and coverage evidence
- `scripts/demos/build-underdrain-draft.mjs`: deterministic single-file assembly
- `scripts/demos/verify-underdrain-draft.mjs`: static custody verification
- `scripts/assets/scaffold-authored-pilot-representation.mjs`: fast Arc-derived obligation and production-coverage check
