# Pending upstream: `roleIds` on `MechanicCheck` (resolve engine-drift correctly)

## Why this exists

`src/engine/` in axm-world is **vendored verbatim** from `axm-arc` (see
`src/engine/VENDORED_FROM`). The `roleIds` feature — letting a `role_specific`
mechanic check name the role it scopes to — currently lives in the **vendored
copy only**. That makes `engine-drift` CI red: the vendored engine no longer
matches the pinned axm-arc commit.

The fix is **not** to move `roleIds` out of the engine into the world/UI layer.
`role_specific` scoping is challenge *resolution* behavior, so the engine must
own it; the readiness projection only mirrors it. Moving it would reintroduce
the original bug (UI predicts one rule, resolver runs another).

The correct fix is upstream-first:

1. Land `roleIds` in **axm-arc** (the source engine).
2. Re-vendor into axm-world (`npm run engine:sync`), which bumps the pinned
   commit in `VENDORED_FROM`.
3. `engine-drift` then goes green honestly.

This session is scoped to `bigbirdreturns/axm-world` only, so it **cannot** push
to axm-arc or run `engine:sync` (that reads axm-arc). Everything axm-arc needs is
prepared here for a maintainer / an axm-arc-scoped session to apply.

## Step 1 — apply in axm-arc

`roleIds.patch` in this directory is the exact, self-contained engine change
(4 files, additive, backward compatible). From the axm-arc repo root, against the
commit currently pinned in axm-world (`ec85a69a417b026b1131a22a732190b996826050`):

```sh
git apply /path/to/roleIds.patch     # or: git am, or apply by hand
```

It adds:

- `types.ts` — `roleIds?: string[]` on `MechanicCheck`.
- `schema.ts` — `roleIds: z.array(z.string()).optional()`.
- `resolver.ts` — `role_specific` scope uses `check.roleIds` when present, else
  falls back to the challenge's `roleRequirements` (legacy behavior).
- `projections.ts` — the engine's own projection helper honors the same rule.

### Resolver test to add in axm-arc

```ts
// role_specific + roleIds: only the named role is scored; others get a neutral pass.
it("role_specific check with roleIds only evaluates the named role", () => {
  // check.roleIds = ["vanguard"]; a mender in the party gets {passed:true, score===threshold};
  // a vanguard is actually scored (score !== threshold in general).
});

// Backward compatibility: no roleIds -> challenge-level required roles, unchanged.
it("role_specific check without roleIds keeps legacy challenge-level role behavior", () => {
  // scope falls back to challenge.rosterRequirements.roleRequirements.
});
```

axm-world already ships an equivalent guard at
`tests/world/role-scope-parity.test.ts` (runs the vendored resolver and the
readiness projection on Merchant Escort and asserts they scope identically, plus
the legacy fallback). Port that resolver portion as the canonical axm-arc test.

## Step 2 — re-vendor in axm-world (after axm-arc has landed it)

```sh
npm run engine:sync           # clones axm-arc@main, copies src/engine, bumps the pin
npm run engine:check          # must print "OK: vendored engine matches axm-arc@<sha>"
npm run typecheck && npm test # 225 unit tests green
```

`engine:sync` overwrites the vendored `.ts` with axm-arc's, so axm-world adopts
axm-arc's exact formatting; the `VENDORED_FROM` commit advances to the new SHA and
`engine-drift` goes green.

Keep everything already on this branch:

- First Charter data tags (`escort-guard → roleIds:["vanguard"]`,
  `escort-sustain → roleIds:["mender"]`, and the other role_specific checks) —
  these are cartridge data in `src/arcs/`, **not** vendored, so `engine:sync`
  leaves them untouched.
- The readiness projection (`src/world/readiness.ts`) and the fix-plan UI — also
  outside `src/engine/`.

## Acceptance — done only when all hold

- [ ] axm-arc owns `roleIds` (types + schema + resolver + tests).
- [ ] axm-world consumes the updated engine via `engine:sync`; `VENDORED_FROM`
      commit advanced.
- [ ] `engine-drift` green (no faked pin, no reverted feature).
- [ ] Resolver tests prove role-scoped checks (in axm-arc).
- [ ] Readiness tests prove the UI projection matches resolver scoping
      (`tests/world/role-scope-parity.test.ts`, already here).
- [ ] Merchant Escort reads correctly: Vanguard checks score Vanguards, Mender
      checks score Menders.
- [ ] No duplicate rule that lives in the UI only — the engine is the source of
      truth; readiness mirrors it and is parity-tested against it.
