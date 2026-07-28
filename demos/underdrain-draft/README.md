# UNDERDRAIN: The Bloom Below

A single-file, offline AXM authored-pilot candidate built from one cold creator premise:

> A municipal plumber is drafted into a secret war against the hidden fungus kingdom causing every drain problem in town.

The executable is one continuous authored chain:

```text
Mrs. Kett service call
  -> inspect the living trap joint
  -> restore one household's water with zero hostile actors
  -> municipal draft and an authored Pump Seven entry method
  -> inspect and reroute three living spore valves
  -> hold the purge wheel at shared-flow pressure
  -> balance the Crown Sluice
  -> exact Arc action acceptance
  -> visible town, relationship, evidence, and obligation changes
  -> playable Root Gate parley
  -> exact Arc compact acceptance
  -> complete episode record
```

## Authority

The standalone is bound to exact Arc authority:

```text
Arc commit
ea16757fe9df65405b322af13d95351896f43157

authoring.json
sha256:f544af93e9c2f07a128a7c5f0f7b1e72c6bb771a29dd0af2db539358678bd2a9
```

Arc owns the action specification, semantic objectives, authored experiences, campaign state effects, action receipts, and Root Gate choice receipts. World renders and preserves only consequences that the embedded Arc capsule accepts.

The World commit is injected at build time and retained in the episode record. A build without an exact 40-character lowercase World commit is refused.

## Build and run

Install the repository dependencies, then build with the exact checked-out World commit:

```text
npm ci
node scripts/demos/build-underdrain-draft.mjs --world-commit <40-character-world-commit>
```

For a Git checkout, `<40-character-world-commit>` is the output of:

```text
git rev-parse HEAD
```

Open:

```text
local/underdrain-draft/index.html
```

The file requires no account, installation service, backend, asset host, font host, analytics endpoint, or network connection.

## Persistence and custody

The same standalone supports two explicit persistence modes.

When served from HTTP or HTTPS, the session uses browser-profile `localStorage`. Reload and later return use the same browser-origin record.

When opened directly from disk with a `file:` URL, Chromium-family browsers do not provide a portable durable `localStorage` contract. UNDERDRAIN therefore installs a namespaced `window.name` adapter before session boot. This preserves exact reload and resume in the current tab. Closing that tab ends the active direct-file session. The player surface states this boundary, and the complete episode record includes:

```text
persistence.mode = window-name
persistence.durability = current-tab
persistence.exactReload = true
persistence.closeTabRequiresExport = true
```

Use **Download episode record** before closing a direct-file tab when durable custody is required. The export retains the exact World, Arc, cartridge, authoring, accepted action, compact, campaign, structural-evidence, and persistence identities.

## Controls

- Move: `WASD` or arrow keys
- Work on the current green mechanism: `E` or `F`
- Wrench: `J` or `Space`
- Dodge: `Shift`
- Mobile: visible directional, wrench, work, and dodge controls

The opening service call contains no enemies. Pump Seven introduces defenders as pressure around the plumbing operation. Defeating them does not complete a valve, purge wheel, or sluice objective.

## What the retained gates prove

The permanent authored-pilot workflow checks out the exact Arc commit, verifies Arc's sealed authoring bytes, reruns focused Arc authority tests, materializes the browser capsule from Arc source, builds the offline file, runs the complete World suite and production build, and cold-walks desktop and mobile.

The separate Windows direct-file workflow opens the exact generated HTML through `file:` in Chromium and Microsoft Edge. It requires the cold entry, zero-pressure service call, exact runtime identities, reload and resume through the current-tab adapter, the complete nine-case route-by-compact matrix, no page errors, and no runtime request outside `file:`, `data:`, or `blob:`.

Together, those gates cover:

- ordinary service-call entry and first meaningful repair;
- authored route commitment;
- three real Pump Seven mechanisms;
- in-play discovery of the fungal nursery and municipal discharge;
- accepted action consequence before World mutation;
- HTTP browser-profile persistence;
- direct-file current-tab reload and resume;
- playable Root Gate continuation;
- all three accepted water compacts;
- the complete episode record;
- a nine-case route-by-compact deterministic matrix.

## Evidence boundary

The executable emits structural evidence in `rodoh-one-am-structural-evidence/1`, but it cannot certify that a blind human understood the experience. It therefore records:

```text
blindPlayerReceipt.status = not-issued-by-runtime
blindPlayerReceipt.required = true
```

Machine qualification makes this an authored-pilot candidate. An independent zero-assistance one-a.m. observation tied to the same exact World, Arc, cartridge, and build identities is still required before calling it an accepted blind-player episode.

## Source and output

- `authoring.json`: exact generated Arc authoring manifest
- `source/arc-capsule.js`: exact browser capsule built from Arc source
- `source/storage-adapter.js`: file-origin current-tab storage adapter
- `source/persistence-surface.js`: player disclosure and episode-record custody
- `source/head.html`, `body.html`, `app-01.js`, `app-02.js`, `tail.html`: reviewable World presentation fragments
- generated `local/underdrain-draft/index.html`: complete executable with all CSS, JavaScript, authored data, and procedural visuals inline
- retained workflow artifacts: executable, source identities, build and verification receipts, direct-file receipts, screenshots, and SHA-256 inventories
