# Positioning

## The public claim

> **Rodoh is a cartridge runtime for simulation and story games.**
>
> Creators author structured cartridges.
> Players run them through different views.
> Every outcome is deterministic, replayable, and verifiable.

One line: *a cartridge platform for verifiable simulation and story games —
author data, play anywhere, verify every run.*

No "killer" language externally. The claim is differentiated precisely
because it refuses the general-game-engine category and owns the artifact.

## Why the narrow claim is the strong one

Roblox's superpower is arbitrary user logic — enormous expressive range,
bought with moderation, exploit, safety, runtime, and compatibility problems.
This platform's superpower is the opposite:

- No arbitrary code in cartridges. **The cartridge is structured data.**
- The engine is deterministic.
- A run can be replayed, audited, signed, forked, and rendered differently.

So we do not compete on "anything anyone can build." We win at:

- safe portable game artifacts
- simulation templates
- story campaigns
- management games
- auditably fair runs
- educational systems
- fictional organizations
- raid / mission / season simulators
- interactive fiction with state

And the Nintendo comparison is not "we beat Mario." It is:

- The cartridge feels like an object.
- The runtime feels stable.
- The player trusts that a cartridge loads, plays, saves, and remembers.

## The internal ambition (not the tagline)

Roblox creation loop + Nintendo cartridge trust + git-style provenance +
a board-game / sim / story engine. That is the lane. It does not need to
pretend to replace platformers, shooters, physics toys, or Roblox scripting.

## The killer demo

The magic trick is not "look, we have a game." It is **"this is a playable
artifact format"**:

1. Build or import an arc in the hub (axm-arc).
2. Validate it.
3. Trust-label it.
4. Click Play in World.
5. World boots the cartridge.
6. The same cartridge plays as: board · planet · comic/report ·
   text-forward novella.
7. Finish a run.
8. Replay or verify that run from a hash.

Steps 1–3 exist in the hub today. Step 5's machinery exists
(`bootstrapOrg` boots any valid arc); the loader door is the gap.
Step 6 has board + planet today; comic/report and novella are costumes to
be built on the same seam. Step 8 rests on determinism today (same arc +
seed → same run) and on Genesis signing/hashing for the full story.

## What the planet view is for

The planet is a **platform proof, not the primary play surface**:
one state, many views, no state loss. The board is the workhorse. The
planet becomes valuable when location, travel, territory, adjacency, or
spatial memory matter to a cartridge. Until then it is proof and
atmosphere — and its coach copy says so honestly.

## Current strategic priorities

1. **World cartridge loader** — close the gap between *compatible* and
   *immediate*.
2. **Designer step 3** (hub) — make authoring writable, not just
   inspectable.
3. **One famous complex proof cartridge** — Karazhan, because attunements,
   roles, gates, difficulty, loot, and progression all stress the format.
