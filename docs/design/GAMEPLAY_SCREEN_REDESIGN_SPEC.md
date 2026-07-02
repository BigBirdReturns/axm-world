# Gameplay Screen Redesign Spec

Status: design contract. Not code. Not the icon system (closed, PR #11 merged,
frozen — do not reopen).

Audience, in order: Codex (execute without inventing layout logic) → the
requester (reject drift) → future agents (know what each region is allowed to
do).

Data model: frozen for this pass. Keep contract nodes, party assignment, role
requirements, readiness checks, the seven card states (selected / available /
reliable / risky / failing / locked / recorded), fix plan, encounter overlay,
loot/equip, recorded outcomes, cycle/gold/renown/recorded counters. Do not
change the simulation model, invent new resources, rewrite the cartridge
schema, add 3D/planet work, or reopen icon/provenance work. Only presentation
hierarchy, region responsibility, layout, and staging are open.

Target feel (not a genre, not a comp): the player should be able to say, in
order — I am choosing a place. I am committing a roster. I understand the
risk. I know the best fix. I see the run happen. I receive a recorded
consequence. I equip a reward that changes the next decision. Every region
below exists to make exactly one of those true.

---

## 1. Shell / global HUD

**Purpose.** Persistent orientation: where the player is in the cartridge
(cycle, resources, recorded progress), and a fixed, non-competing home for
system chrome (view switcher, cartridge exit).

**Unique decision enabled.** None — this region makes no decision. Its job is
to make every other region's decision legible without re-deriving context
(what cycle is this, how much do I have, how much have I recorded).

**Keep**
- `StatusRegion` content: title, cycle, resources, recorded progress.
- `ViewSwitcher` (Board / Planet / Debug Graph).

**Delete**
- The floating tutorial tooltip ("Board. The cartridge's work as board-game
  cards...") as an absolute-positioned overlay with no fixed slot. It
  currently competes with the play surface for z-index on first load.

**Rebuild**
- Give onboarding copy a permanent, fixed slot inside the shell (a collapsible
  strip under the HUD, or a first-run card that renders in normal document
  flow) so it never overlaps board content and never needs a manual dismiss
  click to get out of the way.

**Acceptance checks**
- [ ] No absolutely-positioned tooltip overlaps board or rail content at any
      viewport width on first load.
- [ ] Cycle/resource/recorded counters remain visible without scrolling at
      all supported breakpoints.

**Screenshots required**
- Desktop shell on first load (onboarding state).
- Desktop shell after dismissing/completing onboarding.

---

## 2. Center board

**Purpose.** The contract selection surface. Show every reachable and locked
place, and make the dependency between them (what unlocks what) visible
without opening a card.

**Unique decision enabled.** Given where I've already been and what's locked
behind what, where do I go next?

**Keep**
- `PixelContractCard` and its 7-state visual language.
- Tier grouping as a difficulty gate.

**Delete**
- Flat, order-independent card lists inside each lane. Locked cards currently
  communicate their dependency only via a text list revealed on select — the
  board itself shows no relationship between cards.

**Rebuild**
- Render `node.requirements` as visible adjacency: a locked card must show a
  visual connection (line, shared edge, lane offset) to the specific
  cleared/available card that unlocks it, legible across the whole board
  without opening any single card.
- Add a per-card or per-lane escalation signal for contracts left unaddressed
  across cycles (border intensity, a waiting-N-cycles tag). **Needs a hook**
  if the engine does not already expose cycles-since-available per node —
  confirm against `WorldNode`/`ArcWorld` before building; if absent, this
  item blocks on an engine addition and should be reported back, not silently
  dropped or faked client-side.

**Acceptance checks**
- [ ] For every locked card on screen, the specific unlocking card(s) are
      visually identifiable without a click.
- [ ] Escalation signal (or the "needs a hook" blocker report) is present.
- [ ] All 7 card states still render correctly (regression check against
      PR #11's contract-board screenshot).

**Screenshots required**
- Desktop board showing at least one locked→unlocking adjacency rendered.
- Desktop board showing the escalation signal on an aged contract (or the
  blocker report if the hook doesn't exist).

---

## 3. Roster rail

**Purpose.** The capacity/commitment surface — not a roster spreadsheet.
Answer "who exists" only as much as needed to answer "who do I send."

**Unique decision enabled.** Given the contract I'm looking at, who should I
send, and why is one agent clearly better or worse than another for it?

**Keep**
- `PixelRosterCard` internal anatomy (role badge, attribute, gear slot,
  meters).
- Dynamic attribute display keyed to the selected contract's checked
  attributes.

**Delete**
- Uniform card height for every agent regardless of relevance to the selected
  contract.
- Three always-visible downtime buttons (Rest/Train/Rally) per card at all
  times, including when no contract is selected.

**Rebuild**
- Rank by relevance to the selected contract. Agents satisfying required
  roles with the highest relevant attributes render at full detail in a
  "recommended party" zone at the top; all others collapse to a slim row
  (name, role glyph, one relevant number) that expands on interaction.
- Surface downtime actions from the fix plan, not redundantly on every card:
  a downtime button appears on an agent's card only when the currently
  selected contract's fix plan (`FixSuggestion`, kind `"downtime"`) names
  that agent and action.
- When no contract is selected, default every card to the collapsed row —
  there is no "who's the pick" question to answer yet.

**Acceptance checks**
- [ ] With a contract selected, the top of the rail shows the
      engine-recommended party at full detail; all other agents are visibly
      more compact than in the current (pre-redesign) layout.
- [ ] Downtime buttons appear only when the selected contract's fix plan
      names that agent/action — verify against at least one risky contract's
      fix plan.
- [ ] With no contract selected, no agent renders in full-detail form.

**Screenshots required**
- Roster rail with a risky contract selected (recommended party expanded,
  others collapsed).
- Roster rail with no contract selected (all collapsed).
- Roster rail showing a downtime button sourced from an actual fix
  suggestion, with the fix plan panel visible in the same shot for
  correlation.

---

## 4. Contract detail rail

**Purpose.** The decision warrant — not a data dump. Everything needed to
decide "should I run this, and is my party ready" lives here and nowhere else.

**Unique decision enabled.** Should I run this contract now, with this party,
or fix something first?

**Keep**
- State badge, title, description, party count, run button.

**Delete**
- Nothing structural in this region — its own contents are sound (confirmed:
  the reliable-Cellar screenshot from PR #11 already reads as coherent). The
  problem is what shares its column (see §5 and §7 below), not this region's
  own content.

**Rebuild**
- Confirm this region renders alone when a contract is selected and not run
  yet — no outcome report, no loot panel sharing the column at the same time
  (see §7, §8 for where those move).

**Acceptance checks**
- [ ] When a contract is selected and not yet run, the detail rail contains
      only contract detail + readiness + fix plan + run button — no outcome
      or loot content visible in the same scroll region.

**Screenshots required**
- Detail rail in the "choosing" phase only, full column, no other phase's
  content present.

---

## 5. Fix plan / readiness

**Purpose.** The specific sub-surface of the detail rail that turns "this is
risky" into "here is what would make it reliable, and by how much."

**Unique decision enabled.** Which single action (train/rally/rest an agent,
swap a party member, equip gear) most cheaply converts risky/failing into
reliable?

**Keep**
- `PixelReadinessRow` (ready/thin/short states, projected vs. threshold,
  margin, top contributors).
- Fix plan buttons showing before→after score deltas.

**Delete**
- Nothing — this sub-surface is the strongest existing piece (per the
  reliable-Cellar and risky-Bridge-Troll screenshots already captured). Do
  not modify its internals in this pass.

**Rebuild**
- Wire its existing downtime suggestions to drive the roster rail's
  downtime-button visibility (see §3) instead of being the only place that
  information appears.

**Acceptance checks**
- [ ] No visual or data changes to `PixelReadinessRow` or fix-plan buttons
      themselves.
- [ ] A downtime fix suggestion here is reflected as a roster-rail button per
      §3's acceptance check.

**Screenshots required**
- Covered by §3's correlated screenshot (fix plan + roster button together).
  No separate screenshot required if that one is captured.

---

## 6. Encounter transition

**Purpose.** The transition from decision to record — not a modal toast. The
player should watch the committed party travel to and resolve the chosen
place.

**Unique decision enabled.** None (this is a transition, not a decision
point) — but it must visibly connect the decision just made (§4/§5) to the
consequence about to be recorded (§7).

**Keep**
- Phase machine: `idle → dispatch → travel → encounter → resolve-checks →
  result → record`.
- `MotifIcon` as the per-location visual anchor across phases.
- Click/Escape-to-skip at any phase.

**Delete**
- Structurally identical phase cards (icon + label + text, indistinguishable
  in visual weight regardless of phase).
- Generic spinning-dice glyph for resolve-checks regardless of actual
  projected outcome.

**Rebuild**
- Travel phase must visually move toward the board position of the selected
  contract card (the card is still rendered behind the overlay; use its DOM
  position) — a moving path/dot/token, not a static label reading "En
  route."
- Resolve-checks phase must visually differentiate by the party's actual
  precomputed `PartyReadiness.projectedOutcome` — a reliable run should read
  calmer than a risky/failing run mid-resolve, not identical every time.
- Result phase must visually resolve onto the board (the contract card
  updating state) rather than dismissing to reveal an unchanged board with
  only one badge different.

**Acceptance checks**
- [ ] Travel phase shows directional motion toward the selected card's
      screen position.
- [ ] Resolve-checks phase visibly differs between a reliable-projected run
      and a risky/failing-projected run (capture both).
- [ ] Dismissing result shows the board card's state already updated in the
      same visual moment, not as a separate step after dismiss.

**Screenshots required**
- Travel phase mid-motion.
- Resolve-checks phase for a reliable-projected run.
- Resolve-checks phase for a risky or failing-projected run.
- Result phase resolving onto the updated board card.

---

## 7. Outcome / record

**Purpose.** Memory, not decision. A receipt of what happened, permanently,
to this cartridge. Must never cost the player scroll distance to get back to
a live decision.

**Unique decision enabled.** None. This is explicitly not a decision surface
— its only job is to not block one.

**Keep**
- The underlying `PlayReportView` data and `ReportRegion` content itself
  (outcome badge, challenge name, reward summary).

**Delete**
- `ReportRegion` living in the same scroll column as the live contract detail
  rail, forcing the player to scroll past it to return to a decision.

**Rebuild**
- Move outcome to a transient banner/toast over the board at the moment of
  resolution (extend the encounter director's existing result phase — see
  §6 — rather than duplicating outcome display in the side rail), or to a
  permanent log/history view reachable from the shell header (§1), not
  competing for space in the live decision rail.

**Acceptance checks**
- [ ] Outcome content no longer occupies persistent space in the contract
      detail rail's scroll column.
- [ ] Outcome is reachable either as a transient board-level moment or from
      a header-level history view.

**Screenshots required**
- Outcome shown in its new location (banner or history view), with the
  contract detail rail visibly not containing it.

---

## 8. Loot / equip

**Purpose.** Proof that the last run changed the next run — not an admin
panel. This is a reward moment, and it must read as one.

**Unique decision enabled.** Which agent should I equip this item to, given
what I'm about to try next?

**Keep**
- `PixelLootCard` internal anatomy (icon, slot, bonus text, flavor text,
  equip-target buttons).

**Delete**
- Loot/equip stacking directly beneath outcome in the same scroll column,
  competing with it for space and visual weight.

**Rebuild**
- When loot is pending, the detail rail's identity flips entirely to
  loot/equip — full width, full visual weight, the only thing in that
  column. Not a card among cards; the column's sole occupant until claimed.
- After equip, the same rail should flip back to contract detail (§4) with
  the affected agent's readiness numbers visibly updated in that transition
  — not merely correct on next inspection, but changing in front of the
  player.

**Acceptance checks**
- [ ] When loot is pending, no other panel (contract detail, outcome) shares
      the detail rail with it.
- [ ] After equipping, the rail returns to contract detail and the equipped
      agent's relevant readiness number is different from before equip,
      visible in the same session without reselecting.

**Screenshots required**
- Loot/equip occupying the full detail rail alone.
- Detail rail immediately after equip, showing the changed readiness number,
  paired with the pre-equip readiness screenshot from PR #11 for
  before/after comparison.

---

## 9. Mobile layout

**Purpose.** Same region identities as desktop (§1–§8), restacked for a
narrow viewport — not a separate design.

**Unique decision enabled.** Identical to desktop, per region. Mobile does
not get new decisions or lose any.

**Keep**
- Bottom-dock roster carousel pattern.
- Stacked contract detail below the board.

**Delete**
- Nothing structural yet — mobile stacking order should be revisited only
  after desktop region identities (§2–§8) are settled, so this doesn't get
  built twice.

**Rebuild**
- Apply the same choosing/claiming phase-flip from §4/§8 to the mobile
  stacked detail area: when loot is pending, it replaces contract detail in
  the stack, full width, not appended below it.
- Apply the same roster ranking/collapse from §3 to the horizontal carousel:
  recommended party first in scroll order and visually distinct, not
  uniform-width cards in roster order.

**Acceptance checks**
- [ ] Mobile detail area shows the same phase-flip behavior as desktop
      (choosing vs. claiming never both present).
- [ ] Mobile roster carousel orders the recommended party first and
      visually distinguishes it from the rest.

**Screenshots required**
- Mobile board (390px width).
- Mobile roster carousel with a contract selected (recommended agents
  visually first/distinct).
- Mobile detail area in claiming phase (loot/equip full-width, contract
  detail not present).

---

## 10. Tutorial / onboarding

**Purpose.** Orient a first-time player without ever occupying board or rail
space that a decision needs.

**Unique decision enabled.** None.

**Keep**
- The existing onboarding copy content (no rewrite of the words themselves
  required by this pass).

**Delete**
- Absolute-positioned tooltip overlapping the board (duplicate of §1's
  delete — called out here too since it's the same defect from the
  onboarding side).

**Rebuild**
- Give onboarding a fixed, dismissible slot in the shell (§1) that never
  overlaps board or rail content, and does not require a click to stop
  blocking the play surface if the player simply starts playing.

**Acceptance checks**
- [ ] Onboarding content never overlaps board or rail content at any
      supported viewport.
- [ ] Interacting with the board/rail (selecting a card, assigning a party)
      dismisses or backgrounds onboarding without requiring its own explicit
      close click first.

**Screenshots required**
- Covered by §1's two required screenshots. No separate capture required.

---

## 11. Explicit non-goals

Do not, in this pass:
- Touch `PixelIcon`, `MotifIcon`, or any file under `src/world/pixel-ui/` or
  `src/world/themes/first-charter/` for icon shape/extraction reasons. That
  system is closed (PR #11).
- Change `useArcWorld`, `useArcInteraction`, contract/challenge schema, or any
  engine type. If a region's rebuild genuinely requires a new field (e.g. the
  §2 escalation signal's cycles-since-available), stop and report the
  specific blocker — do not invent a client-side approximation that isn't
  backed by real engine state.
- Add new resources, new cartridge concepts, or 3D/planet-view work.
- Redesign mobile stacking order independently of desktop (§9 depends on
  §2–§8 being settled first).
- Rewrite onboarding copy content (§10 only relocates it).
- Introduce a new visual language, palette, or component library. Every
  rebuild item above reuses existing components (`PixelContractCard`,
  `PixelRosterCard`, `PixelReadinessRow`, `PixelLootCard`, `MotifIcon`) with
  new layout/staging logic, not new components with new visual rules.

## 12. Acceptance screenshots (consolidated)

The full screenshot set required to close this pass, pulled from each
section above:

1. Desktop shell, onboarding state (§1).
2. Desktop shell, onboarding dismissed/completed (§1).
3. Desktop board, locked→unlocking adjacency visible (§2).
4. Desktop board, escalation signal on an aged contract, or blocker report if
   no engine hook exists (§2).
5. Roster rail, risky contract selected, recommended party expanded vs.
   others collapsed (§3).
6. Roster rail, no contract selected, all collapsed (§3).
7. Roster rail downtime button sourced from a real fix suggestion, paired
   with the fix-plan panel in the same shot (§3/§5).
8. Detail rail, choosing phase only, no outcome/loot present (§4).
9. Encounter: travel phase mid-motion (§6).
10. Encounter: resolve-checks, reliable-projected run (§6).
11. Encounter: resolve-checks, risky/failing-projected run (§6).
12. Encounter: result phase resolving onto the updated board card (§6).
13. Outcome in its new location (banner or history view), detail rail not
    containing it (§7).
14. Loot/equip occupying the full detail rail alone (§8).
15. Detail rail immediately after equip, changed readiness number, paired
    with the PR #11 pre-equip screenshot for before/after (§8).
16. Mobile board, 390px (§9).
17. Mobile roster carousel, contract selected, recommended agents visually
    first (§9).
18. Mobile detail area, claiming phase, loot/equip full-width (§9).

No merge, no "visually accepted" claim, without all 18 present and each
matched against its section's acceptance checks above.
