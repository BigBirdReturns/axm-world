# Positioning

## The public claim

> **Rodoh is a cartridge runtime for simulation and story games.**
>
> Creators author structured cartridges.
> Players run them through different views.
> Every outcome is deterministic, replayable, and verifiable.

One line: *a cartridge platform for verifiable simulation and story games —
author data, play anywhere, verify every run.*

Rodoh is one runtime player. Its board, map, hall, globe, aperture, underworld, encounter, and report are representations of the same cartridge and run, not separate games or separate runtime players.

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
6. Rodoh represents the same cartridge and run as Board · Map · Hall · Encounter · Globe · Aperture, plus a registered grammar-specific surface such as Underworld, without changing authored law or recorded outcomes.
7. Finish a run and carry its exact consequence through `axm-cartridge-run/v3`.
8. Reload, import, resume, and verify the content/run identity.

Steps 1–8 are implemented for the local-first browser product. The content
identity digest and deterministic run receipt verify exact bytes and replay;
publisher-authorship signatures remain the separate Genesis-conformance stage
and are not implied by the current trust label.

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
- **Difficulty-mode contracts render posture choice** — The Waking Tower's Heroic. This is
  the current proof case: First Charter authors no mode, so it shows **no** chooser;
  The Waking Tower authors Heroic, so it does. The lever, not the UI, decides.
- **Resource-spend renders only where authored** — `tokensSpent` now reaches
  `resolveChallenge`, changes the resolver's risk band, debits exactly once, and
  is written into the receipt. Cartridges without the lever render no spend row.

## Canonical one-pager direction (subordinate to the doctrine above)

The public one-pager adopts the human-facing structure of the "PLAY THE WORLD.
OWN THE RECORD." sheet and grafts in the engine proof from the "AXM-ARC → PLAYABLE
WORLDS" sheet:

1. **Promise** — *Play the world. Own the record.*
2. **Anti-extractive design pillars** — the contract above, stated up front.
3. **One-session loop** — what a single sitting feels like.
4. **Projection pipeline** — `Author → Cartridge → Sim → World → Play`; every
   surface is a projection of the one cartridge.
5. **Current proof** — `Board → Map → Hall → Encounter → Globe → Aperture / Underworld → Result → Ledger`, built and verified across four bundled cartridges. The Lamp District adds the first source-plane-specific civic underworld without adding a second resolver.
6. **Future products** — co-op, social, cloud identity, guilds, seasons,
   marketplace services, and cinematic media are marked as expansion products,
   not missing local-runtime mechanics; each must pass the anti-extractive test.

Point 6 is load-bearing. Season, guild, and social systems are exactly where
extraction grammar tries to re-enter wearing cute clothes (season pressure, guild
obligation, social retention). The poster must not imply they exist, and the same
contract governs them when they do.

## Current strategic priorities

1. **Protect parity as a contract.** Every bundled cartridge must keep full
   campaign/custody proof, cartridge-owned expression, all shared representations and its declared grammar-specific surface,
   desktop/mobile browser coverage, and neutral fallback for imports.
2. **Keep authoring and runtime law aligned.** Arc owns schema, validation,
   founding, resolution, portable runs, and authored levers; World re-vendors
   exact reviewed bytes and never grows a second resolver.
3. **Expand only as a named product.** Multiplayer, cloud identity, signing,
   marketplace services, and cinematic media require their own authority,
   privacy, custody, and acceptance contracts. They do not silently reopen the
   completed local-first product.
4. **Treat human sessions as telemetry.** Concrete accessibility, pacing, and
   comprehension findings become ordinary defects or tuning work; absence of a
   ceremonial session is not a release veto.

Library, Workshop, Designer, and Godscar Forge are maintained authoring
foundations. Their validation, custody, accessibility, and preview paths remain
part of parity rather than independent speculative lanes.

“Program of record” in current Rodoh code means a controlled playable artifact
bound to a computed digest, declared runtime representations, and versioned save
and ledger schemas. It is not yet a claim that Rodoh is an institutional
system-of-record product.
