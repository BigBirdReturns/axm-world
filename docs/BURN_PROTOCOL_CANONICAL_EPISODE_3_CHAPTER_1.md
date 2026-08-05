# The Burn Protocol through Episode 3, Chapter 1

## Classification

This transaction receives the Arc publication through Episode 3, Chapter 1 and proves that the existing canonical-story reader continues across a third episode without production modification.

The source extent is:

```text
Episode 1: The Broken Road
  Chapter 1: Impact
  Chapter 2: The Black Box
  Chapter 3: A Direction in Time

Episode 2: Ghosts of Then
  Chapter 1: Reunion
  Chapter 2: Earth and Titan
  Chapter 3: Discovery's Echo

Episode 3: The Omega Thread
  Chapter 1: Headquarters
```

The active path contains 140 ordered panel slots. The new seam is:

```text
E02-C3-P60 → E03-C1-P01
```

The current outside continuation is:

```text
E03-C1-P20 → E03-C2-P21
```

## Runtime reuse

The World production runtime is unchanged. This branch does not modify:

```text
src/world/sequence/SequenceHost.tsx
src/world/sequence/session.ts
src/world/sequence/assets.ts
src/world/WorldHost.tsx
src/canonical-story/types.ts
src/canonical-story/schema.ts
src/canonical-story/runtime.ts
src/canonical-story/index.ts
```

The imported Arc supplies the third episode and its first chapter. `SequenceHost` derives the current episode, chapter, chapter index, panel index, global position, asset ledger, and continuation from `axm.canonical-story@1`.

No World condition names Episode 3, Headquarters, A03C1, or the E02-to-E03 seam.

## Reader behavior

The holder imports the same stable cartridge identity:

```text
burn-protocol
```

The fixed reader can:

```text
open at E01-C1-P01
navigate to Episode 2
cross E02-C3-P60 into E03-C1-P01
show one published Episode 3 chapter
traverse E03-C1-P01 through E03-C1-P20
resume an exact Episode 3 cursor after reload
report E03-C2-P21 as the next unpublished panel
retreat from E03-C1-P01 to E02-C3-P60
```

The reader still has no organization, roster, assignment, resource, challenge, success, partial, failure, or choice surface.

## Asset custody

The Arc carries exact v0.62 manifest rows for all twenty A03C1 panel assets and four A03C1 plate assets. World contains no Burn media bytes or Burn asset paths in its static product.

The holder may select local files. The generic verifier matches a selected path to one Arc asset record, compares byte length and SHA-256, and creates a page-session object URL only for an exact match. Reload or release removes that URL.

The continuing Arc also recovers the previously omitted `A02C3-plate-04` asset from the exact v0.62 manifest row. The reader therefore sees four indexed plates in Episode 2, Chapter 3 when the new Arc is loaded.

## Source boundary

The exact Episode 3 source receipt is present in Arc metadata, while its bytes are not available in this repository. The exact compiled-reader receipt for `site/data/episode-03.json` is not established by the active evidence and is not invented.

All Episode 3 canonical text remains `source-required`. A03C1 plate ranges also remain `source-required`. The reader displays the canonical source block and does not substitute summaries, inferred dialogue, or inferred plate order.

## Qualification

The dedicated workflow must:

```text
check out the exact Arc authority
compare the vendored generic canonical-story authority byte for byte
rebuild all prior compatibility publications
rebuild the Episode 3 Chapter 1 publication
verify every publication SHA-256 ledger
run focused and complete World tests
build the ordinary static product
prove no Burn token entered static output
rerun accepted Episode 1 and Episode 2 journeys
run desktop and mobile Headquarters journeys
prove the E02-to-E03 seam in both directions
prove exact resume at E03-C1-P12
prove the E03-C2-P21 extent boundary
prove no external request or horizontal overflow
```

## Evidence ledger

The evidence tier is source-ledger receiver implementation; the venue is the Episode 3 Chapter 1 World branch; the target is production-complete Headquarters after exact source intake; the upside is a third episode admitted without changing the reader; the downside is that canonical text and plate composition remain blocked; the failure mode is reader drift, seam loss, source invention, media persistence, or static bundling.

The control question is whether Episode 3, Chapter 2 can be appended as ordinary Arc data while this World production diff remains unchanged.
