# Worlds Roadmap — "One contract, four surfaces"

**Purpose.** The `AXM-ARC CARTRIDGES → PLAYABLE WORLDS` vision spans both repos.
This doc maps the pipeline to what exists today and sequences what's left —
honestly, and reordered around the one claim that actually matters: **a single
authored contract compiles into every play surface, derived, not hand-authored.**

Read alongside: `docs/POSITIONING.md` (the public claim), axm-arc `ROADMAP.md`
(engine + authoring), axm-arc `STATUS.md` (current checkpoint).

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
Attumen and you get a two-objective stable fight with a tank slot.

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
| **Difficulty-mode choice** | authored `difficultyModes` | pick a posture (e.g. Careful/Aggressive); engine applies `applyDifficultyMode` | future — only if a cartridge authors modes |
| **Resource-spend choice** | `tokensSpent` reaching `resolveChallenge` | spend/hold to change the *result* | future — **blocked**: today `tokensSpent` only debits the ledger, it never reaches the resolver, so it must not be sold as agency |
| **Objective-order choice** | ordered/branching `completionCriteria` | sequence how objectives are engaged | future — needs an authored ordering lever |

**Rules of the boundary.** The shell selects the encounter UI from the authored
levers above — highest available agency wins, and it degrades honestly:
- Fixed contracts render **confirm-only**; the deploy turn shows the required
  squad and a projection, but there is nothing to change. Do not fake a branch.
- A lever may only drive a choice once the engine genuinely honors it. The
  resource-spend row is the standing example: it stays future work until
  `tokensSpent` is threaded into `resolveChallenge` — surfacing it now would be
  fake agency.
- Adding a lever to a contract to satisfy a demo (e.g. authoring Careful/Aggressive
  onto The Cellar) is a **cartridge-design change**, not a UI change, and moves the
  proof backward. The Cellar's value is precisely that it is the fixed-party
  compiler proof.

Status: **Fixed deployment** and **Deployment choice** are implemented and
verified (The Cellar renders confirm-only; The Bridge Troll renders a real
deploy choice, and the committed squad — not the recommendation — is what
`runCycle` resolves and what the receipt reports). The remaining three rows are
future work, each gated on the authored lever actually existing and being honored.

---

## 1. Where each stage actually is

### CART — authoring (axm-arc hub) · **mostly real**
- ✅ Author contracts/agents/roles/rules/rewards as portable Arc JSON; validate;
  designer with writable editor fields.
- ✅ Package/publish: `exportArcToJson` → downloadable `.arc.json`; world imports
  it through the shipped cartridge bay. The loop is closed and demoed.
- 🔶 Gaps: lore authoring surface, deeper designer ergonomics. Small.

### SIM — deterministic engine · **real and proven**
- ✅ 11-step cycle, content-free, deterministic (enforced), schema-validated.
- ✅ Gates/attunements/difficulty modes live; balance provable (Karazhan harness).

### WORLD — project the contract into surfaces · **compiler landed; Planet still 2D-first**
- ✅ **Board** surface (the "board" costume): staged desktop table + mobile turn
  flow, relevance-weighted roster, per-cartridge identity. A real play surface.
- ✅ **Encounter** surface (NEW): `compileEncounter` derives a playable encounter
  shell — location, objectives, threat markers, party tokens, hazards,
  resolutions — from the contract, and resolves through the *real* engine
  (`runChallenge` → `runCycle`) with a receipt showing the ledger writeback.
  Proven live on The Cellar; proven to generalize (unit tests: Attumen derives a
  distinct two-objective, tank-slotted encounter) with no hand-authoring.
- 🔶 The **Planet** costume exists (three.js globe, `world/planet/`) but the node
  is still a marker, not the holdings/resources/overlay world overview. The
  compiler already emits `WorldNode` positions it can consume.

### PLAY — play across surfaces · **not started**
- ❌ Co-op adventure / social UGC play: new client render modes + real-time
  netcode. Large, separate initiatives.
- ❌ Cross-play & progression (one account/profile, cloud sync): a backend +
  identity track, not a repo-local code pass.

---

## 2. Recommended sequence — proof before polish

Reordered so the CSS/decorative work can't become the place we hide from the hard
proof. The compiler bridge is the spine; everything else hangs off it.

**0. IP-safe rename (decision, owner's call).** "Karazhan"/"Violet Eye"/boss names
are Warcraft IP — fine for a private proof, a blocker for anything public. Every
downstream track hardens the naming, so decide before, not after.

**1. Prove Karazhan is completable by hand (wing-5).** The sim clears it in
autoplay, but no human has played Spire → Beyond-the-Tower. Do this before
rendering that content into worlds.

**2. The one-contract vertical slice — Board → Planet-node → Encounter → Result →
Ledger.** ✅ **Landed for the Board+Encounter+Result+Ledger legs; Planet-node leg
is the WorldNode projection, still rendered as a marker.** The contract compiles
into a playable encounter and writes the sim ledger. This is the thesis made
mechanical — the rest of the roadmap is now *expansion*, not *proof*.

**3. Result / reward-moment screen (mobile step 5).** The encounter receipt closes
the loop on desktop and in the shell; the dedicated mobile result step is the one
staged panel still to build. Small.

**4. Decorative polish (frames/seals/lanterns/dividers).** CSS/SVG, low risk,
extends the shipped silhouette so the live build matches the mockups (minus
painted art). Valuable — but explicitly *after* the proof, not instead of it.

**5. Planet → world overview.** Grow the three.js Planet stub into the sim-layer
overview (holdings, resources, active contract, time state) that consumes the
`WorldNode` projection. Ship 2D/isometric first; don't gate the concept on 3D.

**6. Cross-play/progression, then PLAY modes.** Accounts + cloud save precede any
"play anywhere" / multiplayer; the co-op/social surfaces depend on it plus new
render/net stacks. Multi-quarter product initiatives, scoped separately.

---

## 3. What I can build vs. what I can't

- **Can, in-repo, now:** tiers 1–5 (verification, the result screen, CSS/SVG
  polish, and a first Planet overview using the three.js layer + the WorldNode
  projection already present).
- **Can't, from code alone:** painted illustrations (need an artist/assets) and
  cross-play/multiplayer (need backend, identity, netcode). I can scope and
  prototype the *shells*; the substance is external.

The compiler bridge (tier 2) is the load-bearing proof and it is now in the build.
The honest next lever is the owner's rename call (0) and the Karazhan
completability pass (1); after that, the result screen (3) and Planet overview (5)
are the highest-value expansions of a thesis that no longer has to be argued.
