# Program of Record — Intake Spec

**Status:** intake only. This is a docs-first reception spec for a large
external strategy artifact. Nothing in it authorizes a code import, a runtime
fork, or a shipped cartridge. It exists so that when Program of Record is
brought into the Rodoh world-runtime, it arrives as an *authored cartridge over
a documented runtime family* — never as a bundle dump.

> **Reading order.** Sections 1–4 describe the artifact as it exists today.
> Sections 5–6 map it against what axm-world already is. Section 7 names the
> new runtime family it requires. Sections 8–9 are the integrity rails and the
> recommended path. If you only read two sections, read 6 (what does *not* map
> yet) and 8 (integrity risks).

---

## 1. What it is

Program of Record ("PoR") is a **standalone strategy-game ecosystem**, not a
theme or a reskin of an existing cartridge. It is a multi-seat, turn-structured
strategy game about accumulating control assets, running an economy, and
converting a temporary edge into a permanent structural position before rivals
can react.

Concretely, today PoR exists as a **compiled, self-contained HTML artifact** — a
bundled/minified single-page build (compiled React, inlined assets), not a
normal editable source tree. That fact governs everything downstream: **PoR is
a reference design and a stress-test, not a source to graft.** We read it to
learn its system shape; we do not vendor its bundle, and we do not do surgery
inside the bundle.

It is called out as the ecosystem that pressures axm-world's assumptions the
hardest, because it needs mechanics the current Contract/Encounter runtime does
not express: a persistent board, ownership and tolls, auctions, reaction
windows, and scripted opponents.

## 2. Core fantasy

> **Convert temporary capability advantage into institutional inevitability
> before rivals turn dependencies into evidence.**

The player is not fighting a battle; they are building a position. A lead is
temporary — the game is about *locking it in* as structure (assets, obligations,
milestones) so that even when rivals catch up on raw capability, the position
holds. The counter-pressure is symmetric: your dependencies are *their*
evidence. Every asset you lean on is something a rival can document, contest,
or turn against you. The tension is speed vs. exposure.

This fantasy is doctrinal and institutional, not tactical. It is the reason PoR
cannot be squeezed into the encounter shell: the encounter shell resolves a
single authored attempt; PoR is about the *accumulation curve across many
turns*.

## 3. Doctrine layer

PoR frames every player under one of three doctrines. Doctrine is an **authored
posture** — a starting stance that colors legal actions, economy shape, and win
condition emphasis. It is not a difficulty slider and not a cosmetic faction.

- **PRIME** — centralized, first-mover. Concentrates control, moves fast,
  accepts exposure. Strong early, structurally brittle if it stalls.
- **NEO-PRIME** — reformed centralizer. Trades some first-mover speed for
  defensibility; hedges exposure while still concentrating.
- **DECENTRALIZED** — distributed posture. Slower to concentrate, harder to
  turn into evidence; wins by outlasting and by making dependencies diffuse.

Doctrine maps cleanly onto axm-world's existing notion of an **authored posture
baked into cartridge identity** (see §5). What it does *not* yet have anywhere
in axm-world is a runtime that lets doctrine change the *legal action set* turn
to turn.

## 4. System layers

PoR is built from these interacting systems. Each is listed with a one-line
statement of what it does in PoR — not what axm-world does today.

1. **Doctrine identity** — PRIME / NEO-PRIME / DECENTRALIZED starting posture;
   colors legal actions and win emphasis.
2. **Resource economy** — multiple resource tracks accrue, convert, and are
   spent on program actions and assets; the economy is the pacing engine.
3. **Board geography** — a fixed ~40-space board of positions with adjacency and
   region structure; where control assets live.
4. **Control assets** — ownable positions on the board that generate income,
   confer tolls, and become the "evidence" rivals can contest.
5. **Program actions** — the per-turn menu of legal moves (build, convert,
   contest, obligate) gated by doctrine and resources.
6. **Interference** — reaction/interference windows where a non-active player
   can spend to disrupt the active player's action.
7. **Market / auctions / trades / obligations** — price discovery and inter-player
   contracts: auctioned assets, negotiated trades, standing obligations (debts,
   tolls, promises) that persist across turns.
8. **CPU personalities** — scripted opponents with distinct doctrines and risk
   profiles that drive a solo match.
9. **Milestones & endings** — progression gates that, once cleared, lock in
   structural advantage; multiple ending conditions (inevitability reached,
   evidence overwhelms, timeout).

## 5. What maps to existing axm-world

These PoR systems already have an honest home in the current runtime. They can
be *received* without new runtime primitives.

- **Cartridge identity** — PoR is a cartridge (or a family of cartridges), and
  the runtime already treats a cartridge as authored, structured, validated
  data with a distinct visual silhouette.
- **Doctrine as authored posture** — a doctrine is authored data on the
  cartridge, the same way a cartridge already carries authored identity and
  tone. The *labeling and identity* of doctrine maps; the *runtime effect* does
  not yet (see §6).
- **Resources as ledger state** — PoR's resource tracks map onto the existing
  authoritative ledger. Debits/credits, balances, and the receipt line are
  already the world's way of making resource change legible and authoritative.
- **Milestones as progression gates** — the world already has the notion of
  gated progression (readiness gates, arc progression). PoR milestones are the
  same shape: a condition that, once met, unlocks or locks in state.
- **Receipts / after-action as result projection** — PoR's end-of-turn and
  end-of-match summaries map onto the existing Result projection: a
  deterministic, replayable account of what happened and why.

The through-line: anything that is **authored data, ledger state, a gate, or a
result projection** already has a home. That is a large fraction of PoR's
*surface*, and none of its *engine*.

## 6. What does NOT map yet

These are the load-bearing PoR systems that the current Contract/Encounter
runtime cannot express. This section is the reason PoR is an intake spec and not
a port.

- **40-space persistent board** — the world has a Map/Board *projection*, but no
  runtime notion of a persistent geography with adjacency that assets sit on and
  income flows from across turns.
- **Auctions** — no price-discovery primitive; no mechanism for competitive
  bidding resolving to an owner and a price.
- **Ownership & tolls** — no concept of a player *owning* a board position and
  charging others for use. This is foreign to the encounter model.
- **Table presets** — Training Table / Normal Table / Knife Fight / Circus and
  similar match configurations have no runtime representation.
- **CPU personalities** — no scripted-opponent driver; the world resolves
  authored attempts, it does not *play against* the player.
- **Reaction / interference windows** — the resolver is single-pass over an
  authored challenge; there is no turn structure that yields a reaction window
  to a non-active player.
- **Strategy-board runtime** — most fundamentally, there is no turn engine,
  phase machine, or multi-seat state model. The encounter shell resolves one
  authored attempt; PoR is a multi-turn, multi-seat accumulation loop.

**Do not** try to force any of these into the encounter shell. A toll is not a
resourceSpend lever; an auction is not a check; a CPU personality is not a
difficulty mode. Forcing them produces fake levers (see §8).

## 7. Required new runtime: Strategy Board Runtime

PoR requires a **new runtime family, separate from the Contract / Encounter
Runtime.** Call it the **Strategy Board Runtime**. It is a peer to the encounter
runtime, not an extension of it.

Minimum primitives the Strategy Board Runtime must own (each of these is a §6
"does not map yet" item promoted to a first-class runtime concept):

- **Turn / phase machine** — ordered seats, phases within a turn, an active
  player, and legal-action gating per phase.
- **Persistent board model** — spaces, adjacency, regions, and the assets sited
  on them, surviving across turns.
- **Ownership & obligation ledger** — who owns what, what tolls apply, and what
  standing obligations bind whom, as authoritative state.
- **Auction / market primitive** — competitive resolution of price and owner.
- **Reaction windows** — structured opportunities for a non-active seat to act
  during another seat's turn.
- **Opponent driver interface** — a seam where a scripted CPU personality can be
  attached to a seat.

This family shares the platform's non-negotiables — deterministic, replayable,
authored-data-driven, ledger-authoritative — but it is its own engine surface.
It should be *proposed and specced on its own* (a Strategy Board Runtime
proposal doc) before any PoR content is ported. It must not be smuggled in as
encounter-shell features.

> **Status update.** That proposal now exists —
> `docs/runtime/STRATEGY_BOARD_RUNTIME_PROPOSAL.md` — and its **schema scaffold**
> (types + validation + a `program-of-record-mini` reference fixture) has landed
> in axm-arc and vendored into axm-world. No runtime behavior and no PoR port
> exist yet; the port remains intake-accepted only. See the proposal's §0b for
> the exact real-vs-pending ledger.

## 8. Integrity risks

These are the ways an intake goes wrong. Each is a hard "do not."

- **No HTML dump.** The compiled bundle is not the deliverable and is not
  vendored. We do not ship or import the artifact's build output.
- **No runtime fork.** We do not copy PoR's turn engine, resolver, or phase
  machine into axm-world as a parallel engine. The Strategy Board Runtime is
  authored fresh against the platform's determinism/ledger contract, informed by
  PoR — not forked from it.
- **No fake levers.** An auction, a toll, ownership, or a reaction window must
  not be mimed with a resourceSpend lever, a check, or a difficulty mode. If the
  runtime cannot honor a mechanic, the mechanic is not exposed — the sovereignty
  rule already governing encounter agency applies here too.
- **No ad-hoc strategy mechanics in the encounter shell.** The encounter shell
  stays a single-attempt resolver. Strategy mechanics live in the Strategy Board
  Runtime or nowhere.
- **No procurement-pressure dark patterns.** PoR's fantasy is about *structural
  inevitability*, which is exactly the fantasy that can degrade into
  manufactured urgency, monetized impatience, or coercive "act now" framing.
  The anti-extractive design contract (docs/POSITIONING.md) binds here: no lever
  may manufacture pressure to spend, and no ending may be gated behind
  real-world procurement pressure.

## 9. Recommended path

A staged path that keeps every step reversible and docs-first.

1. **Stand up the standalone boot screen first — in PoR itself.** Before any
   intake, PoR's own entry experience should be unified and legible (see
   docs/cartridges/PROGRAM_OF_RECORD_BOOT_SCREEN_PLAN.md). Because the artifact
   is a compiled bundle, this is a *plan*, not surgery, until an editable source
   tree exists.
2. **Intake spec second — this document.** Establish the shared understanding of
   what PoR is and what it demands, before writing any runtime.
3. **Strategy Board Runtime proposal third.** Spec the new runtime family (§7) on
   its own, with its own property tests and determinism/ledger guarantees, the
   same way the resource-spend lever was proposed and property-tested before any
   shell surface existed.
4. **Controlled cartridge port last.** Only once the Strategy Board Runtime
   exists and is proven do we author a PoR cartridge over it — data authored
   against a documented runtime, validated and trust-labeled like any other
   cartridge. Never a bundle import.

---

*Intake only. No import, no fork, no shipped cartridge is authorized by this
document. The next artifacts are, in order: the boot-screen plan (§9.1), and —
when authorized — a Strategy Board Runtime proposal (§9.3).*
