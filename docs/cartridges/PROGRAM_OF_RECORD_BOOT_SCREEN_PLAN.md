# Program of Record — Unified Boot Screen Plan

**Status:** plan only. **The Program of Record source is a compiled,
self-contained HTML artifact — a bundled/minified single-page build, not a
normal editable source tree.** Per the runbook rail, we therefore **do not do
surgery on the bundle.** This document is the exact implementation plan to be
executed *if and when* an editable PoR source tree exists. Until then, nothing
here is applied.

> **Why a plan and not a patch.** Editing a minified bundle means editing
> machine-generated code with no stable identifiers, no module boundaries, and
> no test seam — every change is fragile and unreviewable, and a rebuild would
> silently overwrite it. A boot-screen change is a *UI-composition* change; it
> belongs in source, against the real Setup component, or not at all.

---

## 1. Goal

Replace PoR's current entry experience with a **single unified boot screen** —
one legible screen that stands the program up — instead of a scattered set of
setup controls. The player should be able to go from launch to "match starting"
in one coherent screen, with an obvious primary action and an obvious demo path.

## 2. Strict scope

**Touch only the setup surface.** Concretely, only:

- the **Setup component** (the entry/new-game screen), and
- the **setup CSS** (styles owned by that screen).

**Do NOT touch** any of the following — they are explicitly out of bounds for
this change:

- rules model / turn engine
- auctions
- interference
- CPU driver
- market
- milestones
- EndScreen
- Briefing
- AfterAction
- resolver
- phase machine

If implementing the boot screen appears to require changing any item on that
list, **stop and report** — that is a signal the boot screen is reaching into
runtime it should only *configure*, not modify.

## 3. Boot screen contents

The unified screen composes existing setup inputs into one layout. Every control
below already has a backing setting in PoR's setup state; the boot screen only
*presents* them together — it introduces no new game mechanics.

1. **Mode** — Solo vs CPU / Pass & Play. Chooses whether opponents are scripted
   or human-at-the-same-device.
2. **Opponents (table preset)** — Training Table / Normal Table / Knife Fight /
   Circus. A named difficulty/temperament preset for the opposing seats.
3. **Players** — 2 / 3 / 4. Number of seats.
4. **Doctrine** — PRIME / NEO-PRIME / DECENTRALIZED. The player's starting
   posture (see PROGRAM_OF_RECORD_INTAKE.md §3).
5. **Doctrine Brief** — a short, always-visible explanation of the selected
   doctrine so the choice is legible, not a blind pick.
6. **Advanced Table toggle** — collapsed by default; when expanded, **preserves
   the existing seat editor** (per-seat doctrine / name / type). The toggle must
   not replace or reimplement the seat editor — it wraps the existing one.
7. **STAND UP THE PROGRAM** — the primary action. Commits the configuration and
   starts the match. Visually dominant; single obvious CTA.
8. **WATCH A DEMO MATCH** — secondary action. Launches a demo/auto-played match
   using the existing demo path. Secondary emphasis, clearly distinct from the
   primary CTA.

## 4. Layout & interaction notes

- **One screen, one primary action.** STAND UP THE PROGRAM is the single
  dominant CTA; WATCH A DEMO MATCH is secondary; everything else is
  configuration above them.
- **Progressive disclosure.** Mode / Opponents / Players / Doctrine are always
  visible. The seat editor lives behind the Advanced Table toggle, collapsed by
  default, so the default screen stays legible.
- **Doctrine Brief updates live** with the doctrine selection — no separate
  screen, no modal.
- **No new state.** Every control binds to an existing setup value. The boot
  screen is a re-composition of existing inputs, not a new configuration model.
- **Preserve the seat editor verbatim.** The Advanced Table toggle reveals the
  current seat editor component unchanged; it is wrapped, not rewritten.

## 5. Implementation approach (when source is editable)

1. Locate the Setup component and the setup CSS in the editable source tree.
2. Restructure the Setup component's render into the §3 layout: a config block
   (Mode, Opponents, Players, Doctrine, live Doctrine Brief), an Advanced Table
   `<details>`/toggle wrapping the **existing** seat editor, then the two
   actions (STAND UP THE PROGRAM primary, WATCH A DEMO MATCH secondary).
3. Bind each control to its **existing** setup state field. Add no new
   game-state; add only local UI state for the collapse toggle and the
   live-brief selection if not already present.
4. Wire STAND UP THE PROGRAM to the existing match-start action and WATCH A DEMO
   MATCH to the existing demo path. Do not create new start/demo logic.
5. Update setup CSS only: layout for the config block, the collapsible advanced
   section, the doctrine brief, and the primary/secondary action hierarchy.
6. Verify: from a cold load, each mode/preset/player/doctrine choice is
   reachable, the advanced toggle reveals the intact seat editor, both actions
   start the correct flow, and no non-setup component was modified.

## 6. Integrity rails

- **No bundle surgery.** If the only PoR artifact remains a compiled HTML
  bundle, this plan is not executed — it waits for editable source.
- **Setup-only diff.** The resulting change must touch only the Setup component
  and setup CSS. Any diff outside those is a scope violation → stop and report.
- **No mechanic changes.** The boot screen configures the match; it never alters
  rules, economy, opponents' behavior, or resolution. It adds no lever and
  changes no outcome.
- **Preserve, don't reimplement.** The seat editor and the demo path are reused
  as-is behind the new composition.

---

*Plan only. Not applied. Executes only against an editable Program of Record
source tree; against the current compiled bundle, this document is the
deliverable and no code changes are made.*
