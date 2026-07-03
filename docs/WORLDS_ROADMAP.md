# Worlds Roadmap — sequencing "Cartridges → Playable Worlds"

**Purpose.** The `AXM-ARC CARTRIDGES → PLAYABLE WORLDS` vision board spans both
repos and reaches well past what's built. This doc maps the whole pipeline to
what actually exists today, sizes what's left, and sequences it honestly — so
the next build starts from a shared, non-inflated picture.

Read alongside: `docs/POSITIONING.md` (the public claim), axm-arc `ROADMAP.md`
(engine + authoring), axm-arc `STATUS.md` (current checkpoint).

The pipeline the board asserts: **CART → SIM → WORLD → PLAY**
(author a cartridge → run it through the deterministic engine → render it as a
world → play it across surfaces). The honest status of each stage:

---

## 1. Where each stage actually is

### CART — authoring (axm-arc hub) · **mostly real**
- ✅ Author contracts, agents, roles, attributes, rules, rewards as portable
  Arc JSON; validate; designer with writable editor fields.
- ✅ Package/publish: `exportArcToJson` → downloadable `.arc.json`; world
  imports it through the shipped cartridge bay. The loop is closed and
  demoed.
- 🔶 Gaps: lore authoring surface, deeper designer ergonomics. Small.

### SIM — deterministic engine · **real and proven**
- ✅ 11-step cycle, content-free, deterministic (enforced), schema-validated.
- ✅ Gates/attunements/difficulty modes live; balance provable (Karazhan sim
  harness). This is the strongest, most-verified layer.

### WORLD — render the run · **2D real, 3D stubbed**
- ✅ The contract-board world (the "board" costume): staged desktop command
  table + mobile turn flow, relevance-weighted roster, per-cartridge
  identity. This is a real, playable world view.
- 🔶 The **Planet** view exists as a costume with a three.js globe
  (`src/world/planet/`), but it is a stub — no guild holdings, resources,
  fleet, intel, or active-contract overlay from the mockup.
- ❌ The mockup's full "3D Planet Overview (sim layer)" is a feature track,
  not a styling pass.

### PLAY — play across surfaces · **not started**
- ❌ Nintendo-style co-op adventure, Roblox-style social/UGC play: entirely
  new client render modes + real-time netcode. Large, separate initiatives.
- ❌ Cross-play & progression (one account, one profile, cloud sync across
  Switch/Mobile/Roblox/Web): a backend + identity track, not a repo-local
  code pass.

### Presentation polish (cross-cutting)
- ✅ Silhouette identity, control tokens, relevance-weighting shipped.
- 🔶 Ornate decorative layer (gold-filigree frames, wax seal + signature +
  ledger note, lantern-flanked CTA, spectral/skull dividers): **achievable in
  CSS/SVG**, extends the merged theme system.
- ❌ Painted card backgrounds (spectral rider, opera hall, rat-warren art):
  **needs real illustration assets.** Cannot be fabricated in code, and the
  asset-provenance guard correctly rejects invented art claimed as sourced.

---

## 2. Honest tiering of what's left

| Track | Nature | Rough size | Blocked by |
|---|---|---|---|
| IP-safe rename | decision | tiny (owner call) | — |
| Karazhan completability proof (wing-5 by hand) | verification | small | — |
| Decorative polish (frames/seals/lanterns/dividers) | CSS/SVG | 1 session | — |
| Result / reward-moment screen (mobile step 5) | UI | small | — |
| Planet 3D world overview (holdings/resources/contract) | feature | medium–large | Karazhan proof (content to show) |
| Painted card / scene art | **art production** | external | illustration assets |
| Cross-play & progression (accounts, cloud save) | backend/identity | large | product + infra decisions |
| PLAY modes (Nintendo co-op, Roblox social) | new clients + netcode | very large | Planet + accounts, new render + net stack |

Two of these are **not a code pass in this repo**: painted art (needs an
illustrator or licensed assets) and cross-play/multiplayer (needs a backend,
identity, and netcode — a product initiative, not a styling ticket). Naming
that plainly now avoids promising screenshots the code can't produce.

---

## 3. Recommended sequence — and why

Ordered by *reversibility first, proof before polish, unlock-the-pitch* — the
same discipline that's governed the project (STATUS.md lesson 6).

**0. IP-safe rename (decision, do first).** "Karazhan", "Violet Eye", and the
boss names are Warcraft IP. Fine for a private proof; a blocker for anything
public. Every downstream track (Planet, PLAY, marketing) hardens the naming
further, so decide before, not after. Cheapest possible lever; only the owner
can pull it.

**1. Prove Karazhan is completable (wing-5 by hand).** The balance sim clears
it in autoplay, but no human has played the Spire → Beyond-the-Tower. Do this
before investing in worlds that *render* that content — a world overview of a
game that dead-ends is worse than no overview.

**2. Decorative polish (the achievable mockup layer).** Frames, seals,
lanterns, dividers — CSS/SVG, low risk, extends the shipped silhouette. This
is the single highest pitch-value-per-effort item: it makes the live build
match the desktop/mobile mockups (minus painted art). One session.

**3. Result / reward-moment screen.** The mobile flow's step 5 ("SUCCESS +
rewards") is the one staged step not yet built. Small, and it visibly closes
the turn loop the last pass opened.

**4. Planet → world overview.** Grow the existing three.js Planet stub into
the sim-layer overview: guild holdings, resources, active contract, time
state. This is the real "WORLD" stage and the bridge from "a board" to
"a world." Can ship a 2D/isometric map first and upgrade to full 3D — don't
gate the concept on the 3D.

**5+. Cross-play/progression, then PLAY modes.** Accounts + cloud save is the
prerequisite for "play anywhere" and any multiplayer; the Nintendo/Roblox
surfaces depend on it plus new render/net stacks. These are multi-quarter
product initiatives, scoped separately when the earlier tiers land. Not code
passes.

---

## 4. What I can build vs. what I can't

- **Can, in-repo, now:** everything in tiers 1–4 (verification, CSS/SVG
  polish, the result screen, and a first Planet overview using the three.js
  layer already present).
- **Can't, from code alone:** painted illustrations (need an artist/assets)
  and cross-play/multiplayer (need backend, identity, netcode). I can scope
  and prototype the *shells* for those, but the substance is external.

**Recommended immediate next step:** the rename decision is yours; assuming
that's parked, tiers 1→2→3 are the fastest path to a build that looks and
plays like the mockups on the surfaces that already exist — proof, then
polish, then the world overview. Say which tier to start and I'll take it.
