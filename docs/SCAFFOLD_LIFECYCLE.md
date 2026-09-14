# Scaffold circulation

Probes may discover invariants; production may depend only on promoted pillars.
The authority and sequencing remain in `VISION.md`, `CLAUDE.md` and ADR 0002.
This lifecycle protects The First Charter's complete player loop; it does not
authorize deleting historical work or changing vendored Arc.

| Stage | Exit evidence |
| --- | --- |
| **Probe** | A bounded question, owner, reproducible local fixture and observed invariant; code stays under a `demos`, `labs` or `experiments` directory. |
| **Extract** | Name the reusable contract, its inputs/outputs and owner; separate authored content and presentation from engine law. No production import from the probe. |
| **Formalize** | A production-owned module with a documented API, invariant tests, negative cases and deterministic fixtures. Shared engine law is proposed in Arc, never patched into its World vendor copy. |
| **Shadow** | Replay identical fixtures through old and candidate paths offline; record differences and resolution. Candidate output has no save, ledger or custody authority. |
| **Promote** | Accept the criteria below in a reviewed change; production composition consumes the contract or capability with an honest neutral fallback. |
| **Drain** | Move consumers to the promoted module; inventory remaining imports, routes, commands, fixtures and historical references. Retain reproducible evidence and a rollback route. |
| **Excise** | Obtain explicit deletion authority and satisfy deletion criteria below; remove the drained implementation and its now-stale guard exception together. |

Promotion requires an identified maintainer, stable API and failure behavior;
matching shadow receipts (or reviewed, intentional differences); independent
tests using both the reference cartridge and an unbundled/unknown identity;
offline boot, determinism, save migration, changed-run custody and ledger
compatibility preserved; and green circulation tests, typecheck, tests, build
and verified engine drift. A drift soft-skip is unavailable evidence, not parity.
No cartridge-id dispatch is introduced as a substitute for an authored capability.
Promotion is a reviewed module/API decision, not renaming a demo folder.

Deletion requires zero production and tool consumers, migrated entry points,
retained fixtures/receipts/provenance, a replacement that passes the promotion
bar, and a recoverable historical commit. No valid old cartridge or carried run
may lose its boot/resume path. The owner records the inventory and deletion
authorization in the change. Historical scaffolds remain until these criteria
are met; this lane deletes none.

## Machine boundary

`npm run scaffold:check` runs Node built-in tests and the offline guard;
`npm run check` runs it before the existing engine/typecheck/test gates. No new
packages, runtime imports, network requests or services are added.

`scripts/scaffold-policy.json` is the reviewable scope and exception ledger:

- All TS/JS/CSS under `src` is production unless a path segment is an explicitly
  named probe segment (singular spellings are included). Every production file
  is scanned, so a barrel does not hide a probe dependency. Probe-to-pillar and
  probe-to-probe imports remain legal.
- Scaffold path literals are prohibited, intentionally more conservative than
  imports alone. This covers re-exports, import types, static/dynamic imports,
  require, URLs and quoted CSS imports. Computed module loads and code imports
  escaping production roots fail. Introducing TypeScript paths/baseUrl/extends,
  Vite aliases or package imports fails until resolution support is implemented.
- Composition is all World, game, spoke and play-pipeline JS/TS, including new
  files. Identity comparisons, switches, membership checks, simple local aliases,
  identity-keyed lookups and concrete-id dispatch tables are rejected. Authored
  capability/grammar dispatch remains legal. Arc's vendored source is only read,
  never rewritten or subjected to World's composition rule.
- The guard is a conservative lexical policy, not a full JS evaluator or a
  security sandbox. Comments are ignored and escaped literals decoded. It does
  not prove arbitrary data flow, generated code or custom resolver behavior.
  New syntax/resolvers and newly bundled ids require policy and negative-fixture
  review; do not encode identity dispatch to evade the recognized forms.

Each exception identifies one exact file and rule, a newline-normalized SHA-256,
maintainer role, reason and removal condition. There are no wildcard waivers or
inline disable comments. Missing, duplicate, changed and unused entries fail.
Any edit to an excepted file requires reviewing its entire allowance and updating
the fingerprint deliberately; copying a new hash is not acceptance evidence.
The initial entries preserve existing presentation, connected-program and custody
seams, including conservative matches on non-dispatch identity validation.
They are recorded debt or narrowly justified data, not newly promoted pillars.
Never add a probe-import exception to avoid extracting a reusable contract.
