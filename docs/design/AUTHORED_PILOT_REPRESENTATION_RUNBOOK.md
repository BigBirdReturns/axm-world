# Authored-pilot representation runbook

Status: reusable post-v1 production path for first-party authored pilots.

This runbook prevents both Underdrain representation false positives:

```text
authored causal chain passes
candidate representation is never asked for

or

role plan declares many identities
one prototype renderer backs most identities
role count is reported as production asset count
```

The fast path starts before browser work. Arc authoring becomes explicit representation obligations. A separate production receipt reports which obligations have exact authored sources. Only complete production coverage may proceed to product classification.

## Contract stack

```text
Arc authored experience and action objectives
  -> scaffold-authored-pilot-representation.mjs
  -> rodoh-representation-plan/1
  -> rodoh-representation-production/1
  -> evaluateRepresentationPlan(plan, production)
  -> candidate discovery and source custody
  -> exact standalone/native binding
  -> desktop / portrait / short-landscape walks
  -> reviewed screenshots
  -> machine-qualified-authored-pilot
  -> independent blind-player receipt
  -> accepted-playable-authored-episode
```

The scaffold is not an art generator. It derives and checks the obligation ledger and reports actual production coverage.

## Automatically derived obligations

From Arc authoring, the tool derives:

- player role from each authored-experience entry;
- actors who deliver in-play reveals;
- every semantic action objective;
- six mandatory product surfaces:
  - cold entry;
  - authored commitment;
  - first action;
  - accepted consequence;
  - playable successor;
  - durable record.

Values are sorted and deduplicated for deterministic cross-host output.

## Bounded World supplements

Some obligations are not guessed from Arc data:

- supporting people staged by World who do not own a reveal;
- persistent-state identifiers shown by consequence and record surfaces.

Supply them explicitly:

```text
--people
--state-ids
```

They must already belong to validated authoring, accepted campaign state, or governed World staging.

## Generate a role-plan skeleton

```bash
node scripts/assets/scaffold-authored-pilot-representation.mjs \
  --authoring demos/<pilot>/authoring.json \
  --output demos/<pilot>/presentation.json \
  --namespace <cartridge-namespace> \
  --repository BigBirdReturns/axm-world \
  --authored-identity <authored-identity> \
  --experience-id <experience-id> \
  --people <comma-separated-supporting-people> \
  --state-ids <comma-separated-persistent-state-ids>
```

The generated role plan contains:

- candidate identity and provenance location;
- candidate renderer with neutral fallback disabled;
- derived people, objectives, states, and six surfaces;
- portrait/body obligations;
- mechanism idle/active/complete obligations;
- persistent-state marks;
- initial environment or record role for each surface;
- TODO source paths and TODO descriptions.

A generated skeleton is deliberately incomplete. It is a production bill, not an asset pack.

## Create production coverage

Create sibling `production.json`:

```json
{
  "format": "rodoh-representation-production/1",
  "planId": "<plan-id>",
  "status": "prototype",
  "productionAssetIds": [],
  "sources": []
}
```

As art is authored, add only roles with exact production custody:

```json
{
  "id": "<source-id>",
  "assetIds": ["<covered-role-id>"],
  "sourcePaths": ["assets/production/<file>"],
  "mediaType": "image/webp",
  "sha256": "<64 lowercase hex>",
  "width": 960,
  "height": 540
}
```

Coverage status:

- `prototype`: no release-ready roles;
- `mixed`: some roles production-ready, some prototype;
- `complete`: every declared role has exact production custody.

Do not infer complete status from role count, runtime IDs, accessible descriptions, or screenshots.

## Check obligations and coverage

```bash
node scripts/assets/scaffold-authored-pilot-representation.mjs \
  --authoring demos/<pilot>/authoring.json \
  --presentation demos/<pilot>/presentation.json \
  --production demos/<pilot>/production.json \
  --namespace <cartridge-namespace> \
  --repository BigBirdReturns/axm-world \
  --authored-identity <authored-identity> \
  --experience-id <experience-id> \
  --people <comma-separated-supporting-people> \
  --state-ids <comma-separated-persistent-state-ids>
```

A successful obligation check may still report mixed production:

```json
{
  "status": "pass",
  "missing": {
    "surfaces": [],
    "people": [],
    "objectives": [],
    "states": []
  },
  "productionCoverage": {
    "status": "mixed",
    "declaredRoles": 48,
    "productionRoles": 1,
    "prototypeRoles": 47,
    "productionSources": 1
  }
}
```

That means the bill is complete and the art is not. Release classification remains blocked.

## Exact Underdrain check

```bash
node scripts/assets/scaffold-authored-pilot-representation.mjs \
  --authoring demos/underdrain-draft/authoring.json \
  --presentation demos/underdrain-draft/presentation.json \
  --production demos/underdrain-draft/production.json \
  --namespace underdrain \
  --repository BigBirdReturns/axm-world \
  --authored-identity underdrain-continuous-pilot-v2 \
  --experience-id underdrain-continuous-pilot-v2 \
  --people marta-sump,morrowcap,mrs-kett,dax-venn \
  --state-ids town-water-pressure,kett-water,fungus-contact,crown-grievance,rhea-status,evidence-custody,root-gate-open
```

Current expected report:

```text
people              6
mechanisms          5
persistent states   7
surfaces             6
declared roles      48
production roles     1
prototype roles     47
release status       blocked
```

## Production sequence

### 1. Freeze authored authority

Require exact:

- Arc authoring manifest;
- truthful semantic objective IDs;
- accepted persistent-state IDs;
- implemented successor identity.

Do not use presentation work to conceal missing law.

### 2. Generate the obligation bill

Run the scaffold immediately after authoring materialization. Repair authoring first when required cast, mechanism, state, or successor obligations are absent.

### 3. Author cartridge-owned sources

Replace prototype roles with original local art and nonvisual equivalents. Do not borrow another cartridge's identity or the neutral fallback.

A role advances to production only when `production.json` binds it to exact source custody.

### 4. Pass shared evaluation

`evaluateRepresentationPlan(plan, production)` verifies:

- namespace and provenance;
- people, mechanisms, states, and six surfaces;
- no placeholders or neutral fallback;
- exact production roles, source paths, media, digests, and dimensions;
- no unknown or unsourced roles;
- zero prototype roles for `complete` status.

Mixed coverage is an expected rework state and a release failure.

### 5. Pass candidate discovery

Global discovery walks first-party authored candidates and requires role plan, production receipt, provenance, confined sources, and shared evaluation. New pilots cannot sit outside asset custody simply because a historical rollup omitted them.

### 6. Bind exact runtime bytes

The product assembler binds:

```text
World commit
Arc commit
authoring SHA-256
role-plan SHA-256
production-coverage SHA-256
production-source SHA-256 values
```

Representation installs before cold boot, resume, and automated qualification.

### 7. Exercise every surface

Browser or native tests identify mounted roles on:

- cold entry;
- commitment;
- action;
- consequence;
- successor;
- record.

Mounted role IDs prove routing, not production quality. Production evidence comes from the separate source receipt.

### 8. Protect the rendered world

The objective and touch controls must be layout siblings of the stage or satisfy an equivalent native protected-region law.

Reference browser viewports:

```text
390 x 844 portrait
844 x 390 short landscape
```

Measure actual rectangles and require:

- zero canvas/command-deck intersection;
- zero canvas/objective intersection;
- zero canvas/touch-cluster intersection;
- zero canvas/individual-button intersection;
- zero stage/command-deck intersection;
- 44 x 44 targets;
- contained label ink;
- no button overlap;
- sufficient unobstructed canvas dimensions.

“Controls inside the stage” is explicitly forbidden as an acceptance criterion.

### 9. Review screenshots

Screenshot creation is not acceptance. Review the retained cold, action, consequence, successor, record, portrait, and short-landscape frames for:

- obstruction;
- accidental cropping;
- prototype residue;
- actor and mechanism legibility;
- consequence clarity;
- correspondence to production source receipts.

Record review disposition before classification.

### 10. Retain evidence

The checksum-led artifact contains:

- exact executable;
- authoring, role plan, and production coverage;
- production source files;
- provenance;
- scaffold receipt;
- static verifier receipt;
- browser geometry and screenshots;
- direct-file or native receipts;
- SHA-256 ledger;
- explicit classification boundary.

### 11. Seek blind-player evidence last

Only after structural and complete production representation gates pass should an independent zero-assistance player receive the candidate. The runtime cannot issue that receipt.

## Failure classifications

```text
structural law incomplete
  -> rejected

structural law complete
production representation incomplete
  -> authored-logic prototype / representation rework

structural and complete representation pass
  -> machine-qualified-authored-pilot

same exact candidate plus independent receipt
  -> accepted-playable-authored-episode
```

## Why later pilots get faster

Later pilots inherit:

- deterministic obligation derivation;
- separate production coverage;
- early source/digest refusal;
- global candidate discovery;
- exact-byte binding;
- protected-world geometry;
- six-surface browser assertions;
- screenshot review requirements;
- evidence packaging;
- fail-closed classification language.

Missing cast, mechanisms, states, sources, or layout dignity now fail before long Windows, Unity, Quest, or physical-device trains. The cartridge-specific work that remains is the work that should remain cartridge-specific: authored identity, original art, staging, and final independent observation.
