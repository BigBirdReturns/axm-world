# Positioning

## The public claim

> **Rodoh is a cartridge runtime for simulation and story games.**
>
> Creators author structured cartridges.
> Players run them through different views.
> Every outcome is deterministic, replayable, and verifiable.

One line: *a cartridge platform for verifiable simulation and story games —
author data, play anywhere, verify every run.*

Rodoh is one runtime player. Its board, map, hall, globe, and report are
representations of the same cartridge and run, not separate games or separate
runtime players.

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

Games and playable simulations are Rodoh's current proof domain, not the
boundary of the AXM artifact family. Other spokes may eventually interpret
testimony, educational, civic, or institutional artifacts; Rodoh does not claim
those workflows until their evidence, identity, privacy, and authority contracts
are specified.

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
artifact format"**—demonstrated by a game good enough to stand on its own:

1. Build or import a cartridge with AXM authoring tools (implemented in axm-arc).
2. Validate it.
3. Trust-label it.
4. Click Play in World.
5. World boots the cartridge.
6. Rodoh represents the same cartridge and run as board · planet · comic/report
   · text-forward novella without changing authored law or recorded outcomes.
7. Finish a run.
8. Replay or verify that run from a hash.

Steps 1–3 exist in the hub today. Step 5's machinery exists: the shared
`foundOrganization` transition boots any valid Arc from identity-bound law or
the frozen legacy fallback; the loader door is the gap.
Step 6 has board + planet today; comic/report and novella are costumes to
be built on the same seam. Step 8 rests on determinism today (same arc +
seed → same run) and on Genesis signing/hashing for the full story.

## What the planet view is for

The planet is a **platform proof, not the primary play surface**:
one state, many views, no state loss. The board is the workhorse. The
planet becomes valuable when location, travel, territory, adjacency, or
spatial memory matter to a cartridge. Until then it is proof and
atmosphere — and its coach copy says so honestly.

## The anti-extractive contract (a binding *design* constraint)

This is product doctrine, not a legal or user agreement. "Binding" here means
governance over our own design decisions — a constraint that governs what may
ship — not a contractual, licensing, or refund obligation to anyone. It is not
marketing copy either: it decides features.

**Borrow the legibility. Reject the exploitation.** Two decades of live-service,
mobile, and social design produced genuinely good *readability* systems. We keep
those and change the objective function: the player is the **operator of the
world**, not the yield source. The loop is "understand the world, make a choice,
see the consequence, own the record" — never "retain until purchase."

**Borrow** (legibility, kept):
clear objectives · short-session loops · visible risk · visible rewards · party
composition · world-state changes · progression receipts · social presence ·
return paths · readable consequence.

**Reject** (extraction grammar, forbidden):
paid power · hidden odds · fake scarcity · fear-of-missing-out timers · daily
punishment · grind padding · confusing currency stacks · monetized impatience ·
dark-pattern button hierarchy · social-pressure monetization · **fake agency**.

**The player must always know:**
- what choice is available;
- why it exists;
- what it costs;
- what can happen;
- what changed afterward;
- who owns the record.

**The sovereignty rule.** The engine may surface only **authored** levers. It must
not invent scarcity, pressure, agency, timers, rewards, or social obligation to
manufacture engagement. If a cartridge does not author a lever, the UI does not
imply the lever exists. "There is no meaningful choice here" is a valid render.

### Cross-link: the taxonomy is the enforcement

The encounter-agency taxonomy (`docs/WORLDS_ROADMAP.md` §0a) is the mechanic-level
implementation of the sovereignty rule. This positioning doc says *why the rule
exists*; the taxonomy says *how it is enforced*:

- **Fixed contracts render fixed** — The Cellar shows no choice, and that is the
  feature obeying the contract, not a missing feature.
- **Deployment-slack contracts render deployment choice** — The Bridge Troll.
- **Difficulty-mode contracts render posture choice** — Karazhan's Heroic. This is
  the current proof case: First Charter authors no mode, so it shows **no** chooser;
  Karazhan authors Heroic, so it does. The lever, not the UI, decides.
- **Resource-spend does not render until the engine honors it** — `tokensSpent`
  today is a ledger debit the resolver never reads, so surfacing it would be fake
  agency. It stays excluded until the engine actually consumes it.

## Canonical one-pager direction (subordinate to the doctrine above)

The public one-pager adopts the human-facing structure of the "PLAY THE WORLD.
OWN THE RECORD." sheet and grafts in the engine proof from the "AXM-ARC → PLAYABLE
WORLDS" sheet:

1. **Promise** — *Play the world. Own the record.*
2. **Anti-extractive design pillars** — the contract above, stated up front.
3. **One-session loop** — what a single sitting feels like.
4. **Projection pipeline** — `Author → Cartridge → Sim → World → Play`; every
   surface is a projection of the one cartridge.
5. **Current proof** — `Board → Map node → Encounter → Result → Ledger` (built and
   verified today).
6. **Future surfaces** — Planet, co-op, social, guilds, seasons: **marked as
   roadmap, not shipped mechanics**, and each must pass the anti-extractive test
   before it becomes canonical.

Point 6 is load-bearing. Season, guild, and social systems are exactly where
extraction grammar tries to re-enter wearing cute clothes (season pressure, guild
obligation, social retention). The poster must not imply they exist, and the same
contract governs them when they do.

## Current strategic priorities

1. **Finish The First Charter as an unaided game** — cold entry, meaningful
   opening consequence, complete campaign, legible ending, failure recovery,
   save/resume, and desktop/mobile craft.
2. **Complete custody portability** — import and resume the existing changed-run
   export; export alone is one-way custody, not a round trip.
3. **Prove equal treatment with one compact IP-safe second cartridge** — a
   distinct authored grammar completed end to end, not a giant unbalanced demo.
4. **Polish spatial representation where space carries meaning** — territory,
   adjacency, travel, or spatial memory; never 3D as a substitute for the loop.

Library and Workshop are maintained foundations inside priorities 1–2: preserve
their validation, custody, accessibility, and game-support behavior, but do not
grow them as independent feature lanes until the reference game and changed-run
round trip are closed.

“Program of record” in current Rodoh code means a controlled playable artifact
bound to a computed digest, declared runtime representations, and versioned save
and ledger schemas. It is not yet a claim that Rodoh is an institutional
system-of-record product.
