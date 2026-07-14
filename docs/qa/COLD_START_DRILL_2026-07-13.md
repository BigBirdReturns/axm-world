# Cold-start drill — The First Charter

- **Date:** 2026-07-13
- **Baseline:** axm-world `6af21a1`
- **Viewports:** Chromium desktop 1280×800 and Pixel 5 mobile 390×844
- **Path:** cold bay → opening decision → board → encounter → outcome → post-run → ledger

## Result

The First Charter completes its first loop on desktop and mobile without a
crash. The run visibly remembers the opening doctrine, advances the cycle,
marks The Cellar recorded, updates progress to 1/6, and writes an inspectable
ledger entry. The outcome screen clearly answers what happened, why, what
changed, what was recorded, and what comes next.

That makes the loop functional, not yet stranger-proof. The drill found three
framing problems that block the cold-session bar and several smaller defects.

## Stranger blockers

1. **Desktop presented two competing commit actions.** `Run Contract` invoked
   auto-resolution while `Play Encounter` entered the authored encounter. A new
   player could not know whether these were duplicate buttons or sequential
   steps. Mobile already taught one path with a Deploy → Play Encounter →
   Recorded guide.
2. **Readiness appeared as unlabeled arithmetic.** Lines such as `70.8 / 5`,
   `Power 18.8`, and `needs +0.2 buffer` exposed implementation vocabulary
   without explaining which value belonged to the squad or what was required.
3. **The bay led with platform metadata before fiction.** Authored identity,
   engine version, trust, and “Program of Record” appeared before a concise
   fantasy logline explaining the guild the player was about to charter.

## Product-order finding

The second bundled cartridge was still Karazhan (`haunted-fantasy`, fourteen
contracts). It is a large IP-bound proof cartridge and should not be the second
thing a cold player sees. The roadmap already calls for a compact, IP-safe
second grammar.

## Player-language leaks

The play surface still exposes architecture language such as “rail,” “claim,”
“cartridge doctrine,” “checks against the program,” and “survive representation
changes.” This vocabulary belongs in provenance and developer surfaces, not in
the fiction-first play loop.

## Confirmed defects and friction

- Desktop roster repair actions (`Train`, `Rally`, `Rest`) overlapped their
  icons and score changes inside a three-column action grid.
- Export Run used a danger color despite being a safe custody action.
- The result advertised +30 Gold while the top bar moved 100→118; the separate
  −12 upkeep settlement was true but not surfaced at the moment of change.
- The recommended party changed after the run without explaining why.
- Mobile clipped the rightmost Recorded-progress chip in the top status bar.

## What worked

- Mobile's staged squad-versus-threat scene and three-step loop were immediately
  legible.
- The opening choice combined fiction with explicit mechanical effects.
- The result receipt made consequence and ledger writeback clear.
- Progress, cycle, doctrine, and recorded world state persisted honestly.

## Honesty note

An automated probe initially reported a squad-fit reason divergence, but it had
compared different contracts. The live happy path did not reproduce a visible
disagreement. Code inspection did reveal a latent risk: the board and detail
panel selected their reason strings independently. That is recorded as a guard
hardening issue, not as a reproduced player-facing failure.

## Follow-up in the first vertical-slice repair

- Closed the competing desktop commit paths: the shell now exposes only **Play
  Encounter**, matching mobile.
- Replaced score/threshold slash notation with named squad-versus-needed copy
  and rewrote buffer language around the actual requirement.
- Routed both squad-fit surfaces through one reason helper, eliminating the
  latent divergence without claiming it was observed live.
- Changed roster repair actions to a full-width single-column layout so labels,
  icons, and score deltas do not collide.

The next cold-session work remains the cartridge logline and player-facing copy
pass, followed by the IP-safe second-cartridge decision. Economy explanation,
export styling, recommendation-change explanation, and mobile status clipping
remain named polish items.
