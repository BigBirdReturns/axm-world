# AXM_FAMILY.md — axm-world's place in the AXM family

**This is the world-side "adoption" contract: what axm-world takes from its
siblings, what it deliberately does not, and the staged path by which world and
axm-arc become conforming members of the AXM cryptographic family.**

It is a companion to `RECONCILIATION.md` (which governs the day-to-day
arc⇄world vendoring boundary) and `VISION.md` (which states the product law
this adoption serves: *"Provenance proves custody. It does not centralize
custody."*). Where `RECONCILIATION.md` answers *"how does world stay in sync
with arc?"*, this file answers *"where does world sit in the wider AXM family,
and how does it earn the word 'verified'?"*

Modeled on two existing artifacts in the family, so this repo speaks the family
dialect rather than inventing a private one:

- **axm-wolf `docs/AXM_FAMILY.md`** — the transfer-audit shape: an auditable
  table of *what we adopted*, *what we deliberately refused*, and *why*.
- **axm-genesis `docs/ADOPTING.md` + `ALIGNMENT.md`** — the family's formal
  adoption kit and cross-repo ledger.

> Status: **active adoption record.** Internal Arc→World adoption, canonical
> content digests, digest-addressed cartridge revisions, and exact v3 run custody
> are live. Genesis publisher signatures and independent hybrid verification
> remain the future conformance rungs; this document does not imply they ship.

---

## 1. The family map

| Repo | Role | Stack | Relationship to world |
|---|---|---|---|
| **axm-arc** | **Hub** — owns the deterministic engine, the arc/cartridge format, and the tutorial cartridges (*The First Charter*, *The Waking Tower*) | TypeScript | world **vendors** arc's shared surface byte-for-byte |
| **axm-world** | **Spoke** ("Rodoh") — a spatial player that renders any arc without owning the rules | TypeScript | *this repo* |
| **axm-genesis** | **Kernel** — the frozen spec + toolchain that signs and verifies content-addressed artifacts (`axm-build` / `axm-verify`) | Python | world's future signing/verify layer; today only a **slot** |
| **axm-wolf** | **Spoke** (testimony capture) — a sibling player that already documented its own adoption | TypeScript | the model this file follows |
| **axm-core** | **Runtime** hub (per genesis `ALIGNMENT.md`) | — | not consumed by world today |

The governing law of the arc⇄world pair is arc's: **"one engine, two
audiences, no fork."** The governing law of the genesis kernel is genesis's:
**"Genesis compiles and signs; everything else reads."** This document keeps
both true at once.

---

## 2. "Adoption" means two different things here

The word is overloaded across the family. Both meanings are in scope for this
branch; keep them distinct.

1. **Internal adoption (arc → world).** world adopts engine primitives that arc
   *owns and proves first*. This is the `RECONCILIATION.md` mechanism:
   shared-surface changes land in arc with property tests, then world
   re-vendors (`npm run engine:sync`) and the `engine-drift` CI job guards the
   pin. Already real and continuous.

2. **External adoption (genesis conformance).** world and arc become
   *conforming members of the genesis family* — registered in genesis's
   `ALIGNMENT.md` ledger, able to emit and verify artifacts whose **provenance
   is cryptographically checkable**, not merely asserted. Today this exists
   only as *receiving slots*: a trust taxonomy and an empty signature field.
   Making it real is the substance of §4–§8.

The rest of this file is mostly about meaning (2), because meaning (1) already
has its contract in `RECONCILIATION.md`.

---

## 3. What axm-world already adopts from axm-arc

This is meaning (1), recorded here for completeness. All of it is live.

| Mechanism | What world does | Status |
|---|---|---|
| **Deterministic engine** (`src/engine/`) | Vendored byte-for-byte; world calls pure functions (`runCycle`, `generateAgent`, seeded PRNG) and never reimplements rules | live, drift-guarded |
| **Arc schema + `validateArc`** | The Zod schema is the platform ABI; world's cartridge bay validates every import with the *same* vendored `validateArc` arc's exporter runs | live |
| **Trust taxonomy** | `bundled \| imported-unsigned \| verified \| quarantined`, re-exported from the vendored engine — not a parallel world-local union | live (only `bundled` / `imported-unsigned` reachable today) |
| **Gating layer** (`engine/access.ts`, `engine/difficulty.ts`) | Board status delegates to engine `challengeAccess`; world mirrors, never re-derives, the resolver | live |
| **Resource-spend lever** | Resolver, projection, exact debit, and receipt consume one Arc-owned value; World renders it only when authored | live, parity-tested |
| **Strategy Board turn machine** | Schema + turn scaffold vendored; executor lands arc-first, then world renders | scaffold only |

The pattern is invariant: **outcome-affecting → arc (vendored, drift-guarded);
presentation-only → world.** Nothing below is allowed to break it.

---

## 4. What world/arc should adopt from axm-genesis — the conformance ladder

Genesis is the kernel that turns *"the creator keeps the thing"* from a promise
into a checkable fact. It signs content-addressed artifacts with the
`axm-hybrid1` suite (BLAKE3 Merkle root + hybrid Ed25519 ‖ ML-DSA-44) and
verifies them with a frozen `axm-verify` contract. The spec is deliberately
language-agnostic — *"reimplementable in any language from the spec and vectors
alone"* — which is what makes adoption by a TypeScript repo possible at all.

Adoption is **additive and staged**. Each rung is shippable on its own and
leaves the product working; nothing here is a rewrite.

- **Stage 0 — trust-label precursor (done).** The taxonomy exists on both
  sides; `cartridge.ts` carries `signature?: string | null` ("null until the
  hub signs it"); determinism already gives *replay* (same arc + seed → same
  run). This is the honest floor genesis's `ROADMAP` calls *"the honest
  precursor."*

- **Stage 1 — canonical cartridge digest (done; §7 records the shipped step).** Give a
  cartridge a deterministic **content-identity anchor**: a digest over the
  canonicalized raw Arc JSON. This is wolf's `packDigest` move exactly —
  *"introduce the canonicalization + digest boundary now, even if signing comes
  later, so adoption of Genesis crypto is additive rather than a rewrite."* A
  digest *detects tampering; it does not prove authorship* — state that plainly,
  as wolf does.

- **Stage 2 — fill the signature slot.** The **hub (arc) signs** the canonical
  bytes with a genesis publisher key; world *verifies* and renders `verified` /
  `quarantined` from the result. This is the direct realization of *"null until
  the hub signs it"*: the hub signs, the spoke reads. world never signs — a
  file must not be able to claim its own trust level.

- **Stage 3 — verify-from-hash / `axm-verify` parity.** world verifies the
  hybrid signature at import (via a JS/TS verifier of the genesis contract, or
  by shelling out to `axm-verify` in CI), and can replay/prove a run from its
  hash. This is VISION's step-8 "prove it is theirs," made real.

### What world deliberately does NOT adopt (and why)

Recording refusals is the point of a transfer audit — an omission becomes a
*decision*.

- **The Python spoke-template / `cp -r` onboarding.** world and arc are
  TypeScript and emit **arcs**, not genesis **shards** (`graph/entities.jsonl`,
  `evidence/spans.jsonl`, …). We adopt genesis's *signing/verification* contract
  over the arc's canonical bytes; we do **not** restructure a cartridge into a
  shard directory. The bridge is a verifier, not a port.

- **Self-signing in the spoke.** world never holds a publisher key and never
  signs. Only the hub authors, so only the hub signs (mirrors
  `exportArcToJson`'s existing rule that trust is loader-side, never
  self-declared by the file).

- **Reimplementing genesis crypto.** Per genesis's `drift-check.sh` philosophy,
  no repo reimplements the frozen surfaces (Merkle, ML-DSA signing, manifest
  encoding). world/arc **wrap or call** the kernel; they do not fork it.

- **Full shard conformance now.** REQ 1–4 shard conformance is a Stage-3+
  concern. Shipping it before Stage 1 exists would be premature and would risk
  the "fake agency" anti-pattern in a new guise: a `verified` label with no
  real verification behind it.

---

## 5. Lessons adopted from axm-wolf

wolf is the family's cleanest prior adoption — a downstream spoke that wrote
down its transfer explicitly. What this effort lifts from it:

1. **The transfer-audit shape** (`docs/AXM_FAMILY.md`): *adopted / refused /
   why* as a table. This file is that shape.
2. **Content-addressing as the seam to Genesis** (`packDigest` = digest over
   canonical JSON): introduce the digest now so signing is additive later.
   Stage 1 is this lesson.
3. **Pin the invariant to a CI check** (`scripts/lint-boundary.mjs`): a tiny,
   dependency-free script that fails the build when a boundary is crossed.
   world already has the `engine-drift` guard; the digest gains a companion
   check (§7).
4. **Golden-fixture discipline**: treat one canonical artifact as the definition
   of correctness and let tests reject drift (genesis's gold shard → wolf's
   bundled pack → world's bundled cartridges). The digest test pins the bundled
   cartridges' anchors.
5. **Honest provenance claims**: *"the digest detects tampering; it does not
   prove authorship."* No label promises more than the mechanism delivers.

---

## 6. Proposed genesis `ALIGNMENT.md` ledger rows

genesis onboards a repo by adding a row to its `ALIGNMENT.md` ledger and
running the 6-step unit of work (Classify · Report · Pin · Drift · Pages ·
Merge). world and arc are **not in the ledger today**. Proposed classification
(for genesis maintainers to ratify — this file only proposes):

| Repo | Class | Genesis relationship | Notes / open question |
|---|---|---|---|
| **axm-arc** | Spoke | **authors + signs** cartridges; holds the publisher key | arc is a *hub* to world **and** a *spoke* to the genesis kernel — the ledger should note the dual role |
| **axm-world** | Spoke (reader) | **verifies + renders** trust; never signs | world's cartridges are vendored/derived from arc, so its genesis relationship is largely transitive through arc |

Open questions to resolve with genesis before any ledger PR:
- Does genesis want cartridges to become genesis **shards**, or to be
  **signed-as-is** (hybrid signature over canonical Arc bytes, no shard
  restructuring)? This file assumes the latter; §4 depends on it.
- Is a **TypeScript verifier** of the `axm-hybrid1` contract in scope for the
  family (cf. the existing `verifiers/go/` stub), or does world verify by
  shelling `axm-verify` in CI only?

---

## 7. First completed work item — the canonical cartridge digest

This step is shipped. It landed Arc-first and is re-vendored into World under
`RECONCILIATION.md`; the section remains as the design and audit record for the
content-identity boundary.

**In axm-arc (the hub):**
1. Add a pure `canonicalizeArc(arc)` + `cartridgeDigest(arc)` to the engine
   (canonical JSON — recursively sort keys, preserve array order, preserve
   string bytes — then BLAKE3 to match genesis's integrity algorithm). Zero new
   dependencies beyond a hash primitive; pure and deterministic.
2. Compute the digest over the **raw validated Arc only** (no trust /
   `importedAt` / `source` fields — those are loader-side, exactly as
   `exportArcToJson` already excludes them, so a file can't perturb its own
   identity).
3. **Property/roundtrip test** (the genesis + wolf tamper pattern): `digest(a)`
   is stable across re-serialization; flip one authored byte → digest changes;
   reordering object keys → digest unchanged.

**Then in axm-world (re-vendor + wire):**
4. `npm run engine:sync` to adopt the new engine surface; `engine-drift` stays
   green.
5. Surface the digest on the cartridge envelope next to the (still null)
   signature slot; render it as the cartridge's content id.
6. **Companion CI check** (wolf `lint-boundary.mjs` shape): assert the bundled
   cartridges' digests match a checked-in expected set, so an accidental
   content change to a bundled cartridge fails the build loudly.

This delivers a real, honest artifact — *"this is exactly these bytes"* — with
no overclaim, and it is the payload a future genesis signature (Stage 2) signs
over without any further change to world's record model.

---

## 8. Sequencing

1. **This document** (world) + a short pointer in arc's docs — the plan is
   shared, not world-private.
2. **Stage 1** — the canonical cartridge digest, arc-first (§7), then
   re-vendored into world with its CI guard.
3. **Confirm classification with genesis** (§6) before any `ALIGNMENT.md` PR.
4. **Stage 2/3** — signing + verify — only after Stage 1 ships and the
   TS-verifier-vs-`axm-verify` bridge decision (§6) is made.

Every step obeys VISION's law: it makes the cartridge more portable or creator
custody more provable. Nothing here centralizes custody — the hub signs, the
creator keeps the bytes, and any player can verify.

---

## References

- `RECONCILIATION.md` (world + arc) — the arc⇄world vendoring contract.
- `VISION.md` — the anti-capture product law ("provenance proves custody").
- `src/world/cartridge.ts` — the trust taxonomy + the `signature` slot this
  ladder fills.
- axm-arc `README.md` — "Full Genesis integration (signed arcs, Merkle roots,
  `axm-verify`) is on the roadmap"; lists axm-genesis as "Kernel."
- axm-genesis `docs/ADOPTING.md`, `ALIGNMENT.md`, `COMPATIBILITY.md`,
  `spec/v1/CONFORMANCE.md` — the kernel's adoption kit, ledger, and frozen
  contract.
- axm-wolf `docs/AXM_FAMILY.md`, `src/engine/canonicalize.ts` +
  `src/engine/digest.ts`, `scripts/lint-boundary.mjs` — the prior adoption this
  file is modeled on.
