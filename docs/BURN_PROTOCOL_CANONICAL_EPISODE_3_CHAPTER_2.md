# The Burn Protocol through Episode 3, Chapter 2 — World receiver

## Classification

This receiver admits the same `burn-protocol` cartridge through Episode 3, Chapter 2, `Lockout`, and continues the corpus-native fixed reader from `E03-C1-P20` to `E03-C2-P21`.

The exact Arc authority is:

```text
BigBirdReturns/axm-arc
feature/burn-protocol-canonical-story-episode-3-chapter-2-v1
f2243c479b8b84448acc9137eb6ea90036385a99
```

That Arc head passed the permanent test and supply-chain workflows plus the dedicated through-Episode-3-Chapter-2 qualification. The retained Arc qualification ZIP has GitHub artifact digest:

```text
sha256:51d2bd2806820d83c5a626bfc3f72702ef9b7bb7e2b1f40c7277af4c2a282482
```

The exact Arc publication identifies as:

```text
cartridge ID      burn-protocol
cartridge version 0.6.0
cartridge digest  cart1_0dbce10b76645cefcb8d2b1195b98557545a32e1ccbc698a1f13626d28d3543b
```

The received extent is:

```text
Episode 1: The Broken Road                         60 panels
Episode 2: Ghosts of Then                          60 panels
Episode 3: The Omega Thread
  Chapter 1: Headquarters                          20 panels
  Chapter 2: Lockout                               20 panels

E02-C3-P60 → E03-C1-P01
E03-C1-P20 → E03-C2-P21
E03-C2-P40 → E03-C3-P41 outside continuation

3 episodes
8 chapters
160 ordered panel positions
32 plate assets
0 choices
0 challenges
0 roles
```

## Generic receiver amendment

World retains one canonical-story reader and one digest-bound reading-session format. The receiver amendment is generic to `axm-canonical-story/1`; it does not introduce a Burn, episode, chapter, or panel-specific dispatch path.

The canonical asset reference is now an explicit union:

- a manifested asset carries exact byte count and SHA-256 custody;
- a source-required asset carries only its stable identity, expected path, optional expected byte count, named source receipts, and refusal reason.

The source-required interface keeps `bytes` and `sha256` addressable only as optional `never` fields. Existing union consumers can therefore narrow or read compatibly, while no source-required record can carry manifested custody.

`SequenceHost` displays a blocking exact-receipt notice for a source-required asset. The holder-file verifier refuses that asset before byte counting or hashing, creates no object URL, and clears any prior verified media session. Canonical-story coverage remains non-production-ready while any source-required asset exists.

## Honest P31 custody

Nineteen `A03C2` panel assets and all four `A03C2` plate assets carry exact manifested custody. `E03-C2-P31` is represented at its canonical position with:

```text
path           site/assets/art/A03C2/panels/E03-C2-P31.webp
expected bytes 156208
required source receipt a03c2-art-manifest
SHA-256        absent
status         source-required
```

World must not accept holder bytes for P31, even when the selected file name and byte count match. It must not infer a digest, show a media placeholder that implies manifested custody, or silently omit the panel.

## Fixed-path execution

The unchanged canonical transition mechanism must prove:

```text
E03-C1-P20 → E03-C2-P21
E03-C2-P21 → E03-C1-P20
P21 through P40 remain ordinary ordered positions
P31 remains navigable and resumable
P40 → E03-C3-P41 reports extent completion without moving the cursor
```

Desktop and mobile acceptance also retain every prior Burn journey, verify that no simulation surface appears, make no external request, and preserve a layout without horizontal overflow.

## Qualification contract

The dedicated receiver workflow pins Arc commit `f2243c479b8b84448acc9137eb6ea90036385a99`, byte-compares all vendored canonical-story authority files, rebuilds every prior Burn publication plus the Chapter 2 publication, and verifies every publication SHA-256 ledger before running World.

It must then pass:

```text
strict TypeScript
focused canonical-story receiver contracts
complete World regression
ordinary production build
static no-Burn-bundling scan
all prior Burn desktop and mobile journeys
Episode 3 Lockout desktop and mobile journey
```

The evidence boundary remains source-ledger receiver implementation. Canonical text, plate composition, final visual acceptance, and the exact P31 digest remain blocked on source intake. The next admissible Arc amendment begins at `E03-C3-P41`, `Prime Incident`.
