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
it **The Ashen Huntsman** and you get a two-objective, tank-slotted stable fight — from the
same code, with zero hand-authoring.

---

## Current proof: one run, six representations, one ledger

Built and verified today across desktop and mobile:

- **Board** — management cards, gates, risk, roster, rewards, and recorded state.
- **Map** — the same contracts as regional locations with exact state and entry.
- **Hall** — an inhabited handoff into the same selected contract and encounter.
- **Encounter** — `compileEncounter` derives objectives, hazards, bodies, levers,
  and resolutions, then calls the real engine (`runChallenge → runCycle`).
- **Globe** — a walkable atmospheric representation with proximity-gated entry;
  it never becomes a second economy or resolver.
- **Aperture** — authored structure, bounded people, exact receipts, and Godscar
  source provenance without manufacturing facts or routes.
- **Result → Ledger → v3 custody** — the outcome changes the run, writes the
  ledger, exports exactly, imports transactionally, and resumes at the held state.

The same receiver proves three distinct complete cartridges: **The First
Charter**, **The Waking Tower** (legacy internal id `karazhan`), and **The Kind
Gods of Ilyon**. Each has cartridge-owned role art, motifs, material identity,
and a distinct procedural globe palette. Imported cartridges retain the neutral
white-label runtime rather than borrowing bundled fiction.

---

## Proven agency types

Agency is a property of the *contract*, not paint the UI applies. Four lever
types are implemented and verified — the highest authored agency wins, and it
degrades honestly:

- **Fixed deployment — The Cellar.** `min == max == roster`: no choice to make.
  Confirm the derived squad and watch it resolve. The absence of a branch is the
  contract obeying the rule, not a missing feature.
- **Deployment choice — The Bridge Troll.** `rosterRequirements` slack (4–6, 1
  Vanguard, `perAssignedAgent`): choose which eligible agents deploy, watch the
  risk change, and commit a legal squad. The committed squad — not the
  recommendation — is what `runCycle` resolves and what the receipt reports.
- **Difficulty-mode choice — The Waking Tower's Heroic.** Authored `difficultyModes`:
  pick a posture and the engine applies `applyDifficultyMode`. The First Charter
  authors no mode, so it shows **no** chooser; The Waking Tower authors Heroic, so it
  does. The lever, not the UI, decides.

- **Resource-spend choice.** When a contract authors the lever, the player may
  spend or hold capacity marks; the resolver consumes the committed value,
  changes the risk band, debits once, and records the spend. No authored lever
  means no spend control.

---

## Expansion products — FUTURE, not missing parity

The local-first browser product is complete at its declared scope. These are
separate products, and **each must pass the anti-extractive test before it
becomes canonical**:

- co-op / social play and real-time netcode;
- cloud identity, cross-play progression, and hosted convenience;
- guilds, seasons, marketplace services, and publisher signing;
- cinematic video, orchestral media, and high-resolution painted illustration.

These are exactly where extraction grammar tries to re-enter wearing cute
clothes. The same sovereignty rule governs them when they arrive: only authored
levers, no manufactured scarcity, no custodial lock-in, and no fake agency.
