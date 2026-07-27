# UNDERDRAIN standalone demo playtest receipt

**Format:** `rodoh-underdrain-playtest-report/1`  
**Demo:** `underdrain-draft@1`  
**Authority boundary:** browser result remains provisional; exact Arc replay is required.

## Cold-walk result

The demo opens directly into the premise, the playable character, the hidden cause, the A-plot/B-plot collision, and three character-method choices. A new player can inspect the seven-beat authoring rail before starting. Starting the action requires one strategy selection and one button.

## Deterministic action sweep

- Runs: **9**
- Successes: **8**
- Partial outcomes: **1**
- Failures: **0**
- Median completion: **696 ticks / 23.2 seconds**
- Mean completion: **734.7 ticks / 24.5 seconds**
- Mean damage taken: **108.2**
- Strategies covered: emergency plan, old service tunnel, truce offer
- Seeds covered: 1337, 2026, 4242

## Iteration performed

The first sweep produced five successes and four partials. The old-service-tunnel method was materially over-punished and one emergency-plan seed dropped the bot at the boss. The balance pass changed only presentation-side demo tuning:

- emergency-plan health: 120 → 140;
- service-tunnel health: 100 → 125;
- service-tunnel spawn multiplier: 1.18 → 1.10;
- service-tunnel boss bonus health: 95 → 60.

The second sweep produced eight successes, one partial, and zero failures. The risky service-tunnel method still retains a bounded partial outcome, so the choices are not cosmetic.

## Adversarial and accessibility checks

- no external scripts, styles, fonts, images, API calls, or service worker;
- no `Math.random`, dynamic evaluation, or network runtime;
- one fixed 30 Hz state transition for human and automated input;
- keyboard, pointer, and touch controls;
- reduced-motion treatment;
- responsive briefing, rail, action, and receipt surfaces;
- provisional receipt states `authority: Arc replay required`;
- provisional receipt states `campaignEffect: null`;
- action trace, terminal state, and receipt identities are generated at completion;
- receipt export is disabled until a terminal state exists.

## Narrative rail acceptance

The episode keeps stable character methods, makes the B-plot causally alter the boss fight, reveals a legible cause for the fungus mobilization, and writes an inherited civic obligation rather than resetting the town after victory.

## Boundary

This receipt proves a deterministic offline browser demo and a bounded automated playability sweep. It does not claim that every player will prefer the combat timing, comedy, or visual style.
