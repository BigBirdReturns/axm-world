# The Burn Protocol canonical story through Episode 2

## Classification

This transaction receives the continuing `burn-protocol` Arc through Episode 2 and proves that the existing canonical-story reader handles a complete second episode without production modification.

The base receiver authority is:

```text
feature/burn-protocol-canonical-story-chapter-3-v1
a22557723a0f3050c2feb8a18b8648e028059488
```

The Arc authority is supplied by the stacked Episode 2 branch in `BigBirdReturns/axm-arc`.

## Represented series extent

```text
Episode 1: The Broken Road
  Chapter 1: Impact
  Chapter 2: The Black Box
  Chapter 3: A Direction in Time

Episode 2: Ghosts of Then
  Chapter 1: Reunion
  Chapter 2: Earth and Titan
  Chapter 3: Discovery's Echo
```

The fixed sequence contains:

```text
120 panel slots
6 chapters
2 complete episodes
23 exact plate rows of 24 expected
0 choices
0 challenges
0 roles
```

The canonical seams are:

```text
E01-C3-P60 → E02-C1-P01
E02-C1-P20 → E02-C2-P21
E02-C2-P40 → E02-C3-P41
```

The represented extent ends at `E02-C3-P60` and declares `E03-C1-P01` as the next canonical panel outside the current Arc.

## Proof of reader reuse

This branch does not change:

```text
src/world/sequence/SequenceHost.tsx
src/world/sequence/session.ts
src/world/sequence/assets.ts
src/canonical-story/types.ts
src/canonical-story/schema.ts
src/canonical-story/runtime.ts
src/world/WorldHost.tsx
```

The same reader derives the current episode, chapter, panel index, global panel position, plate boundary, and navigation controls from `axm.canonical-story@1`. The same reading session remains bound to the exact Arc digest. The same holder-controlled verifier keeps media bytes outside storage and static output.

## Browser transaction

Desktop and mobile must execute:

```text
import the through-Episode-2 Arc
open E01-C1-P01
traverse all sixty Episode 1 panels
cross E01-C3-P60 → E02-C1-P01
confirm Episode 2 and Reunion
cross E02-C1-P20 → E02-C2-P21
confirm Earth and Titan
cross E02-C2-P40 → E02-C3-P41
confirm Discovery's Echo
reload at E02-C3-P49
resume at the exact panel under the same Arc digest
reach E02-C3-P60
receive E03-C1-P01 as the outside continuation
reverse every episode and chapter seam
```

The product must also retain the accepted Episode 1, Chapter 2, and Chapter 1 compatibility journeys.

## Source and asset boundary

All 120 panel positions remain canonical sequence records. Exact captions, dialogue, sound effects, alt text, and plate mappings remain source-required because the underlying episode, lettering, and plate-composition bytes are unavailable.

The Episode 2 ledger contains exact custody for all sixty panel rasters and eleven plate rasters. The path and byte count for `A02C3-plate-04` are known, but the active evidence did not expose its exact SHA-256 row. The Arc therefore records the gap and World does not display, verify, or invent that asset.

## Acceptance boundary

The evidence tier is source-ledger receiver implementation; the venue is the stacked Arc and World Episode 2 branches; the target is production-complete Episodes 1 and 2 after exact source intake; the upside is proof that series growth occurs as Arc data rather than reader replacement; the downside is unresolved canonical expression and one unresolved plate receipt; the failure mode is cursor loss at the episode seam, a hidden simulation surface, static content bundling, or fabricated custody.

The control question is whether the complete 120-panel cartridge can traverse and resume across the episode boundary while the production reader remains byte-identical to its Episode 1 authority.
