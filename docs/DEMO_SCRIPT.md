# Demo Script — The Proof Tour

A reviewer can follow this tour end to end **without reconstructing any project
history**. Every step is a click in the running app, and every claim is backed
by an existing automated test you can run in one command.

## The one control question

> Did **one authored cartridge** become a board card, a world node, a playable
> encounter, an engine result, and a ledger writeback — **without re-authoring
> four systems**?

The answer is yes, and this tour shows it four ways. Each proof point below
gives (a) how to reach it in the running app and (b) the existing automated test
that already guards it. The tour also shows one thing the app deliberately does
**not** offer, because offering it would be fake agency.

Two cartridges carry the tour:

- **First Charter** (`play-cartridge-first-charter`) — a fixed campaign that
  authors **no** difficulty modes. Its encounters stay fixed.
- **Karazhan** (`play-cartridge-karazhan`) — authors a **Heroic** difficulty
  mode, so its encounters gain a posture chooser.

Nothing in the shell branches on a cartridge id. Every difference you see below
is derived from what the cartridge authored.

---

## Running the app

From the repo root:

```bash
# Drop any stale compiled JS so Vite serves fresh TypeScript, then boot.
find src -name '*.js' -not -path '*/node_modules/*' -delete
npx vite --port 5188
```

Open **`http://localhost:5188/axm-world/game/`**.

You land on the cartridge library. Both proof cartridges appear as entries:

- `[data-testid="play-cartridge-first-charter"]`
- `[data-testid="play-cartridge-karazhan"]`

Click one to enter its world.

**First Charter opens with a decision card.** As soon as you enter First Charter
you get an opening decision (`[data-testid="pending-decision-card"]`). Resolve it
before anything else: click one of the option buttons inside the card, then click
**Continue**. The card dismisses and does not replay. (This mirrors the e2e
helper `resolveOpeningDecision` in `e2e/helpers.ts`.) Karazhan has no opening
decision.

**Selecting a contract.** On the board, click a contract card
(`[data-testid="contract-board-card-<id>"]`; if that does not take, use the
wrapper `[data-testid="contract-board-cardwrap-<id>"]`), then click
**Play encounter** (`[data-testid="play-encounter-button"]`). That opens the
encounter shell, whose regions are:

| Region | testid | What it is |
| --- | --- | --- |
| Brief | `encs-brief` | Approach text + "derived from the contract" note |
| Posture | `encs-posture` | Difficulty chooser — **only rendered when authored** |
| Deploy | `encs-deploy` | The squad turn |
| In room | `encs-in-room` | Agents you are committing |
| Reserve | `encs-reserve` | Benched agents |
| Agent token | `encs-token-<agentId>` | Tap to move an agent between room and reserve |
| Projection | `encs-projection` | Live projected outcome (`data-projected` attribute) |
| Resolve | `encs-resolve` | Commit the encounter to the engine |
| Receipt | `encs-receipt` | The result (`data-outcome` attribute) |
| Ledger | `encs-ledger` | The writeback lines |

Board selection is flaky under browser automation, so this is written as a
**manual** route. The automated proof of the same behaviour is the vitest suite
cited under each point (and summarised in the final section).

---

## Proof 1 — First Charter · The Cellar (fixed deployment)

**The claim.** The Cellar authors a party of exactly 6 (min == max == 6, no role
requirements). All six required agents must enter; there is **no pre-resolve
squad choice** — and that absence is the *feature obeying the contract*, not a
missing feature. Resolving records the ledger: the node reads as RECORDED,
renown rises, loot drops.

**Reach it in the app.**

1. Enter First Charter and resolve the opening decision.
2. Select the Cellar: `[data-testid="contract-board-card-cellar"]` →
   `[data-testid="play-encounter-button"]`.
3. In the encounter shell, `encs-in-room` already holds all six agents and
   `encs-reserve` is empty. There is **no `encs-posture` region** — First Charter
   authored no difficulty modes. Pulling agents to the reserve can only take you
   below the required 6, which disables resolve; there is no legal sub-squad.
4. Click `[data-testid="encs-resolve"]`. The receipt appears
   (`[data-testid="encs-receipt"]`, `data-outcome="success"` on a good run), the
   ledger lines list the currency reward and the `cellar-cleared` milestone
   (`[data-testid="encs-ledger"]`).
5. Switch to the map costume — `[data-testid="view-map"]` — and the Cellar pin
   `[data-testid="wm-pin-cellar"]` now shows the recorded mark
   `[data-testid="wm-recorded-cellar"]`. (Un-cleared, available nodes instead
   expose an enter button `[data-testid="wm-enter-cellar"]`.)

**The guarding test.** `tests/world/encounter-agency.test.ts`

- *"The Cellar is choice-locked"* — a party of 5 fails the engine count gate
  (`countOk === false`), a party of 6 passes; min == max == roster, so there is
  no honest sub-choice.

Ledger fidelity for this exact contract is pinned in
`tests/world/compile-encounter.test.ts`:

- *"The Cellar: one team_aggregate objective, stress hazard, six flex slots"* —
  six pre-filled flex slots (`requiredRole === null`), success ledger includes
  `30` currency and the `cellar-cleared` milestone.
- *"the loop closes"* — the compiled success preview matches what `runCycle`
  actually writes: currency and reputation rise, and the clear is stamped onto an
  agent's `assignmentHistory` (the persistent RECORDED signal the map reads).

The map's RECORDED state itself is guarded by `tests/world/worldmap.test.ts`
(*"a cleared contract reads as a recorded location"*).

---

## Proof 2 — First Charter · The Bridge Troll (deployment choice)

**The claim.** The Bridge Troll authors a *real* squad choice: min 4 / max 6,
with a required Vanguard. Which agents you deploy changes the **live
projection** before you commit, and the **committed** squad — not the
recommended one — is what actually resolves.

**Reach it in the app.**

1. From the First Charter board, select the Bridge Troll:
   `[data-testid="contract-board-card-bridge-troll"]` →
   `[data-testid="play-encounter-button"]`.
2. The `encs-deploy` header shows `committed/6` and a "min 4" range. Tap agent
   tokens (`[data-testid="encs-token-<agentId>"]`) to move them between
   `encs-in-room` and `encs-reserve`.
3. Watch `[data-testid="encs-projection"]` — its `data-projected` attribute
   changes as you add or bench agents (team_aggregate sums each committed agent).
4. Bench **every Vanguard**: the projection flips toward failure, because the
   required role is unmet. Send a legal 4 vs all 6 and the projected score
   moves — the choice is not cosmetic.
5. Commit a squad with `[data-testid="encs-resolve"]`; the receipt reports
   exactly the agents you sent — no silent substitution with the recommendation.

**The guarding test.** `tests/world/encounter-agency.test.ts`

- *"benching every Vanguard flips the projection to failure"* — `rolesOk`
  becomes false and `projectedOutcome` becomes `"failure"`; the with-Vanguard
  projection differs.
- *"committing 4 vs all 6 reaches the engine's aggregate math"* — the
  `troll-assault` check's projected value differs between a 4-agent and a
  6-agent squad; both are count-legal.
- *"the COMMITTED squad — not the recommended one — is what runCycle resolves"* —
  the load-bearing guarantee. A deliberately-swapped legal squad (a benched
  Mender in place of a recommended Vanguard) is what the engine resolves; the
  receipt shows the swapped-in agent and **not** the benched-out one.

---

## Proof 3 — Karazhan · Attumen, Standard → Heroic (difficulty-mode choice)

**The claim.** This is the *second* agency type, and it appears **only where the
cartridge authors it**. Karazhan authors a Heroic difficulty mode, so Attumen's
encounter shows a posture chooser. Switching from Standard to Heroic **recompiles
the encounter**: it adds an objective ("The Tower Unravels"), raises the reaches,
and shifts the projection — all through the same `applyDifficultyMode` transform
the resolver uses. First Charter, which authors no modes, shows no posture
chooser at all (see Proof 1).

**Reach it in the app.**

1. Enter Karazhan (`[data-testid="play-cartridge-karazhan"]`). No opening
   decision here.
2. Select Attumen: `[data-testid="contract-board-card-attumen"]` →
   `[data-testid="play-encounter-button"]`.
3. The `[data-testid="encs-posture"]` region **is** present (contrast Proof 1).
   It starts on `[data-testid="encs-posture-standard"]`.
4. Click `[data-testid="encs-posture-heroic"]`. The objective list gains **The
   Tower Unravels**, the per-objective reach values rise, and
   `[data-testid="encs-projection"]` shifts to a lower margin for the same squad.
5. Resolve as usual; the receipt records which posture you played
   (`[data-testid="encs-posture-record"]`).

**The guarding test.** `tests/world/difficulty-mode-choice.test.ts`

- *"the lever exists only where authored"* — `FIRST_CHARTER.difficultyModes` is
  length 0; `KARAZHAN.difficultyModes` is non-empty; and Karazhan is a
  **bundled** world cartridge, so this proof is reachable live.
- *"choosing the posture recompiles the encounter"* — Heroic yields strictly more
  objectives than Standard, and a shared objective's `targetThreshold` rises
  under the 1.3x posture.
- *"the projection shifts before commit"* — same squad, higher threshold, so
  strictly less margin; the choice reaches the engine-faithful projection before
  you commit.
- *"a fixed cartridge is untouched"* — First Charter authors no `heroic` mode, so
  The Cellar stays exactly fixed even if a stray mode id arrived.

The distinctness of the two derived encounters (Cellar vs Attumen) is separately
pinned in `tests/world/compile-encounter.test.ts` (*"the two encounters are
genuinely distinct projections"*: different objective counts, different max
agents, role-specific slot only on Attumen).

---

## Proof 4 — Resource-spend is deliberately NOT offered

**The claim.** The encounter shell offers exactly two kinds of agency —
**deploy** (Proof 2) and **posture** (Proof 3). It does **not** offer a
"spend tokens to improve your odds" chooser, and that omission is honest.

**Why.** The resolver does **not** honor `tokensSpent` as an outcome lever yet.
In `src/engine/cycle.ts`, a positive `tokensSpent` only *deducts* tokens via
`spendTokens` — the value is never passed into `resolveChallenge`, which
computes the outcome from the challenge, the committed agents, the org, and the
RNG. So spending tokens changes your balance but **not** the projection or the
result. Surfacing a token-spend "odds boost" in the encounter shell would be
fake agency: a control that pretends to matter while the engine ignores it.

**Verify it in the app.** Look through the encounter shell for either cartridge:
the only interactive agency controls are the posture buttons
(`encs-posture-*`, where authored) and the agent tokens (`encs-token-*`). There
is no token-spend control anywhere in `encs-deploy` or `encs-brief`.

**Verify it in code.** `src/engine/cycle.ts` — the `tokensSpent` branch calls
`spendTokens(org, assignment.tokensSpent)` and then calls `resolveChallenge`
**without** the token count. The behavioral tests above always pass
`tokensSpent: 0` for the same reason.

---

## Run the automated proof

Every claim above is guarded by a green test. Run the whole suite:

```bash
# Same stale-JS sweep, this time across src and tests, then run vitest.
find src tests -name '*.js' -not -path '*/node_modules/*' -delete 2>/dev/null
npx vitest run
```

Expect **all green (~375 tests)**. The four load-bearing files for this tour:

| Proof point | File |
| --- | --- |
| Compiler derives distinct encounters + the loop closes | `tests/world/compile-encounter.test.ts` |
| Deployment choice moves projection; committed squad resolves; Cellar choice-locked | `tests/world/encounter-agency.test.ts` |
| Posture only where authored; recompiles; projection shifts; Karazhan bundled | `tests/world/difficulty-mode-choice.test.ts` |
| World-node projection + recorded state | `tests/world/worldmap.test.ts` |

If the four tour points are green, the control question is answered: one authored
cartridge became a board card, a world node, an encounter, an engine result, and
a ledger writeback — with no per-cartridge special-casing in the shell.
