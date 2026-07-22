# AXM-WORLD / RODOH — read this before you build

## Names and authority

`VISION.md` → **Ontology** is the single source for AXM, cartridge, run, engine,
runtime player, AXM-WORLD, Rodoh, representation, and human-role meanings. Do not
redefine those terms here. Operationally: Rodoh owns presentation language,
never custody or adjudication.

The game remains the current shipping mandate and reference proof. Finish it as
a game: cold onboarding, consequential agency, campaign completion, recovery,
mobile and desktop usability, stability, and craft. Platform proof must emerge
from play and cannot substitute for play.

The mission is to make games fun again. Fun, here, is not juice or gacha — it is
**consequence and memory**: a world that honestly remembers what you did. The
Rodoh writes engine-backed events into the holder's run record; the cartridge
and run stay with their holder. Everything below exists to protect that.

## The constitution

`docs/adr/0002-platform-constitution.md` — six durable choices, guard-enforced
(`tests/world/constitution.test.ts`). Short form:

1. The cartridge belongs to its holder — playing never requires a server.
2. Identity is computed, not claimed — trust is a layer, never a gate.
3. Memory belongs to the run — the ledger exports with it, old records migrate.
4. The dev kit is free and the dev kit is the product.
5. Old cartridges always boot.
6. The runtime may not claim what it cannot prove.

A PR that weakens an article must amend the ADR explicitly. Deleting a guard is
amending the constitution.

## Working discipline (proven over #59–#76)

- **Honest layers, in order:** make the current truth readable → make it
  embodied → only then record richer truth. Never render a fact the engine or a
  stored record can't back (no invented rewards, no aspirational unlocks, no
  prose stored as truth, no wall-clock where the schema has none).
- **Scope walls:** display PRs never touch schema/resolver/save; schema PRs
  never touch UI. Engine data values (e.g. `node.status "cleared"`) are never
  renamed — only chrome changes. Authored cartridge content flows verbatim.
- **One pure helper, two surfaces:** any state two surfaces show must come from
  one shared derivation (`deriveHallView`, `deriveWorldMap`, `card-axes`,
  `summarizeLedger`, `evaluateParty`) so surfaces can never disagree.
- **Two axes never blur:** the outcome grade (Cleared / Partial / Failed) and
  the memory state (Recorded) are different facts.
- **i18n:** all runtime chrome routes through `t()` (en + zh-Hant). Guards:
  `locale.test.ts`, `i18n-coverage.test.ts` (allowlist), `EN_ONLY_IDS` for
  deliberate exceptions.
- **Asset standard:** pixel art is hand-authored character grids with
  `Source:/Grid:/Encoding:` provenance headers, tiny declared alphabets, and
  per-module palettes — only under `pixel-ui/`, `themes/`, `brand/`. Guarded by
  `asset-standard.test.ts`, `faces.test.ts`, `places.test.ts`. No image-file
  dependencies in runtime scenes; no emoji glyphs outside the allowlist.
- **Ship discipline:** branch fresh from main → `npm run check` green → e2e
  receipts for what you touched (`npx playwright test <spec> --project=desktop`
  and `--project=mobile`) → preview screenshots before merge for anything
  visual → PR → CI green + review threads resolved → squash-merge → confirm
  main's `test.yml` green on the merge commit. If the automated reviewer is
  unavailable, run an adversarial self-review — it has caught real bugs.

## Commands

- `npm run check` — typecheck + vitest (CI gate).
- `npm run test:e2e` — Playwright receipts (desktop + mobile; NOT CI-gated).
- `npm run dev` / `npm run build` — Vite; Pages deploys `docs/game` on main push.

## Where things live

- `src/engine/` — vendored resolver/state (drift-checked against axm-arc; don't
  hand-edit shared surface).
- `src/world/` — the runtime shell: `useArcWorld` (state), `ledger.ts` +
  `consequence.ts` (memory), `shell/` (regions), `worldmap/`, `inhabited/`
  (hall), `encounter/`, `pixel-ui/` (kit), `themes/` (per-cartridge seam:
  motifs, portraits, sprites via `CartridgeMotif.tsx` dispatchers).
- `docs/adr/` — decisions. `docs/design/` — specs and the visual contract.

## Where the road goes next (decision owner: the human)

Program 001 feels good (#59–#73). The platform lanes, in their stated order:

1. **Dignity pass** — The Waking Tower (the second cartridge) made first-class; proves
   the runtime generalizes. Open call: closed: The Waking Tower has authored people and role art.
2. **Library screen** — the bay grows into a real library (emblems, save
   summaries, import/update/remove).
3. **Creator packaging** — author → validate → digest → export `.cart`; closes
   the creator round trip (Article 4 made real).
4. **Alive-world models** — calendar, settlement (Prosperity/Trust/Safety),
   board economy: each is a schema decision the human specs first (#69-style),
   never faked in UI.

Whoever you are — human or model — the bar is the same: the world must never
lie about what happened in it. That's the fun.
