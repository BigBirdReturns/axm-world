# ADR 0002 — Platform constitution: the durable choices

- **Status:** Accepted
- **Date:** 2026-07-06
- **Scope:** Constitutional. These are the choices that make RODOH/AXM-WORLD a
  platform creators can trust rather than a platform that taxes them. They are
  cheap to keep now and ruinous to un-make later, so they are written down here
  and enforced by guard tests (`tests/world/constitution.test.ts`) where an
  article is mechanically testable.

## Control question

> When this project succeeds enough to be tempted — by growth, monetization, or
> control — which choices must survive the temptation?

## Context

The console history lesson, read precisely: Nintendo's cartridge was not the
mistake — the mistake was that the cartridge was a **control instrument** (the
platform manufactured it, taxed it, rationed it, and stamped a "Seal of Quality"
that was really a permission gate). Sony won the generation by inverting every
one of those choices for creators.

RODOH's cartridge is already the inversion: an **ownership instrument**. The boot
surface says it in so many words — *"the cartridge stays yours."* This ADR locks
the inversion in before any pressure exists to un-make it. Fun is the mission;
these articles are what keep the fun honest: worlds with consequence and memory,
not permission and rent.

## Decision — the six articles

### Article 1 — The cartridge belongs to its holder, not the platform

Playing a cartridge you hold must never require a server, an account, or the
platform's permission. There is no revocation path. Saves are local-first; the
run exports as a custody object the player keeps.

- **Already true:** zero network calls anywhere in runtime code; localStorage
  persistence; `Export Run` custody file.
- **Enforced by:** the zero-network guard in `constitution.test.ts` (scans all
  runtime source for network primitives); `save.test.ts` (local round-trip).
- **Never:** phone-home requirements, online-only checks, remote kill switches.

### Article 2 — Identity is computed, not claimed; trust is a layer, never a gate

A cartridge's identity is its computed authored digest (`cartridgeIdentity`),
not a manifest claim and not a platform blessing. Trust states
(`bundled` / `verified` / `imported-unsigned` / `quarantined`) are worn
transparently — an unsigned cartridge always boots; it simply shows its
provenance.

- **Already true:** digest law vendored from axm-arc with golden checks;
  imported-unsigned cartridges validate, bootstrap, and compile to a playable
  scene (`cartridge-bay.test.ts`).
- **Enforced by:** `cartridge-digest.test.ts`, `bundled-digests.test.ts`, the
  unsigned-boots guard in `constitution.test.ts`.
- **Never:** a permission gate dressed as a quality seal; publish approval as a
  precondition of booting.

### Article 3 — Memory belongs to the run

The ledger and its structured consequence records live with the player, export
with the run, and verify against the program identity. The platform never holds
a player's history hostage, and old records degrade honestly rather than being
discarded.

- **Already true:** digest-stamped ledger entries; consequence records (#69);
  ledger travels in the custody export (v2); load-time backfill instead of
  save-wipes (`SAVE_SCHEMA_VERSION` stayed 1).
- **Enforced by:** `ledger.test.ts`, `save.test.ts` (backfill round-trip),
  `consequence-schema.test.ts` (migrated, not discarded).
- **Never:** history behind an account wall; schema bumps that orphan old runs.

### Article 4 — The dev kit is free and the dev kit is the product

Authoring a cartridge must be as easy as playing one: validation, digest
tooling, and the UI kit are local and free. No per-title tax, no title
rationing, no exclusive-manufacturing chokepoint.

- **Already true:** `parseCartridge`/`validateArc` run locally; import accepts
  any well-formed cartridge; the pixel-ui kit ships in-repo (`/rodoh/ui-kit`).
- **Next:** the creator-packaging lane (author → validate → digest → export
  `.cart`) closes the round trip.
- **Never:** licensing fees as a boot precondition; platform-only authoring.

### Article 5 — Old cartridges always boot

Backward compatibility is constitutional, not best-effort. Engine and ledger
schema changes migrate forward; a cartridge or save that was ever valid keeps
working, or degrades honestly with its facts intact.

- **Already true:** engine save migrations (`engine/save.ts` MIGRATIONS),
  ledger backfill (#69), version lockstep enforced by test.
- **Enforced by:** `tests/engine/save.test.ts`, `consequence-schema.test.ts`
  (lockstep + migrate-don't-discard).
- **Never:** breaking the library to re-sell it.

### Article 6 — The runtime may not claim what it cannot prove

Every fact on screen is backed by engine state or a stored record: no invented
rewards, no aspirational unlocks, no prose stored as primary truth, no grades
the resolver didn't produce, no timestamps the schema doesn't hold. This is the
platform's actual seal of quality — records that can be checked.

- **Already true:** the #65–#73 arc; unclaimable loot and aspirational unlocks
  are explicitly refused (`consequence.test.ts`); prose is generated from
  structured facts, never stored.
- **Enforced by:** `consequence.test.ts`, `result-ledger-v2.test.ts`,
  `recorded-wording.test.ts`, `hall-memory.test.ts`.
- **Never:** UI that lies a little for excitement; "sealed"/"signed" language
  without a real primitive underneath (see the #66 correction).

## Consequences

- Growth features (accounts, sync, storefront, workshop) may be **added around**
  these articles, never **through** them: cloud saves may mirror local saves but
  not replace them; a store may distribute cartridges but not gate booting.
- Any PR that weakens an article must amend this ADR explicitly — a deliberate
  constitutional amendment, not a side effect.
- The guard tests are the constitution's teeth. Deleting a guard is amending
  the constitution.
