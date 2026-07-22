# Worlds Roadmap — one cartridge and run, many faithful representations

**Purpose.** The `AXM-ARC CARTRIDGES → PLAYABLE WORLDS` vision spans both repos.
This doc maps the pipeline to what exists today and sequences what's left —
honestly, and reordered around the one claim that actually matters: **a single
authored contract compiles into every play surface, derived, not hand-authored.**

Read alongside: `docs/POSITIONING.md` (the public claim), axm-arc `ROADMAP.md`
(engine + authoring), axm-arc `STATUS.md` (current checkpoint).

## Current overlay — 2026-07-22

The numbered sequence below records the design path that produced the runtime;
it is no longer the current queue. Since it was written:

- The First Charter gained a directed cold opening, exact reload boundaries,
  Arc-owned reward choice, explicit handoff into the reusable shell, a complete
  six-challenge campaign, and a completed-cartridge return state.
- Changed-run custody is now exact `axm-cartridge-run/v3` round-trip rather than
  the historical one-way `v2` export described below.
- Board, Map, Hall, Encounter, Globe, and Aperture are live representations of one run.
- The Waking Tower proves a second, original raid grammar; The Kind Gods of Ilyon adds the first `godscar-pocket/1` creator source and constitutional Aperture projection.
- All three bundled cartridges now carry cartridge-owned role art, motifs, all-surface material identity, distinct planet palettes, full deterministic campaign/custody receipts, responsive browser journeys, and shared local sensory/accessibility controls.
- The parity matrix and dedicated workflow are the current release gate; the numbered history below is retained as design provenance, not an open queue.

The bundled local-first scope has no outstanding presentation or human-acceptance gate. Ilyon
is accepted by Codex conformance, deterministic full-campaign completion,
faithful receiver projection, desktop/mobile entry, and the model-based
narrative record in axm-arc. Future human sessions are telemetry and regression
discovery. Legacy browser receipts are reconciled with the current guided-entry contract and remain ordinary regressions. New platform work must continue
to preserve exact files, engine authority, offline play, bounded rendering, and
explicit uncertainty.

---

This roadmap finishes Rodoh as the game/simulation-side spatial runtime player;
it does not define the whole AXM family. “Surface” below means a representation
inside Rodoh, not a separate runtime player. The architectural proof cannot
replace the mandate to finish The First Charter as a compelling game.

---

## 0. The thesis, and the test that governs it

AXM-ARC is not a board game with a 3D planet bolted on. The cartridge is the
source of truth, and the engine **projects** it into two equal runtime surfaces —
a management **Board** and a playable **Planet/encounter** — plus the ledger that
persists between them. The control question:

> Can one AXM-ARC contract become a board card, a map location, an encounter, and
> a ledger update **without hand-authoring four separate systems?**

The answer must be *yes by construction*: each surface is a pure projection of the
same `Challenge` record. If any surface needs bespoke per-contract authoring, the
thesis is a lie and we're building four games that happen to share art.

### The projection chain (the data contract)

```
ContractDefinition            engine/types.ts : Challenge   (the source record)
  → BoardProjection           play-pipeline/compile.ts      compileArcToPlayScene + describeContract
  → WorldNodeProjection       world/contract.ts             buildWorldLayout → WorldNode
  → EncounterProjection       world/encounter/compile-encounter.ts   compileEncounter → EncounterSpec
  → ResultProjection          play-pipeline/compile.ts      summarizeReport → PlayReportView
  → LedgerPatch               engine/cycle.ts               runCycle → next Organization
```

Objectives ← `mechanicChecks`. Hazards ← each check's `failureConsequence`. Party
slots ← `rosterRequirements`. Resolutions + ledger ← `outcomes`. Location ←
progression tier + the challenge's own description. Unlocks / world-changes ←
milestone flag, attunement chains, narrative events. **Zero id-specific
branching** — feed the compiler The Cellar and you get a rat-cellar sweep; feed it
The Ashen Huntsman and you get a two-objective stable fight with a tank slot.

---

## 0a. Encounter agency is a property of the contract, not the UI

Encounter agency (a meaningful choice *before* the engine resolves) is **not** a
universal feature the shell paints onto every encounter. It exists only when the
authored contract exposes a real pre-resolution **lever** — something `runCycle`
actually honors. The engine classifies the encounter by its available levers and
renders the matching interaction. It never invents a lever the resolver ignores.

This is the sovereignty rule made mechanical: **the cartridge record stays
authoritative; the UI does not fabricate choice to entertain the player.** "There
is no meaningful choice here" is as valid a render as offering one. This section is
the *enforcement*; `docs/POSITIONING.md` ("The anti-extractive contract") is *why
the rule exists*.

### The taxonomy (render selected from authored levers)

| Encounter type | Lever the engine honors | Player act | Example |
|---|---|---|---|
| **Fixed deployment** | none (party fixed, no modes, tokens inert) | confirm the derived squad, watch it resolve | **The Cellar** — `min == max == roster` |
| **Deployment choice** | `rosterRequirements` slack + role reqs | choose which eligible agents enter (min..max), see risk change, commit a legal squad | **The Bridge Troll** — 4–6, 1 Vanguard, `perAssignedAgent` |
| **Difficulty-mode choice** | authored `difficultyModes` | pick a posture; engine applies `applyDifficultyMode` | **The Waking Tower — Standard / Heroic** |
| **Resource-spend choice** | `tokensSpent` reaching `resolveChallenge` | spend/hold to change the risk band and recorded result | implemented — resolver, projection, debit, and receipt share one value |
| **Objective-order choice** | ordered/branching `completionCriteria` | sequence how objectives are engaged | future — needs an authored ordering lever |

**Rules of the boundary.** The shell selects the encounter UI from the authored
levers above — highest available agency wins, and it degrades honestly:
- Fixed contracts render **confirm-only**; the deploy turn shows the required
  squad and a projection, but there is nothing to change. Do not fake a branch.
- A lever may only drive a choice once the engine genuinely honors it.
  Resource spend is now the standing positive example: resolver, projection,
  exact debit, and receipt all consume the same committed value.
- Adding a lever to a contract to satisfy a demo (e.g. authoring Careful/Aggressive
  onto The Cellar) is a **cartridge-design change**, not a UI change, and moves the
  proof backward. The Cellar's value is precisely that it is the fixed-party
  compiler proof.

Status: **Fixed deployment**, **Deployment choice**, **Difficulty-mode choice**,
and **Resource-spend choice** are implemented and verified. The Cellar renders
confirm-only; The Bridge Troll resolves the committed squad; The Waking Tower
recompiles Standard/Heroic through engine law; and authored spend changes the
resolver while debiting and recording exactly once. Objective order remains a
future lever because no shipped contract authors or resolves it.

---

## 1. Where each stage actually is

### CART — authoring (axm-arc hub) · **complete for the local-first scope**
- ✅ Author contracts/agents/roles/rules/rewards as portable Arc JSON; validate;
  designer with writable editor fields.
- ✅ Package/publish: `exportArcToJson` → downloadable `.arc.json`; world imports
  it through the shipped cartridge bay. The loop is closed and demoed.
- ✅ Library, Workshop, complete Designer sections, structural authoring audit, and guided/exact-source Godscar Forge share one validation/export path.

### SIM — deterministic engine · **real and proven**
- ✅ 11-step cycle, content-free, deterministic (enforced), schema-validated.
- ✅ Gates/attunements/difficulty modes live; balance provable (Waking Tower harness).

### WORLD — project the contract into surfaces · **complete for the local-first scope**
- ✅ **Board** surface (the "board" costume): staged desktop table + mobile turn
  flow, relevance-weighted roster, per-cartridge identity. A real play surface.
- ✅ **Encounter** surface (NEW): `compileEncounter` derives a playable encounter
  shell — location, objectives, threat markers, party tokens, hazards,
  resolutions — from the contract, and resolves through the *real* engine
  (`runChallenge` → `runCycle`) with a receipt showing the ledger writeback.
  Proven live on The Cellar; proven to generalize (unit tests: The Ashen Huntsman derives a
  distinct two-objective, tank-slotted encounter) with no hand-authoring.
- ✅ The **Globe** is an atmospheric, walkable representation with cartridge-specific material identity and proximity-gated entry. It is intentionally not a second holdings/economy authority; Board, Map, and Aperture retain those information duties.

### NETWORKED PLAY — separate expansion products
- ❌ Co-op adventure / social UGC play: new client render modes + real-time
  netcode. Large, separate initiatives.
- ❌ Cross-play & progression (one account/profile, cloud sync): a backend +
  identity track, not a repo-local code pass.

---

## 2. Completion sequence — executed through the architecture

The sequence below is retained as the executed build order. Each item is now
covered by the parity matrix, deterministic campaign/custody tests, or the
current desktop/mobile browser journeys.

**0. Correctness gate — complete.** Recruitment, ledger recording, admission,
upkeep, trait application, progression stamping, deterministic scoring,
resource-spend, and save refusal have direct guards and remain shared Arc law.

**1. Cold First Charter session — complete.** Desktop and mobile prove pickup,
founding choice, Maren handoff, exact committed plan, reload, resolution, reward,
ledger, changed Hall, leave/re-enter, and reusable-runtime handoff.

**2. Finish every bundled campaign — complete.** The real World projections and
engine clear all required content for First Charter, Waking Tower, and Ilyon,
including attunement/item chains, rewards, failure continuations, and bounded
cycle budgets.

**3. Make consequence unmistakable.** The founding oath must persist and become
legible later. Every result must answer: what happened, why, what changed, what
was recorded, and what comes next. Success, partial, and failure all need valid
continuations.

**4. Complete custody portability — complete.**
`axm-cartridge-run/v3` carries the exact Arc, engine save, pending choices,
ledger/runtime extensions, and integrity digest through transactional
export/import/resume without dropping unknown namespaced memory.

**5. Prove a second grammar — complete.** The Waking Tower is original,
distribution-safe fiction over a materially different five-role raid grammar,
with authored Heroic posture, attunement chains, full campaign proof, and its
own art pack. The legacy internal id remains only for held-run compatibility.

**6. Polish expression — complete at the local-first pixel-runtime scope.** All
three cartridges own role art, motifs, every-surface material identity, globe
palettes, mobile result flow, local procedural sound, reduced motion,
high-contrast/forced-color fallbacks, and visible keyboard focus.

**7. Add broader products later.** Publisher signatures, co-op, social systems,
cloud convenience, marketplace services, and cinematic media remain separate
products. Accounts are optional convenience, never a prerequisite for
constitutional file portability.

---

## 3. Completion boundary

The shipped local-first browser product is complete when the parity workflow
remains green. Multiplayer/netcode, cloud identity, marketplace services,
publisher signatures, orchestral/cinematic media, and high-resolution painted
illustration are separate products with separate authority and custody needs.
Their absence does not make one bundled cartridge less complete than another.

The maintained obligation is regression discipline: preserve exact Arc bytes,
neutral fallback, full campaigns, exact custody, all representations,
accessibility/sensory controls, and desktop/mobile browser receipts together.
