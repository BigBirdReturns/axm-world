# RFC: Appliance expansion — any cartridge, one honest boot path

Status: **accepted** (2026-07-10, under the owner's drive-to-100 delegation; the
rulings below were made by the orchestrator under the standing stop/ask policy
and are recorded for the owner's audit). Implementation lands as the release
train's PR 051–060, in this repo. Depends on the appliance stack (world PRs
006–010, shipped: first-lockout imports through the boot seam, expresses
encounters, records to the digest-keyed ledger, boots under arc's digest) and
the cartridge bay (`src/world/cartridge-bay.ts`: load / ensureBundled / list /
import / remove).

## Convergence amendment (2026-07-14)

RFC 0008 moved founding authority into the identity-bound Arc and the shared
engine. The historical PR 054 implementation below is therefore superseded:
World no longer computes `applianceRosterSize` or passes World-owned bootstrap
options. Every fresh boot calls `foundOrganization(arc, input)`; an authored
`arc.founding` law wins, and old Arcs use the engine's frozen deterministic
fallback. The original ruling remains recorded below as history, not current
runtime authority.

## The one rule

> **The appliance path is one path. A cartridge earns its boot by what can be
> computed from it — digest, roster needs, vocabulary — never by being named
> in world's source.**

first-lockout proved the seam with a pinned digest constant. The expansion
makes the seam general: any bay entry boots through the same import → express
→ record pipeline, with every cartridge-specific fact computed on read
(`cartridgeDigest`, `applianceRosterSize`, the arc's own vocabulary) and
bespoke theming remaining an optional layer on top — never a gate (Article 2:
identity is computed, not claimed; Article 5: old cartridges always boot).

## Why it exists

World's own roadmap names this: *"the bay grows into a real library"* and
*"proves the runtime generalizes."* Today the appliance module exports one
cartridge by name (`firstLockoutArc`, `FIRST_LOCKOUT_DIGEST`) and its
consumers (`cartridge-bay.ts`, `Player.tsx`) know it specifically. A player
who imports their own arc-authored cartridge deserves the same embodied
expression first-lockout gets — and the bay, like arc's Library after the
custody lane, should name the identity facts it holds instead of staying mute.

## Shape (each PR grounded in the actual code at implementation time; anything
requiring schema, asset invention, or engine change stops per the walls)

| PR  | Step | Reads |
|-----|------|-------|
| 051 | **This RFC.** | — |
| 052 | **Bay custody honesty**: every bay entry shows its content digest (arc-072 parity — short form + full in `title`); trust/source already carried by the bay stays verbatim. | `cartridgeDigest(entry)` |
| 053 | **Import preflight honesty**: the bay's import reports new / update / exact-duplicate + the incoming digest before-the-fact facts (arc-073 parity), via the bay's ONE existing import seam. | bay + digest |
| 054 | **Generic appliance boot**: any bay entry boots through the appliance path — roster size from `applianceRosterSize(arc)`, no digest pinning in the boot flow. The first-lockout constant survives only where it is a *test guard* (drift detection), never as a boot gate. | bay entry's arc |
| 055 | **Generic encounter expression**: cartridges without a bespoke theme express encounters through the existing default/fallback motif path — verified honest (engine facts only), never a fake bespoke skin. Bespoke themes (Karazhan etc.) untouched. | encounter + themes seam |
| 056 | **Per-cartridge memory, listed**: the bay surfaces what world's digest-keyed appliance ledger remembers per entry (plays/outcomes summary — derived on read, arc-048-style honest labels). | appliance ledger |
| 057 | **Save summaries in the bay** (the roadmap's own lane-2 item): derived-on-read summary of the world save/ledger state per cartridge; no new persistence. | save + ledger |
| 058 | **i18n + a11y** for all new chrome (en + zh-Hant, coverage-guarded incl. `EN_ONLY_IDS` discipline; landmarks/live regions). | — |
| 059 | **Cohesion audit** against world's kit (`pixel-ui/`, existing bay/hall idioms) — recorded verdict, restyle only if the bar was missed. | — |
| 060 | **Capstone**: a cartridge world has never named (e.g. arc's `severed-march`) imports through the bay UI, boots as an appliance, plays an encounter, and records to the ledger under its digest — byte-identical to the digest arc computes for the same file — with **zero pinned constants added**. Shipped with world's own gates: `npm run check` green, Playwright receipts (desktop + mobile) for the touched flows, preview screenshots for anything visual, CI green on the merge commit. | e2e |

## Non-goals (guard-enforced)

- **No schema/resolver/save-shape changes; no engine edits** (`src/engine` is
  vendored — drift-checked; engine changes land in arc first, always).
- **No asset invention.** New bespoke pixel art is NOT in this lane; 055 uses
  the existing default expression path. If a cartridge "wants" a theme, that
  is the themes seam's future work, never faked here.
- **No new persistence.** Bay + ledger keys stay as shipped; summaries derive
  on read.
- **No arc changes.** Arc is upstream here only as the author of test
  cartridges; the arc/world contract stands in both directions.
- **No weakening of the drift guard.** The pinned first-lockout digest remains
  as a cross-client drift test; 054 removes it from *boot gating* only.

## Ship discipline (world's own, adopted verbatim)

Branch fresh from main → `npm run check` green → Playwright e2e receipts for
touched flows (`--project=desktop` and `--project=mobile`) → preview
screenshots before merge for anything visual → PR → CI green on the merge
commit → squash-merge. The orchestrator gates every PR locally before merging
and confirms `test.yml` on main afterward.

## Delegated rulings (2026-07-10)

1. **Scope**: generalize the appliance path + bay custody honesty, per the
   table. The roadmap's "dignity pass" (Karazhan authored people) and
   "alive-world models" are explicitly OUT — both are owner-specced lanes.
2. **The capstone cartridge** is `severed-march` (arc-authored, never named in
   world's source) — chosen precisely because nothing in world knows it.
3. **Numbering kept**: 051–060, closing the train's world slot.

4. **(054) FIRST_CHARTER's fresh boot sizes to its own declaration.** The
   generic path changes Program 001's fresh-boot roster from 6 to 8 — an
   observable pacing change to the shipped game. Ruling: proceed. The 6 was
   never authored (it is `bootstrapOrg`'s engine default); the 8 IS authored
   (`maxAgents` in FIRST_CHARTER's own challenges). The runtime obeying the
   cartridge's declaration over an engine default is the honest direction,
   and exempting the program of record would reintroduce exactly the pin this
   RFC's one rule forbids. Saved runs are untouched (restore short-circuits
   before bootstrap). Flagged here for the owner's audit; an owner amendment
   can exempt it later if the pacing matters more than the rule.

## Cohesion verdict (PR 059 — audited 2026-07-10, verified no-op)

Audited 052–058 against world's kit and asset standard. The lane touched six
source files and **zero** CSS / `pixel-ui/` / `themes/` files; every new line
of chrome (DigestLine, preflight report, MemoryLine, SaveStateLine) is
expressed in the touched components' own established inline-mono idiom, and
every new class-like identifier is a `data-testid` drill anchor, not styling.
No pixel art was added anywhere (the asset-standard guards ran green on every
PR). Nothing to restyle — the verdict is recorded instead of churn
manufactured, matching the arc lanes' 069/079 precedent.
