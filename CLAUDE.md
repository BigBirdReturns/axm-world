# axm-world — notes for Claude sessions

Start with `README.md` and `RECONCILIATION.md`, then **axm-genesis
`docs/CONTINUITY.md`** (the family's laws and operating doctrine — read
it before designing anything).

## Ground rules

- **NEVER edit the vendored surface in place**: `src/engine`,
  `src/arcs`, `tests/engine`, `tests/fixtures` are vendored from axm-arc,
  pinned in `src/engine/VENDORED_FROM`, and the `engine-drift` CI job
  fails on any divergence. Engine changes land in axm-arc FIRST, then
  `scripts/sync-engine.sh <ref>` re-vendors and moves the pin. If you
  find a bug in a vendored file, fix it in arc.
- **NOT vendored** (world-owned): `src/world/`, `src/play-pipeline/`,
  `cartridges/`, `tests/world/`. The boot importer
  (`src/world/cartridge-bay.ts`) validates through the same vendored
  seam; per-cartridge saves are keyed by content digest (`cart1_…`).
- **The grammar rule:** chrome is translated via `src/world/i18n/` (the
  family's reference implementation; typed catalog, en + zh-Hant,
  coverage-guard test `tests/world/locale.test.ts`); cartridge data flows
  verbatim. Compiled pipeline labels are chrome — they're catalogued
  (`pipeline.*`) and the scene memo depends on locale.
- **Determinism:** codepoint compare, never `localeCompare`; no
  locale-sensitive behavior in engine paths. This was a real shipped bug
  once (host-locale collation in `orderedAgentIds`); don't reintroduce it.
- **PWA:** the service worker is emitted by an inline Vite plugin from
  `scripts/sw.template.js` — token substitution MUST use `replaceAll`
  (a single `.replace()` once hit the token's mention in the template's
  own header comment and shipped a SW that threw on evaluation).

## Testing

Purge tsc emits before every run (stale `.js` shadows `.ts` under
vitest): `find src tests \( -name "*.js" -o -name "*.js.map" -o -name "*.d.ts" \) -delete && rm -f tsconfig.tsbuildinfo`.
Then `npm run typecheck`, `npm test`, `npm run build` (emits
`docs/game`, which deploys). Offline/import behavior gets headless
drills — scripts and solved gotchas in axm-arc `docs/drills/`.
