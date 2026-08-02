# The Burn Protocol through Episode 2, Chapter 1

## Classification

This transaction proves that the existing Rodoh canonical-story receiver can cross from a complete episode into the next episode without a reader replacement. The new authored material is carried entirely by the imported Arc.

The exact authorities are:

```text
Arc
41b745b7865fb704224295db938836f22042eca8

World base
complete Episode 1 receiver
a22557723a0f3050c2feb8a18b8648e028059488
```

The imported cartridge keeps the stable identity:

```text
burn-protocol
```

## Published extent

```text
Episode 1: The Broken Road
E01-C1-P01 through E01-C3-P60

Episode 2: Ghosts of Then
Chapter 1: Reunion
E02-C1-P01 through E02-C1-P20

internal series seam
E01-C3-P60 → E02-C1-P01

next unpublished panel
E02-C2-P21
```

The Arc contains eighty panel slots and sixteen scroll-plate assets. It contains zero choices, challenges, roles, or simulation outcomes.

## Proof of reuse

This branch changes no production reader or runtime file. In particular, it leaves unchanged:

```text
src/world/sequence/SequenceHost.tsx
src/world/sequence/session.ts
src/world/sequence/assets.ts
src/canonical-story/types.ts
src/canonical-story/schema.ts
src/canonical-story/runtime.ts
src/world/WorldHost.tsx
```

The same `SequenceHost` derives the active episode, chapter, panel index, asset ledger, canonical-text boundary, and navigation controls from `axm.canonical-story@1`.

At `E01-C3-P60`, **Next** resolves the present target `E02-C1-P01` and produces a normal canonical transition. The visible episode and chapter identity changes to:

```text
Episode 2: Ghosts of Then
Chapter 1: Reunion
```

At `E02-C1-P01`, **Previous** resolves back to `E01-C3-P60`. At `E02-C1-P20`, **Next** returns an extent-complete record naming `E02-C2-P21` because that target is not yet present.

## Reading-session law

The session remains:

```text
rodoh-canonical-story-session/1
```

It stores only the exact Arc digest and validated cursor. The browser journey enters Reunion, advances to P10, reloads, re-enters the same cartridge, and resumes at P10. No image byte, source record, or simulation state enters the session.

## Source boundary

The Arc carries exact manifest metadata for all twenty Reunion panels and four A02C1 plates. Media remains holder-owned and external. Canonical Episode 2 text and plate mappings remain blocked because these exact bytes are not present in the active repository estate:

```text
source/episodes/episode-02.json
site/data/episode-02.json
manifests/a02c1-lettering.json
manifests/a02c1-scroll-plates.json
```

The receiver therefore continues to display `Canonical text source required`. No derivative summary is presented as Episode 2 dialogue, caption, sound effect, or alt text.

## Acceptance

Desktop and mobile must prove:

```text
visible import of the expanded burn-protocol Arc
80 panel slots and 16 plates reported
E01-C3-P60 → E02-C1-P01
Episode 2 and Reunion identities displayed
20 Reunion panel controls
P01 → P10
reload and exact P10 resume
P10 → P20
P20 → E02-C2-P21 extent completion
P20 → P19 reverse traversal
P01 → E01-C3-P60 reverse series seam
no organization or challenge surfaces
no external request
no horizontal overflow
```

All prior Chapter 1, Chapter 2, and complete Episode 1 journeys rerun against the same receiver to detect compatibility drift.

## Evidence ledger

The evidence tier is source-ledger receiver implementation; the venue is the stacked Episode 2 Chapter 1 branch; the target is production-complete Reunion after exact source intake; the upside is direct proof that the final cartridge grows across episode boundaries by adding Arc data; the downside is that canonical text, plate composition, and final visual standing remain unresolved; the failure mode is a hidden per-episode runtime, cursor loss at the series seam, content bundling, or source reconstruction.

The control question is whether Episode 2, Chapter 2 can now be appended as ordinary chapter data while `SequenceHost` remains unchanged.
