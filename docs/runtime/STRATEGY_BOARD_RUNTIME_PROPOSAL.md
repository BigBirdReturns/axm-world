# Strategy Board Runtime — Proposal

**Status:** the **schema scaffold** and the **turn-machine decision + enumeration
scaffold** have landed (axm-arc, vendored into axm-world) — types, validation, a
tiny reference fixture, the canonical phase order/legal-action envelope, and a
pure `listLegalActions` enumerator. **No executor and no runtime behavior exist
yet:** nothing advances a phase, moves a seat, settles an auction, applies
interference, evaluates a milestone/ending, or posts income/tolls/obligations; no
opponent AI, no world projection, no Program of Record port. This document
remains the governing design; see **§0b** for exactly what is now real vs. still
proposal-only. The family is being built under the same discipline that made
resource-spend safe:

> proposal → engine law → property tests → world projection → cartridge authoring
>
> ✅ proposal (this doc) · ✅ **schema scaffold** (types + validation + fixture) ·
> ✅ **turn-machine decision + enumeration scaffold** (phase order, legal-action
> envelope, `listLegalActions` — no executor) · ⬜ executor + behavioral property
> tests · ⬜ world projection · ⬜ cartridge port

The intake spec (`docs/cartridges/PROGRAM_OF_RECORD_INTAKE.md`) established that
Program of Record ("PoR") is a standalone strategy ecosystem that must be
received as an authored cartridge over a **new runtime family**, not dumped into
the repo. This is the front door for that family.

> **Reading order.** §1 draws the generic/specific line. §2 is the object model.
> §3 is the turn structure. §4 places each semantic in axm-arc vs. axm-world (the
> load-bearing section — it's what keeps the split honest). §5 is the property-test
> bar that gates implementation. §6 is the fake-agency block-list. If you read two
> sections, read §4 and §6.

---

## 0. Non-negotiables inherited from the platform

The Strategy Board Runtime is a **peer** to the Contract / Encounter Runtime, not
an extension of it. It inherits, without exception, the platform contract:

- **Deterministic & replayable.** Same authored cartridge + same seed + same
  inputs → byte-identical run. All randomness flows through the seeded PRNG.
- **Authored data, not code.** A strategy cartridge is structured, validated data.
  No arbitrary logic in cartridges.
- **Ledger-authoritative.** Every resource change is a recorded ledger event. The
  engine owns the debit/credit; the world projects it. No hidden state.
- **Arc-first for semantics.** Anything that changes an *outcome* is axm-arc law,
  vendored byte-identically into axm-world and guarded by engine-drift. Anything
  that changes only *presentation* is axm-world.
- **Sovereignty rule.** A surface renders a lever ONLY where the cartridge authors
  it and the runtime can honor it. No authored mechanic → no UI.

These are not aspirations for this family; they are the acceptance floor.

---

## 0b. Status: what is real as of the turn-machine scaffold

The first two buildable steps from this proposal have landed. This section is the
honest ledger of what exists so nobody mistakes a scaffold for a runtime.

### What is now real (canonical)

- **Authored-data schema + types**, in axm-arc at `src/engine/strategy-board/`
  (vendored byte-identically into axm-world, drift-guarded): the object model of
  §2 as TypeScript types plus zod validation (`validateStrategyBoard`), and the
  `StrategyPhase` / `StrategyLedgerEventKind` vocabularies of §3.
- **Turn-machine decision + enumeration scaffold** (`strategy-board/turn.ts`,
  vendored; see axm-arc `docs/design/STRATEGY_BOARD_TURN_MACHINE_DECISION.md`):
  the canonical **phase order** (§3), the **legal-action envelope** (choices live
  only in `buyAuctionPass` / `programAction` / `reactionInterference`), a
  deterministic seed-free `initialStrategyState`, and a **pure `listLegalActions`
  enumerator** with `isActionLegal`. It enumerates choices; it **resolves nothing**.
- **Two invariants enforced now** (§6 in miniature): every resource change is a
  declared ledger mutation carrying an event kind (no hidden cost), and every
  player-facing choice object names — and must name the *correct* — phase that
  will honor it (no choice the runtime cannot honor; enumeration mutates nothing).
- **A tiny reference fixture**, `program-of-record-mini` (6 spaces, 3 doctrines,
  2 resources, 2 assets incl. 1 auction-only, 2 actions, 1 interference, 1
  obligation, 1 milestone, 1 ending). A schema/enumeration exercise and a seed for
  future property tests — **not a shipped cartridge; nothing executes it.**
- **Tests** for the schema (acceptance, structural completeness, the invariants,
  deterministic load, six rejection cases) and for the enumeration scaffold
  (deterministic initial state, phase-valid legal actions, illegal actions
  rejected, enumeration mutates nothing, every action names a resolver).

### What is NOT implemented (still proposal-only)

- **No executor / no resolution behavior.** Nothing advances a phase, moves a
  seat, resolves a buy/auction/pass, executes a program action, resolves
  reaction/interference, evaluates a milestone/ending, or posts
  income/tolls/obligations. The scaffold lists legal choices; it never applies one.
- **No opponent driver / CPU personality.**
- **No world projection** — no board, turn, auction, interference, or receipt
  surfaces; the vendored code is data + enumeration only, with zero UI.
- **No behavioral property tests** (§5) — those gate the *executor*, which does
  not exist yet.

### What remains blocked (by design, until authorized)

- **The turn-machine executor** — the next real boundary (`advancePhase`,
  `applyStrategyAction`, `resolveAuction`, `resolveInterference`, `settleTolls`,
  `settleObligations`, `evaluateMilestone`, `emitStrategyLedgerEvents`). Held for
  explicit review; not started.
- **The Program of Record port.** Still intake-accepted only; not imported, not
  ported, no bundle surgery. It waits for the runtime, then authors as data.
- **Any shipped strategy-board content** and any player-facing strategy surface.

### Next step

Per §7: the axm-arc **turn-machine executor** — its own memo + behavioral
property tests (§5), proposal-first and proven before any world surface. Until
that lands, the scaffolds change no runtime and no player-facing behavior anywhere.

---

## 1. Generic runtime vs. Program-of-Record content

The single most important boundary. Getting it wrong turns the runtime into a
PoR-shaped fork instead of a reusable family.

### 1a. What is the *generic* Strategy Board Runtime?

The runtime is the **rules-agnostic machinery** for multi-seat, turn-structured,
board-and-economy strategy cartridges. It owns *mechanisms*, never *content
values*:

- a turn/phase machine with ordered seats and per-phase legal-action gating;
- a persistent board of spaces with adjacency and regions;
- an authoritative ledger of resources, ownership, and obligations;
- a competitive-price (auction) primitive;
- structured reaction windows for non-active seats;
- a milestone/ending evaluation pass;
- an opponent-driver *interface* (a seam, not a personality).

The runtime knows *that* auctions resolve a price and an owner. It does not know
*which* spaces exist, *what* they cost, or *how* a given opponent bids.

### 1b. What is *Program-of-Record-specific* cartridge content?

Everything that is a value, a name, a table, or a personality is **authored
cartridge data**, not runtime:

- the specific ~40-space board layout, regions, and adjacency;
- the doctrine set (PRIME / NEO-PRIME / DECENTRALIZED) and what each starts with;
- the resource tracks and their conversion rates;
- the control-asset catalog, prices, toll schedules, and income curves;
- the program-action menu and each action's cost/effect;
- the table presets (Training Table / Normal Table / Knife Fight / Circus);
- the CPU personalities (risk profile, doctrine lean, bid aggressiveness);
- the milestone conditions and the ending definitions.

Litmus test: **if changing it would change the *rules of strategy boards in
general*, it is runtime; if it only changes *this game*, it is cartridge.**

---

## 2. Runtime object model

The generic objects the runtime instantiates from authored data. Each is a
mechanism with authored parameters — never a hardcoded PoR value.

| Object | What it is (generic) | Authored by the cartridge |
|---|---|---|
| **Board space** | A node with an id, region, and adjacency set | The space list, regions, adjacency graph |
| **Player doctrine** | A starting posture that gates legal actions and colors win emphasis | The doctrine set + each doctrine's starting state and action modifiers |
| **Resource ledger** | Authoritative per-seat balances with recorded debits/credits | The resource tracks and conversion rules |
| **Control asset** | An ownable object sited on a space that yields income and confers tolls | The asset catalog, prices, income, toll schedules |
| **Ownership** | A binding of a seat to an asset/space, as authoritative state | Which assets are ownable; acquisition rules |
| **Toll / obligation** | A standing debt a seat owes on use/entry, persisting across turns | Toll amounts, obligation terms, settlement rules |
| **Auction** | A competitive resolution of price + owner among bidding seats | Auction trigger, format, minimum increments |
| **Program action** | A per-turn legal move gated by doctrine + resources | The action menu, each action's cost/effect |
| **Interference** | A non-active seat's structured spend to disrupt an active action | Which actions are interferable; interference cost/effect |
| **Milestone** | A condition that, once met, locks in structural advantage | The milestone conditions and their rewards |
| **Ending** | A terminal condition and its scoring | The ending definitions (inevitability, evidence, timeout) |

Every object above emits **ledger events** for anything it changes. There is no
mutation of seat state that is not a recorded event — that is what makes the run
replayable and the after-action honest.

---

## 3. Turn structure

The generic phase machine. Phase *presence* and *ordering* are runtime; the
*content* resolved in each phase is authored. Every phase that changes state ends
by writing to the ledger.

1. **Quarter start** — advance the clock, run income (assets pay owners), settle
   due obligations, refresh per-turn action budgets.
2. **Movement / space resolution** — the active seat moves or advances; the space
   it lands on resolves (toll owed to an owner, prompt to buy, hazard, etc.).
3. **Buy / auction / pass** — acquire an available asset at list price, trigger an
   auction if the format demands it, or pass. Auctions resolve price + owner
   competitively across seats.
4. **One program action** — exactly one doctrine-and-resource-gated action from
   the authored menu. "One" is a runtime invariant; the menu is authored.
5. **Reaction / interference window** — non-active seats may spend to interfere
   with the just-taken action, within authored limits. Every interference is a
   recorded event (see §6).
6. **Milestone attempt** — evaluate whether the seat has met any milestone
   condition; lock in its reward if so.
7. **Receipt / ledger update** — emit the turn's receipt: a deterministic,
   player-readable account of what changed and why, backed by the ledger events.

The loop advances seat to seat until an ending condition (§2) fires, at which
point the runtime runs the ending's scoring and emits the final after-action.

---

## 4. Where each semantic lives: axm-arc vs. axm-world

The load-bearing split. The rule is mechanical: **outcome-affecting → axm-arc
(vendored, drift-guarded); presentation-only → axm-world.**

### 4a. axm-arc (the law — vendored byte-identical, engine-drift-guarded)

- The turn/phase machine and the "one program action" invariant.
- Legal-action gating (which actions a doctrine + resource state permits).
- The resource ledger semantics: debit/credit rules, income, obligation settlement.
- Ownership and toll resolution (who owes whom, how much, when).
- The auction resolution algorithm (how bids resolve to price + owner).
- Interference resolution (what a valid interference does to an action's outcome).
- Milestone and ending *evaluation* (has the condition been met; what it yields).
- The schema for all authored strategy-board data + validation.
- Determinism: all randomness through the seeded PRNG; replay guarantees.

If any of these changed, a run's *outcome* would change. Therefore they are law,
they land arc-first, and they are covered by property tests (§5) before axm-world
projects them.

### 4b. axm-world (the projection — presentation, gating, language)

- Rendering the board, spaces, assets, ownership, and tolls as surfaces.
- The turn UI: whose turn, which phase, the legal-action affordances.
- Auction UI: showing bids, increments, the resolved price/owner (the *resolution*
  is axm-arc; the *rendering* is axm-world).
- Interference UI: the reaction-window prompt and its recorded result.
- Receipt / after-action language: player-readable wording of ledger events.
- Doctrine identity, table-preset selection, and CPU-personality *presentation*.
- Sovereignty gating: rendering a control only where the cartridge authors the
  lever and the runtime honors it.

axm-world may never compute an outcome the resolver didn't produce. It projects;
it does not adjudicate. (Same discipline as resource-spend: the world mirrors the
law for display, but `runCycle`/the resolver remains authoritative.)

### 4c. The seam: opponent driver

The CPU **personality** (bid aggressiveness, doctrine lean, risk profile) is
authored cartridge data. The runtime exposes a driver **interface** the
personality plugs into; the driver's decisions flow through the *same* legal-action
gating and ledger as a human seat. A CPU cannot take an action a human couldn't,
and every CPU action is a recorded event. No privileged path.

---

## 5. Required property tests (gate implementation)

The Strategy Board Runtime does not get built until these hold. Mirrors the
resource-spend bar: prove the law before any surface.

1. **Determinism.** Same cartridge + seed + input sequence → byte-identical run
   and identical ledger event stream. Re-running a recorded run reproduces it.
2. **Ledger conservation.** No resource is created or destroyed except by an
   authored rule. Sum of debits/credits reconciles every turn; no seat balance
   changes without a corresponding recorded event.
3. **Legal-action soundness.** No seat (human or CPU) can take an action its
   doctrine + resource state does not permit. "One program action per turn" holds
   under all inputs.
4. **Auction integrity.** An auction resolves to exactly one owner at a
   well-defined price; no bid below the minimum increment wins; a seat cannot win
   a bid it cannot pay. Outcome is deterministic under seed.
5. **Ownership & toll correctness.** A toll is charged iff the entering seat is not
   the owner; the amount matches the authored schedule; the debit and the owner's
   credit are both recorded.
6. **Interference is bounded & recorded.** Interference only affects
   authored-interferable actions, within authored limits, and every interference
   is a ledger event. No unrecorded state change.
7. **Milestone / ending monotonicity.** A locked-in milestone cannot silently
   unlock; an ending fires exactly once and its scoring is deterministic.
8. **No-fake-agency invariants.** The mechanical encodings of §6 (a control is
   offered iff the runtime honors it; no hidden cost; no ledger event without a
   cause). These are tests, not comments.

---

## 6. Fake-agency traps that must be blocked

The block-list. Each is a way the runtime could lie to the player; each must be
structurally impossible, not merely discouraged.

- **No fake auction.** An auction UI may render only when a real competitive
  resolution runs behind it. No auction theater that resolves to a predetermined
  owner. If bidding cannot change the outcome, it is not an auction and is not
  shown.
- **No fake ownership.** Ownership shown must be authoritative ledger state. No
  cosmetic "owned" badge that confers nothing, and no toll charged for an asset
  no one actually owns.
- **No hidden cost.** Every debit is a rendered, player-legible ledger line. No
  silent resource drain, no cost that isn't shown before it's committed. (Direct
  descendant of the resource-spend rule: *no explicit action → no debit*.)
- **No unrecorded interference.** A non-active seat cannot affect an outcome
  without a recorded interference event. If it changed the result, the receipt
  says so.
- **No ad-hoc strategy mechanics inside EncounterShell.** The encounter shell
  remains a single-attempt resolver. Board spaces, auctions, tolls, turn order,
  and interference live in the Strategy Board Runtime or nowhere. No smuggling a
  strategy mechanic into the encounter surface because it was convenient.
- **No procurement-pressure dark patterns.** PoR's fantasy — converting advantage
  into inevitability — is exactly the fantasy that degrades into manufactured
  urgency, monetized impatience, or coercive "act now" framing. The
  anti-extractive contract (`docs/POSITIONING.md`) binds: no lever may manufacture
  pressure to spend, no ending may be gated behind real-world procurement
  pressure, and no timer may exist to rush a purchase rather than to model the
  fiction.

---

## 7. Recommended path (unchanged discipline)

1. ✅ **This proposal** — establish the generic family and the arc/world split. *(done)*
2. **Strategy-board schema + engine law in axm-arc** — the objects (§2), the turn
   machine (§3), the resolution algorithms (§4a), authored-data validation.
   - ✅ **schema + authored-data validation** landed (`src/engine/strategy-board/`,
     vendored into world; see §0b).
   - ✅ **turn-machine decision + enumeration scaffold** landed (`turn.ts`: phase
     order, legal-action envelope, `listLegalActions` — no executor; see §0b).
   - ⬜ **executor** (`advancePhase`, `applyStrategyAction`, `resolveAuction`,
     `resolveInterference`, `settleTolls`, `settleObligations`,
     `evaluateMilestone`, `emitStrategyLedgerEvents`) — held for review; not started.
3. **Behavioral property tests in axm-arc** (§5) — prove determinism, ledger
   conservation, legal-action soundness, auction/toll/interference integrity,
   no-fake-agency — *before* any world surface. *(⬜ gates the executor; not
   started. The enumeration-side invariants of soundness + no-fake-agency are
   already tested by the scaffold.)*
4. **World projection in axm-world** — board/turn/auction/interference/receipt
   surfaces (§4b), sovereignty-gated, mirroring the law for display only. *(⬜)*
5. **Controlled Program of Record cartridge port** — author PoR's board, doctrines,
   assets, actions, personalities, milestones, and endings as validated data over
   the proven runtime. Never a bundle import. *(⬜ blocked until 2–4)*

The remaining steps are each their own bounded, arc-first-disciplined change.
This document authorizes none of the *behavioral* ones; it defines the family
they build against.

---

*The schema scaffold and the turn-machine decision + enumeration scaffold are
real and vendored; the executor and everything
behavioral remains proposal-only. The next artifact, when authorized, is the
axm-arc turn-machine law + property tests (steps 2–3), proposal-first and proven
before any world surface.*
