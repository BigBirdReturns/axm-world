# Decision memo — resource-spend invariant

**Status:** accepted and implemented specification. This is the answer to
`RESOURCE_SPEND_MEMO.md`; Arc owns the resolver behavior and World projects the
same committed value. Governed by `POSITIONING.md` ("The anti-extractive
contract").

## The invariant (decided)

> **Resource spend may reduce variance or protect against downside on an
> already-plausible attempt. It may not create success for an unqualified party,
> bypass role requirements, bypass authored difficulty, rescue a failed result
> after the fact, or become purchasable power.**

"Already-plausible" is defined, not vibes: a party that **meets the contract's
count and role requirements** (the hard gates `evaluateParty` already computes as
`countOk` and `rolesOk`). Spend operates only *inside* the authored risk envelope —
it narrows the roll or cushions the downside of an attempt the party was entitled
to make. It never moves the envelope.

## Explicitly rejected (do not design toward these)

- **post-failure retry payments** — "you failed, spend N to try again";
- **spend-to-guarantee-success** — any spend that makes a check auto-pass;
- **spend-to-ignore-role-requirements** — buying past a missing required role;
- **spend-to-skip-risk** — removing the roll rather than narrowing it;
- **purchasable tokens** — tokens are earned via `tokensPerCycle` only, never sold;
- **daily scarcity pressure** — no "spend today or lose it" / login-gated regen;
- **opaque bonus math** — no hidden odds; the effect must be stated in player
  language and shown before commit.

Each of these is the extractive shape of the same lever. The invariant exists to
make them unrepresentable, not merely discouraged.

## The engine invariant (what the resolver must guarantee)

When `tokensSpent` reaches `resolveChallenge`, its only permitted
effect is a **bounded variance/downside modifier**, and it must satisfy:

1. **Gate independence.** Spend has *zero* effect on `countOk` / `rolesOk`. A
   below-minimum or role-missing party resolves identically with or without spend.
   (Enforced upstream: the option is refused when `!countOk || !rolesOk`.)
2. **No mean lift past entitlement.** Spend may not raise a check's expected score
   above what the party's own attributes produce; it may only reduce the spread
   (or absorb a bounded amount of downside variance). A party that fails on the
   mean still fails; a party on the knife's edge gets *steadier*, not *better*.
3. **Determinism preserved.** Same arc + seed + assignment (including
   `tokensSpent`) → same run. The modifier is a pure function of the authored
   parameters and the seed, not wall-clock or session state.
4. **Authored, not global.** The magnitude/shape is authored per contract (or per
   arc), never a hidden global engine behavior — otherwise it violates sovereignty
   and silently changes every cartridge.

Property tests must assert (1)–(3) before any UI ships: a hopeless party's outcome
distribution is identical with and without spend; a plausible party's variance
strictly narrows without its failure floor rising.

## First allowed implementation (the only shape that may ship first)

- **Pre-commit** — chosen before resolve, alongside the deploy step; never offered
  after an outcome.
- **Authored per contract** — the cartridge declares the lever and its magnitude;
  a contract that authors nothing shows nothing (sovereignty rule).
- **Visible before resolve** — the projection shows what the spend does to the
  risk band, in player language, before the player commits.
- **Receipt-recorded** — the result states exactly what was spent and what it
  bought ("Spent 1 {token}: steadied the roll"), and the ledger shows the debit.
- **Non-purchasable** — earned tokens only.
- **Refused below requirements** — the option does not render when the party is
  below the contract's minimum count or missing a required role.

This is the fourth implemented encounter-agency taxonomy row. The resolver,
projection, debit, receipt, and property tests all enforce the invariant above.

## Control question

> Can tokens become an honest risk-management lever while the engine still refuses
> hopeless parties, preserves authored difficulty, and records exactly what the
> player spent and why?

The shipped implementation answers yes to all three clauses simultaneously. A
future modification that cannot do so is rejected.

## Completed sequence

1. The decision memo was accepted.
2. Arc added the authored parameter, resolver modifier, gate independence, exact
   debit, receipt fields, and property tests.
3. World re-vendored the exact Arc source and added the pre-commit control,
   resolver-faithful projection, receipt, and browser/campaign coverage.
