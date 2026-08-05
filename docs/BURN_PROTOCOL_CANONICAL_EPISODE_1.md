# The Burn Protocol canonical Episode 1 receiver

## Classification

This transaction completes Episode 1 inside the same corpus-native Arc and World architecture established by Chapters 1 and 2. Chapter 3 adds canonical panel and plate records to the imported Arc. It does not add a second reader, a chapter-specific runtime, a simulation translation, or an inferred dialogue layer.

The stacked authorities are:

```text
Arc Chapter 2 base
f7823774ebc64497974c70ba7b9f04a4f8fe9ba7

World Chapter 2 base
3f5ca3cfa16354fd2a973fd2f90d166f3a6b22ce
```

The complete extent is:

```text
Episode 1: The Broken Road

Chapter 1: Impact
E01-C1-P01 through E01-C1-P18

Chapter 2: The Black Box
E01-C2-P19 through E01-C2-P38

Chapter 3: A Direction in Time
E01-C3-P39 through E01-C3-P60

next canonical series panel
E02-C1-P01
```

## Runtime authority

World still dispatches on the same `axm.canonical-story@1` extension before organization founding. `SequenceHost` remains the only canonical-story runtime and receives the same generic `CanonicalStorySource` shape.

The Chapter 3 transaction deliberately changes no `SequenceHost`, session, asset-verification, canonical-story schema, or canonical-story runtime source file in World. Its player-visible expansion is caused by the larger imported Arc.

The runtime derives:

```text
current episode
current chapter
current panel
chapter-local panel position
global panel position
chapter controls
panel controls
plate custody boundary
external continuation
```

from the Arc source rather than from Burn-specific conditionals.

## Fixed path

The accepted Episode 1 path is:

```text
P01 → ... → P18
P18 → P19
P19 → ... → P38
P38 → P39
P39 → ... → P60
P60 → extent complete, continuation E02-C1-P01
```

Both internal seams are ordinary canonical transitions. They issue the same deterministic transition receipts as adjacent panels inside one chapter. P60 remains the Episode 1 terminal panel and the next action exposes, but does not fabricate, the first panel of Episode 2.

The reverse path is also explicit:

```text
P39 → P38
P19 → P18
```

## Source and asset boundary

The imported Arc contains exact manifested path, byte count, and SHA-256 records for sixty panels and twelve scroll plates. The media bytes remain holder-owned and external to World. Files are displayed only after exact path, size, and SHA-256 verification, and their object URLs remain page-session-only.

The exact Episode 1 source, compiled reader source, A01C1/A01C2/A01C3 lettering manifests, and all three scroll-plate maps remain unavailable. Consequently:

```text
resolved canonical text panels      0
source-required text panels         60
resolved plate mappings             0
source-required plate mappings      12
production ready                    false
```

World displays the source-required boundary rather than reconstructing captions, dialogue, sound effects, alt text, or plate ranges. Q01/Q02-derived summaries remain under the visible label:

```text
DEVELOPMENT AUDIT PROJECTION · NOT CANONICAL DIALOGUE
```

## Session law

The reading session remains `rodoh-canonical-story-session/1`. It stores only:

```text
exact authored Arc digest
story identity
episode identity
chapter identity
panel identity
```

The completed Episode 1 Arc has a new digest because its authored source now includes Chapter 3. A session from the Chapter 2 extent cannot silently attach to the completed Episode 1 revision. Opening the new exact digest starts at P01 unless that exact revision already has a valid held cursor.

No image bytes, object URLs, canonical text, audit projection, or simulation state enter the session.

## Qualification

The dedicated workflow must rebuild the exact Arc publication from the pinned Arc head, verify the publication SHA-256 ledger, byte-compare the vendored generic canonical-story authority, run strict TypeScript and focused contracts, run the complete World regression and production build, and prove that no Burn panel path or identity enters static World output.

Desktop and mobile each traverse all sixty panels, including both chapter seams, reload at P49 and resume under the exact digest, reach P60, expose E02-C1-P01 as the external continuation, reverse to P59, and navigate all three chapter indexes.

The accepted product must contain no organization, challenge, roster, assignment, resource, success, partial, failure, or choice surface.

## Evidence ledger

The evidence tier is source-ledger receiver implementation; the venue is the Episode 1 World branch and its pinned Arc authority; the target is production-complete Episode 1 after exact source intake; the upside is proof that the first complete episode is assembled from one stable set of reusable pieces; the downside is that canonical text, plate composition, and final visual standing remain blocked; the failure mode is runtime drift, seam failure, source reconstruction, media persistence, static bundling, or derivative expression acquiring canonical authority.

The control question is whether Episode 2 can be added as another ordinary episode while this reader remains unchanged.
