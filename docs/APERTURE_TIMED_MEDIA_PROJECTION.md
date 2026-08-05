# Aperture timed-media projection

World projects `axm-canonical-story-timed-media/1` only after the canonical story and its independent story digest have been validated through the landed Arc authority. The projection is a removable presentation surface inside the existing fixed-path reader. It does not create a second story runtime, a new cursor, or a new persistence format.

## Authority boundary

Arc owns the canonical positions, facts, causal edges, reveals, and reviewed source receipts. World owns only their presentation at the current canonical reader panel. AXM Aperture remains responsible for provider-edition binding, provider-to-canonical time maps, personal exposure and knowledge ledgers, segment selection, observation verification, and playback actuation. Genesis retains sealing authority and Core retains rebuildable query services.

The provider authorities consumed by this programme are landed at:

```text
Genesis RFC 0009       e81314378eb31aa6a9c8efcc05b533c799709e30
Arc timed media        c8b78629217b9ba7237c1ecfff47cdc0e28cbf69
Core query runtime     bcc70fa469f43b12adb9a18d395d434fcb794e1a
```

The timed-media authority record must state:

```text
narrative        arc
providerClock    none
viewerState      none
playbackControl  none
```

World derives the expected story SHA-256 with `canonicalStoryDigest(story)`. It never accepts the digest declared inside the timed-media extension as its own independent expectation. The digest covers the validated canonical-story object only, so adding, removing, or replacing a sibling extension cannot circularly redefine the story identity that timed media must name.

## Projection mechanism

`projectApertureAtPanel(timedMedia, panelId)` selects only canonical positions whose authored `panelIds` contain the current reader panel. A fact appears only when an authored reveal at one of those exact positions names it. A causal edge appears only when both endpoint facts are already present in that explicit reveal set. Source receipts are closed over the displayed positions, reveals, facts, and causal edges.

The projection takes no cursor history and produces no viewer state. Moving backward and forward through the reader recomputes the current projection from the current panel. Reload uses the existing `rodoh-canonical-story-session/1` cursor bound to the exact authored Arc digest. No timed-media state is stored, exported, or admitted into simulation state.

An unmapped panel renders no projection. A mapped position with no reveal may display its reviewed position identity and interval, but World does not infer that any fact has been exposed or learned. An unrevealed fact cannot become visible by traversing a causal edge from a displayed fact.

## Refusal

World refuses the timed-media extension before rendering when the story ID or digest changes, an interval overlaps or reverses, a panel belongs to another chapter, a source is not reviewed, a receipt or fact reference is unknown, a causal edge refers to an absent endpoint or itself, a reveal points to an unknown position, an unknown field is present, or Arc claims provider, viewer, or playback authority.

A timed-media extension without `axm-canonical-story/1` is an orphan authority and must be refused rather than sent through simulation dispatch. When the extension is absent, the existing canonical-story and simulation paths remain unchanged.

## Evidence standing

The holder-controlled AXM Aperture programme has separately qualified local gates `[G0, G1, G2]` under tag `g2-exact-oracle-qualified-local-v2`, as recorded in `BigBirdReturns/axm-core#30`. That result does not create a hosted Aperture repository or grant World any Aperture gate authority. `BigBirdReturns/axm-aperture` remains absent, hosted repository acceptance remains false, and G3 through G9 remain unexecuted.

This receiver proves only that World can render the landed Arc interface while preserving the existing canonical reader and refusal law. It does not verify an active provider edition, map a provider clock, infer exposure or knowledge, choose a segment, issue a player command, seal a package, or promote the holder-controlled local result into hosted acceptance.

The control question is whether every visible statement can be traced to an exact Arc record at the current panel while World remains mechanically incapable of naming a provider edition, assigning viewer knowledge, or creating a seek command.
