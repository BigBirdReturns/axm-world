# VISION.md — axm-world

**Product law. Not architecture notes. Read this before changing anything.**

> **A cartridge is a playable, portable, creator-owned artifact. AXM-WORLD and
> axm-arc are compatible runtime players. The engine guarantees the rules. The
> creator keeps the thing; the holder keeps the run.**

## The capture break

Roblox kept creation, sharing, and replay, but captured custody, distribution, and
the marketplace toll. Nintendo kept constraint, polish, and trusted play, but
captured IP, hardware, and platform access.

axm keeps the durable parts and deletes the toll booth. The creator never loses
custody. A cartridge can run anywhere a compatible player runs. Export is always
free. The platform can offer tools, hosting, certification, promotion, and
first-party experiences, but it cannot hold the cartridge hostage.

## The fantasy

You pick up a cartridge: a whole authored world-and-story. You play it. Later, you
could make one.

The important feeling is ownership without captivity. Nobody can take the cartridge,
lock it to one surface, tax it for existing, or make the player mistake the platform
for the work. The cartridge is yours, and it survives outside any single screen.

## The first 60 seconds

Nintendo's real lesson is that the first interaction teaches the whole object. The
first minute is the product.

Minute one must teach this by doing, not explaining:

1. Pick up a cartridge. It is named, portable, and visibly owned.
2. Enter a world. The same cartridge is now spatial.
3. Make one authored drama choice. Not setup. Not party assignment. A real choice
   inside *The First Charter*.
4. See the world respond. The choice changes state, tone, path, or consequence.
5. Return to the cartridge as an object. It now carries the run state, manifest, or
   proof that shows the world did not swallow it.

The player should not need to understand the architecture. They should feel: I picked
up a thing, entered it, changed it, and still have it.

## Feel targets

Nintendo: the first interaction teaches the whole object, not polish-first.

Roblox: creation, sharing, and replay are frictionless, without becoming a custodial
marketplace empire.

Messenger / abeto: instant, tiny, tactile browser 3D, calm-but-weird.

The target is not cinematic scale. The target is a small playable object that feels
complete, portable, and alive.

## Ontology

**AXM** = the artifact family and compatibility contract.

**Cartridge** = the creator-owned authored program: structured law, content, and
world semantics. Its authored identity is content-derived. A game such as *The
First Charter* is one cartridge, not the limit of the category.

**Run** = the holder-owned mutable memory of operating a cartridge: choices,
state, consequences, and ledger. A run is not the cartridge's authored identity.

**Engine** = the deterministic adjudicator shared by compatible runtime players.

**Runtime player** = software that interprets cartridges through the engine.
axm-arc is the authoring hub and a text-oriented runtime player. AXM-WORLD is the
reusable spatial runtime-player implementation.

**Rodoh** = AXM-WORLD's player-facing identity and truthful interaction language.

**Representation** = a view inside a runtime player—board, map, hall, globe,
graph, report, or novella. Representations share state; they are not separate
runtime players or separate games.

**Human roles** = creator, holder, and operator. Game-facing copy may still call
the operator “the player”; architecture documents use “runtime player” for
software.

The visible product point is: **one cartridge, one carried run, many compatible
players and representations.** The work is never confused with the runtime that
presents it.

`axm-arc` is an implementation/repository name and must not leak into Rodoh's
game-facing UI. The player handles a cartridge and its run, not the architecture.

## The game-completion mandate

The current shipping priority is still the game. The First Charter must be
understandable without explanation, consequential enough to sustain play,
complete from opening through ending, recoverable after failure, resumable, and
crafted on desktop and mobile.

The architecture cannot substitute for that experience:

- a portable mediocre game is still mediocre;
- determinism is not pacing, tension, or satisfaction;
- “no fake agency” cannot become “no agency” across a campaign;
- export is not custody portability until a changed run can be imported and
  resumed;
- Library, Workshop, ledger, and provenance support play but do not finish it.

The game is both a product in its own right and the reference proof of AXM. Those
obligations reinforce one another; neither cancels the other.

They are co-equal obligations, but sequencing needs a tie-breaker: when product
experience and platform proof compete for the same work, close the player loop
first. The exception is an irreversible substrate defect—schema, custody,
determinism, save, or ledger behavior that will become expensive or dishonest if
allowed to harden. Fix that defect before building more experience on top of it.

## Anti-capture rules

A cartridge passes only if the creator can export it, prove it is theirs, run it on
another player, fork it, and still have it play.

The rules are:

- Custody is never platform power.
- Export is always free.
- No casino, no 30% toll, no custodial marketplace.
- Revenue may come from tools, hosting, certification, promotion, and first-party
  work, but never from holding the cartridge hostage.
- Determinism is the Nintendo guarantee. The creator can author within constraints,
  but the basic loop cannot be broken by platform mood, marketplace policy, or hidden
  custody.
- Provenance proves custody. It does not centralize custody.

## Definition of good for this demo

In the first minute, a player understands:

- I picked up a cartridge.
- I entered a world.
- I made a drama choice that mattered.
- The world responded.
- The cartridge remained mine.

That is the capture break.

## Law for every change after this

Every change must do at least one of three things:

- Make the first minute clearer.
- Make the cartridge more portable.
- Make creator custody more provable.

Otherwise it does not ship.
