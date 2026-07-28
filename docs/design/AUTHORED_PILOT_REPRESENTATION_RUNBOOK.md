# Authored-pilot representation runbook

Status: reusable post-v1 production path for first-party authored pilots.

This runbook prevents the Underdrain false-positive pattern:

```text
authored causal chain passes
historical asset inventory passes
candidate-specific representation is never asked for
```

The fast path begins before browser work. Arc authoring is converted into explicit representation obligations, the candidate-owned pack is completed against those obligations, and only then may the standalone, browser, Windows, Unity, or device trains run.

## Contract stack

```text
Arc authored experience and action objectives
  -> scaffold-authored-pilot-representation.mjs
  -> rodoh-representation-plan/1
  -> evaluateRepresentationPlan
  -> candidate discovery and asset custody
  -> exact standalone/native representation binding
  -> desktop/mobile surface walks
  -> machine-qualified-authored-pilot
  -> independent blind-player receipt
  -> accepted-playable-authored-episode
```

The scaffold tool is not an art generator. It generates and checks the **obligation ledger** that art, layout, accessibility, and runtime integration must satisfy.

## What is derived automatically

From the authored manifest, the tool derives:

- the player role from each authored experience entry;
- actors who deliver authored in-play reveals;
- every semantic action objective under `actionObjectives.encounters`;
- the six mandatory product surfaces:
  - cold entry;
  - authored commitment;
  - first action;
  - accepted consequence;
  - playable successor;
  - durable record.

The derived values are sorted and deduplicated, so generation is deterministic across hosts.

## Bounded World supplements

Some representation obligations are intentionally not guessed from Arc data:

- supporting people who appear in World staging but do not own an Arc reveal;
- persistent state identifiers rendered by the consequence and record surfaces.

Supply these explicitly through:

```text
--people
--state-ids
```

This is a bounded supplement, not an invitation to invent canon. The identifiers must already be owned by the authored experience, accepted campaign state, or validated World staging.

## Generate a new pilot skeleton

```bash
node scripts/assets/scaffold-authored-pilot-representation.mjs \
  --authoring demos/<pilot>/authoring.json \
  --output demos/<pilot>/presentation.json \
  --namespace <cartridge-namespace> \
  --repository BigBirdReturns/axm-world \
  --authored-identity <authored-identity> \
  --experience-id <experience-id> \
  --people <comma-separated-world-supporting-people> \
  --state-ids <comma-separated-persistent-state-ids>
```

The generated plan contains:

- candidate identity and provenance location;
- cartridge renderer with neutral fallback disabled;
- derived people, objectives, states, and six surfaces;
- portrait/body obligations for every person;
- idle/active/complete obligations for every mechanism;
- state-mark obligations for every persistent state;
- one initial environment or record asset per required surface;
- TODO source paths and TODO accessible equivalents.

A generated skeleton is deliberately incomplete. It cannot pass production representation because its TODO assets are placeholders. Its purpose is to expose the whole production bill before anyone starts browser polishing.

## Check a completed plan

```bash
node scripts/assets/scaffold-authored-pilot-representation.mjs \
  --authoring demos/<pilot>/authoring.json \
  --presentation demos/<pilot>/presentation.json \
  --namespace <cartridge-namespace> \
  --repository BigBirdReturns/axm-world \
  --authored-identity <authored-identity> \
  --experience-id <experience-id> \
  --people <comma-separated-world-supporting-people> \
  --state-ids <comma-separated-persistent-state-ids>
```

A passing check emits:

```json
{
  "format": "rodoh-representation-scaffold-receipt/1",
  "status": "pass",
  "mode": "check",
  "missing": {
    "surfaces": [],
    "people": [],
    "objectives": [],
    "states": []
  },
  "blockers": []
}
```

The command exits nonzero before typecheck or browser installation when the plan omits a derived person, objective, state, surface, or binding.

## Exact Underdrain check

The controlling Underdrain and asset-custody workflows execute:

```bash
node scripts/assets/scaffold-authored-pilot-representation.mjs \
  --authoring demos/underdrain-draft/authoring.json \
  --presentation demos/underdrain-draft/presentation.json \
  --namespace underdrain \
  --repository BigBirdReturns/axm-world \
  --authored-identity underdrain-continuous-pilot-v2 \
  --experience-id underdrain-continuous-pilot-v2 \
  --people marta-sump,morrowcap,mrs-kett,dax-venn \
  --state-ids town-water-pressure,kett-water,fungus-contact,crown-grievance,rhea-status,evidence-custody,root-gate-open
```

The authoring supplies Rhea, Tess, Morrowcap, and all five semantic objectives. The explicit World supplement adds the staged supporting cast and the seven accepted persistent states. Sorting and deduplication produce the exact six-person, five-mechanism, seven-state obligation set.

## Production sequence

### 1. Freeze authored authority

Before art production, require:

- exact Arc authoring manifest;
- truthful semantic objective identifiers;
- accepted persistent-state identifiers;
- implemented successor identity.

Do not use presentation work to conceal missing law.

### 2. Generate obligations

Run scaffold generation immediately after authoring materialization. Review the generated bill for:

- missing player-facing people;
- missing mechanism states;
- missing persistent states;
- missing journey surfaces.

If an obligation is absent because authoring itself is incomplete, repair authoring first.

### 3. Author the cartridge-owned pack

Replace every TODO with original, local assets and accessible equivalents. A first-party pilot must not borrow another cartridge’s identity or rely on the neutral Rodoh fallback.

### 4. Pass the shared evaluator

`evaluateRepresentationPlan` checks:

- namespace and provenance;
- no placeholders or neutral fallback;
- production-sized asset vocabulary;
- people portrait/body bindings;
- objective idle/active/complete bindings;
- state marks;
- six surfaces;
- desktop/mobile coverage;
- nonvisual equivalents.

### 5. Pass candidate discovery

The global discovery test walks `demos/**/authoring.json`. A first-party pilot cannot remain outside asset custody merely because no one added it to a historical release rollup.

### 6. Bind exact runtime bytes

The product assembler must bind:

```text
World commit
Arc commit
authoring SHA-256
representation SHA-256
```

Representation must install before cold boot, resume, and automated qualification.

### 7. Exercise every surface

Browser or native tests must identify mounted asset IDs on:

- cold entry;
- commitment;
- action;
- consequence;
- successor;
- record.

Screenshot existence alone is insufficient.

### 8. Check narrow-screen geometry

At the reference mobile viewport, require:

- controls inside the stage;
- targets at least 44 x 44 CSS pixels;
- no control overlap;
- objective ribbon separation;
- rendered label ink inside its own target.

### 9. Retain evidence

The checksum-led artifact should contain:

- exact standalone or native build;
- authoring and representation plans;
- provenance;
- scaffold check receipt;
- static verifier receipt;
- desktop/mobile screenshots;
- direct-file or native receipts where applicable;
- SHA-256 ledger.

### 10. Seek blind-player evidence last

Only after structural and representation gates pass should the candidate be handed to an independent zero-assistance player. The runtime remains forbidden to issue that receipt itself.

## Failure classifications

```text
structural law incomplete
  -> rejected

structural law complete, representation incomplete
  -> authored-logic prototype

structural and representation gates pass
  -> machine-qualified-authored-pilot

structural, representation, and independent receipt pass
  -> accepted-playable-authored-episode
```

## Why this makes later pilots faster

The first Underdrain reset had to discover and implement the missing acceptance plane. Later pilots inherit:

- the schema;
- the evaluator;
- candidate discovery;
- the scaffold/check command;
- deterministic fixture tests;
- static exact-byte verification;
- six-surface browser assertions;
- mobile geometry law;
- provenance and artifact packaging;
- classification language.

A missing actor or mechanism now fails in a small Node check before dependency-heavy browser, Windows, Unity, or Quest qualification. A visual collision becomes a reusable geometry assertion rather than a one-off screenshot comment.

The only cartridge-specific work left is the work that should be cartridge-specific: its authored identity, original asset production, staging, and final independent observation.
