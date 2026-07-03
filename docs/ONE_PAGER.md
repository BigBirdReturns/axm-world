# Play the world. Own the record.

*A cartridge runtime for verifiable simulation and story games — author data,
play anywhere, verify every run.*

One authored cartridge is the source of truth. The engine **projects** it into
every play surface — nothing is hand-authored twice. You do not grind a world;
you operate it. The loop is **understand the world → make a choice → see the
consequence → own the record** — never "retain until purchase."

You are the operator of the world, not the yield source.

---

## Borrow the legibility. Reject the exploitation.

Two decades of live-service and social design produced genuinely good
*readability* systems. We keep those and change the objective function.

**Borrow** (legibility, kept):
clear objectives · short-session loops · visible risk · visible rewards ·
party composition · world-state changes · progression receipts · social
presence · return paths · readable consequence.

**Reject** (extraction grammar, forbidden):
paid power · hidden odds · fake scarcity · fear-of-missing-out timers · daily
punishment · grind padding · confusing currency stacks · monetized impatience ·
dark-pattern button hierarchy · social-pressure monetization · **fake agency**.

**You always know:** what choice is available · why it exists · what it costs ·
what can happen · what changed afterward · who owns the record.

**The sovereignty rule.** The engine surfaces only **authored** levers. It never
invents scarcity, pressure, agency, timers, rewards, or obligation to
manufacture engagement. If a cartridge does not author a lever, the UI does not
imply the lever exists. *"There is no meaningful choice here"* is a valid render.

---

## Author → Cartridge → Sim → World → Play

Every surface is a pure projection of the one cartridge. No id-specific
branching, no four games sharing art:

```
ContractDefinition  →  the authored Challenge record (source of truth)
  → BoardProjection        the management board card
  → WorldNodeProjection    the map location
  → EncounterProjection    the playable encounter shell
  → ResultProjection       the outcome / receipt view
  → LedgerPatch            the world-state writeback (next Organization)
```

Objectives come from the contract's checks; hazards from each check's failure
consequence; party slots from roster requirements; resolutions and ledger from
outcomes. Feed the compiler **The Cellar** and you get a rat-cellar sweep; feed
it **Attumen** and you get a two-objective, tank-slotted stable fight — from the
same code, with zero hand-authoring.

---

## Current proof: Board → Map Node → Encounter → Result → Ledger

Built and verified today. The contract compiles into a playable encounter and
writes the sim ledger — the thesis made mechanical, not argued:

- **Board** — a real management play surface (staged desktop table + mobile turn
  flow), derived per cartridge.
- **Map Node** — the `WorldNode` projection is emitted and positioned; today it
  renders as a marker (the Planet overview that consumes it is roadmap).
- **Encounter** — `compileEncounter` derives location, objectives, threat
  markers, party tokens, hazards, and resolutions from the contract, and
  resolves through the **real engine** (`runChallenge → runCycle`).
- **Result → Ledger** — a receipt reports the outcome and the ledger writeback.

Proven live on **The Cellar**, and proven to generalize by unit test (**Attumen**
derives a distinct two-objective, tank-slotted encounter with no hand-authoring).
Determinism holds: same arc + same seed → the same run, replayable and
verifiable. Two games are bundled today — **The First Charter** (civic / ledger)
and **Karazhan** (haunted raid tower).

---

## Proven agency types

Agency is a property of the *contract*, not paint the UI applies. Three lever
types are implemented and verified — the highest authored agency wins, and it
degrades honestly:

- **Fixed deployment — The Cellar.** `min == max == roster`: no choice to make.
  Confirm the derived squad and watch it resolve. The absence of a branch is the
  contract obeying the rule, not a missing feature.
- **Deployment choice — The Bridge Troll.** `rosterRequirements` slack (4–6, 1
  Vanguard, `perAssignedAgent`): choose which eligible agents deploy, watch the
  risk change, and commit a legal squad. The committed squad — not the
  recommendation — is what `runCycle` resolves and what the receipt reports.
- **Difficulty-mode choice — Karazhan's Heroic.** Authored `difficultyModes`:
  pick a posture and the engine applies `applyDifficultyMode`. The First Charter
  authors no mode, so it shows **no** chooser; Karazhan authors Heroic, so it
  does. The lever, not the UI, decides.

Deliberately **not** surfaced: resource-spend. `tokensSpent` only debits the
ledger today — the resolver never reads it — so selling it as agency would be
fake agency. It stays excluded until the engine actually consumes it.

---

## Roadmap surfaces — FUTURE, not shipped

These are not shipped mechanics. They are on the roadmap, and **each must pass
the anti-extractive test before it becomes canonical**:

- **Planet** — grow the three.js globe stub into the sim-layer world overview
  (holdings, resources, active contract, time state) that consumes the
  `WorldNode` projection. *Roadmap.*
- **Co-op / social play** — new client render modes plus real-time netcode.
  *Roadmap; separate multi-quarter initiative.*
- **Guilds · seasons** — organization- and time-scoped systems layered on
  cross-play and cloud progression. *Roadmap.*

These surfaces are exactly where extraction grammar tries to re-enter wearing
cute clothes: season pressure, guild obligation, social retention. The same
sovereignty rule governs them when they arrive — only authored levers, no
manufactured scarcity, no fake agency. Until then, this page does not imply they
exist.
