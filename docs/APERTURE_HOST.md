# ApertureHost

`ApertureHost` is World’s read-only fixed-story receiver for a validated AXM Aperture daemon projection. It lives inside the existing canonical-story reader. It does not replace `SequenceHost`, create a second cursor, connect to the daemon, query the planner, select media, or control a player.

This transaction implements AP-400. It is a World consumer boundary and does not accept G3. The holder-controlled AXM Aperture programme has qualified local gates G0 through G2 under `g2-exact-oracle-qualified-local-v2`, but `BigBirdReturns/axm-aperture` does not exist, hosted repository acceptance is false, publication remains `local_candidate_unpushed`, and G3 through G9 remain unexecuted.

## Authorities

The receiver consumes these landed provider interfaces:

```text
Genesis RFC 0009       e81314378eb31aa6a9c8efcc05b533c799709e30
Arc timed media        c8b78629217b9ba7237c1ecfff47cdc0e28cbf69
Core query runtime     bcc70fa469f43b12adb9a18d395d434fcb794e1a
World timed projection 6cc78ea50a4db8789bdc4166c27a4cfee1613084
```

The World projection contract was derived from the frozen holder-controlled G2 source identified in Core issue #30. Its relevant source inputs have these SHA-256 identities:

```text
playback-anchor.schema.json  602e3f344ed3766f18a300697ebf10d914a15be6fd6f6f0a450a1e63f6488890
answer-plan.schema.json      7c78833a6c686e85ba4734e9bcaf512ee67d99ca8c4061ee3ccc0a82d58e90b4
answer-receipt.schema.json   8f454128a86642e148458844d304c83712af4f32181af7a22f783face2664774
selection-receipt.schema     1ef69980402ce120392644a5266b85de0eda15e4d119ee49b07be1ab957af69d
Aperture API policy          bc52ce6faa3383340ee6e5ba19147ac6417225e351530a5336c4d6b4fe8130c0
program issue ledger         a05819ae3f2b9644cd44e56cfe0013bca7caa344250237a3529964d2fd31fcbd
```

Those inputs remain daemon and programme authority. World does not vendor their schemas or Python implementation. `axm-aperture-world-projection/1` is a closed, body-minimized presentation projection. It carries source formats, source authority labels, IDs, digests, counts, time coordinates, reason codes, and explicit degradation state. It carries no answer text, fact proposition, exposure event, knowledge event, command payload, or mutable daemon state.

## Composition

`WorldHost` continues to validate `axm-canonical-story/1` and the landed Arc timed-media extension before selecting `SequenceHost`. The optional `apertureDaemonProjection` prop is passed through the fixed reader. When no external projection is supplied, the reader still renders Arc-reviewed story context and an explicit `unavailable` daemon state.

`SequenceHost` remains the only owner of the canonical panel cursor and `rodoh-canonical-story-session/1`. It renders the existing Arc-reviewed `ApertureProjection`, then mounts `ApertureHost` beside that position. Removing the new host does not change the story, timed-media object, reader cursor, asset verification, or reader-session bytes.

The existing `RodohAperture` component under the same directory remains a simulation visualization for Arc campaigns. Its source, state, URL grammar, and receipts are not used by `ApertureHost`.

## Projection law

A projection has format `axm-aperture-world-projection/1` and authority `external_daemon_projection_only`. The root is closed against unknown fields. It names:

- Explicit daemon state: `ready`, `unavailable`, `partial`, `stale`, `ambiguous`, `conflict`, `refused`, or `unsupported`.
- Exact canonical-story ID and independently derived digest when scoped.
- Exact story-package ID and digest.
- Exact viewer-profile ID and digest.
- Work and optional continuity IDs.
- An optional playback-anchor coordinate, preserving the source format and `resolved_playback_state_only` authority.
- An optional answer coordinate, preserving answer-plan and answer-receipt identities, digests, fact counts, and knowledge-event count without bodies.
- An optional selection coordinate, preserving the selection receipt, same-work proof, selected candidate, canonical interval, and reason codes without actuation.
- Body-minimized access-receipt identities, state codes, observation time, and the external projection digest.

World verifies the projection against the independently derived canonical-story digest and the already verified timed-media story digest. A ready state requires complete package, viewer, work, and canonical-story identity plus a resolved anchor with a canonical position. Answer and selection coordinates must agree with the projection package and work. Non-same-work selection is refused. A stale answer may identify an older anchor only when the root state is explicitly `stale`, and the UI retains that warning.

Unavailable and unsupported states must be empty of package, viewer, anchor, answer, and selection authority. Partial, stale, ambiguous, conflict, and refused states require complete scope identity and render distinct accessible labels. Manual, acoustic, predicted, and non-verified anchor evidence remains visibly qualified. World never upgrades it to exactness.

## Session law

`rodoh-aperture-host-session/1` stores one local presentation field: `activeSurface`. The permitted values are `position`, `answer`, `selection`, and `provenance`. The key and value are both scoped by the exact story-package digest and viewer-profile digest:

```text
axm-world:aperture-host:v1:<story-package-sha256>:<viewer-profile-sha256>
```

The record is closed against unknown fields. It contains no story ID, panel cursor, anchor ID, provider coordinate, answer content, fact, ledger event, command, or result. A changed package or viewer selects a different key. Invalid JSON, an unknown field, a scope mismatch, or a selected surface that is no longer present resets visibly to the first available surface. Resetting the local presentation session does not mutate or replay a daemon event.

The existing canonical-story reader session remains separately bound to the exact authored Arc digest. AP-400 does not alter that key, record, or restoration behavior.

## Explicit non-capabilities

AP-400 has no loopback HTTP client, WebSocket, native messaging, MCP tool, query form, answer renderer, selection scheduler, offline replay, or actuation path. It cannot call `health`, `current_anchor`, `query`, `select`, `export`, or `actuate`. Later programme transactions own those surfaces.

The host cannot:

- Infer knowledge from reader history.
- Treat exposure as comprehension.
- Add prose or facts to an answer plan.
- Choose a segment.
- Seek, play, pause, stop, or change rate.
- Correct a package, anchor, exposure event, knowledge event, answer receipt, or selection receipt.
- Promote local G2 qualification into hosted acceptance.

## Qualification

Focused qualification covers strict projection admission, all eight daemon states, digest substitution, authority upgrade, cross-work selection, stale answer binding, session isolation, stale-session reset, server-rendered host composition, unchanged reader restoration, and the absence of command surfaces. The complete World suite, production build, browser support, clean-room, supply-chain, bundled parity, and Windows local-estate replication remain required on the exact candidate head.

The control question is whether World can display exact daemon coordinates and local presentation preference while remaining unable to create or modify every underlying story, viewer, answer, selection, and playback record.
