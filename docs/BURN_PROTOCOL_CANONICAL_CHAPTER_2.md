# The Burn Protocol canonical story through Chapter 2

## Classification

This stacked transaction extends the corpus-native Burn cartridge from Episode 1, Chapter 1 into Episode 1, Chapter 2. It uses the same `burn-protocol/1` source plane, the same `axm-canonical-story/1` authority, the same content-addressed Arc, and the same World `SequenceHost`.

It does not create a Chapter 2 cartridge family, translate panels into challenges, found an organization, invent dialogue choices, infer canonical text from summaries, or treat the chapter boundary as an external evidence handoff.

The exact authorities are:

```text
Arc Chapter 1 base
3b07cae5a13553b240a6eb8900e0a3bab3701933

Arc through Chapter 2
f7823774ebc64497974c70ba7b9f04a4f8fe9ba7

World Chapter 1 base
8341294c05727892f47479c07301c27fd2184a6d
```

## Authored extent

```text
Episode 1: The Broken Road

Chapter 1: Impact
E01-C1-P01 through E01-C1-P18
4 scroll-plate assets

Chapter 2: The Black Box
E01-C2-P19 through E01-C2-P38
4 scroll-plate assets

canonical chapter seam
E01-C1-P18 → E01-C2-P19

next unpublished panel
E01-C3-P39
```

The combined source contains 38 ordered panel slots and 8 plate assets. Each panel remains an ordinary record with a stable ID, chapter-local ordinal, prior and next panel IDs, manifested asset path, byte count, SHA-256, canonical text status, and separately classified audit projection.

## Additive source assembly

`appendBurnProtocolChapter` is the reusable source operation. It clones the accepted Burn source, adds one chapter and its new source receipts, updates the explicit production boundary, and revalidates the resulting object through `burn-protocol/1`.

The operation refuses duplicate receipt IDs, duplicate chapter IDs, invalid receipt references, broken panel chains, and schema additions such as invented choices. The accepted Chapter 1 source is not mutated.

The stable source and cartridge ID is now:

```text
burn-protocol
```

The source version records publication extent. Chapter 2 produces version `0.2.0`; later chapters extend the same source ID and runtime.

## Cross-chapter law

Adjacent published chapters must agree in both directions:

```text
Chapter 1 nextPanelId       = Chapter 2 openingPanelId
E01-C2-P19                  = E01-C2-P19

Chapter 2 previousPanelId   = Chapter 1 terminalPanelId
E01-C1-P18                  = E01-C1-P18
```

Advancing from P18 therefore emits an ordinary canonical transition receipt into P19. Retreating from P19 emits the reverse receipt into P18. The reader remains in one Arc-bound session throughout the transition.

Coverage distinguishes an internal chapter link from an unpublished continuation. Since P19 is now present, it no longer appears in `continuationPanelIds`. The only outside target is P39.

## Source custody boundary

The combined source binds the Chapter 2 custody records:

```text
manifests/a01c2-lettering.json
19056 bytes
fe2d36e4d26dee3d0d3b5e1d7f1da2819064e84c8ce0136512ae6a9489ff7e17

manifests/a01c2-scroll-plates.json
1521 bytes
f2ba06488c4db7d21bb2afae2a4a2cbf77ba214c77e56e8f1a698a655bec1855

manifests/a01c2-art-audit.json
34419 bytes
86cbe89f61df90d75b2fcb824e2c24d5281ae28e68e2b87ef2f4f59134684327

manifests/a01c2-art-manifest.csv
3940 bytes
a2d4071e905631b1f6027803ea61ae1dd4760d602bfe775d1606b91fa4281681
```

The exact Episode 1, Chapter 2 lettering, and plate-composition bytes are not present in the repository. All 38 text layers and all 8 plate mappings remain `source-required`. World displays this as a blocking canonical-source notice.

Q01/Q02-derived locations, actors, and concise panel summaries remain `auditProjection` values under `derived-q01-q02`. World labels them `DEVELOPMENT AUDIT PROJECTION · NOT CANONICAL DIALOGUE`. They cannot satisfy or substitute for captions, dialogue, sound effects, or alt text.

All visual assets remain holder-owned external bytes with `q02-review-required` standing. World matches a selected file to one manifested path, verifies byte length and SHA-256, creates a revocable page-session object URL, and stores no image bytes in reading sessions or static output.

## Arc publication receipt

The qualified combined publication is:

```text
cartridge ID
burn-protocol

cartridge digest
cart1_1078b35ca33a45be95062ad417970c05b5e4657b5314ecf497cb429e91e7afbf

Burn source
82201 bytes
8da02bd3cb4a71cc02a9ff13d7b5f9bd88dc06bce10823600e1b327d9ca2d451

compiled Arc
175689 bytes
fea919c5e16590cabafb92ccabd3363b98aea4f4139dac68202178b14a50c1c5

coverage receipt
894 bytes
bc50de733f3b72627dd22f02cef8c9c9d3bca829b8acfdbd0e55b580f19c1289
```

The deterministic workflow built the publication twice, required byte-identical trees, verified the publication SHA-256 ledger, exercised the complete P01-to-P38 path, proved P18-to-P19 and P19-to-P18 transition receipts, and stopped explicitly at P39.

## World reader extension

`SequenceHost` now derives its episode, chapter, panel index, plate boundary, and global position from the Arc source. The sidebar contains chapter controls and only the current chapter’s panel controls. Selecting a chapter moves to that chapter’s explicit opening panel.

The reading state remains:

```text
rodoh-canonical-story-session/1
exact Arc digest
story ID
episode ID
chapter ID
panel ID
```

The Chapter 2 browser transaction is:

```text
import combined Arc
open at P01
traverse P01 through P18
advance P18 → P19
confirm Chapter 2 identity and 20-panel index
advance to P27
reload and resume at P27
advance through P38
receive P39 extent completion
retreat P38 → P37
select Chapter 1 opening
select Chapter 2 opening
retreat P19 → P18
```

No challenge, roster, resource, assignment, outcome, or organization surface is involved.

## Evidence ledger

The evidence tier is source-ledger implementation; the venue is the stacked Chapter 2 Arc and World branches; the target is production-complete Episode 1 through Chapter 2 after exact v0.62.0 intake; the upside is proof that chapters extend one corpus-native Arc as ordinary reusable pieces; the downside is that canonical text, plate mappings, and accepted visual standing remain blocked; the failure mode is a new per-chapter runtime, a second cartridge ontology, a broken seam, inferred expression, or derivative audit material acquiring canonical authority.

The control question is whether Chapter 3 can be appended by the same source operation and immediately become an internal P38-to-P39 transition without changing the source plane, runtime, or reader.
