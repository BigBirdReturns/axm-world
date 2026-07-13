# RoDo(h) capability ledger

A capability is demonstrated only when a player-visible artifact and deterministic receipt establish the same fact. Roadmap statements are not capabilities.

| Capability claim | Primary actor | Visible artifact or interaction | Deterministic receipt | Explicit non-claim |
|---|---|---|---|---|
| A cartridge enters as a walkable world | Player | World spawn, collision, camera, movement controls | `walkable-world.test.ts` | Not a large social world or multiplayer service. |
| Physical arrival grants embodied interaction | Player | Proximity status changes at an authored place | `playable-world-acceptance.test.ts` | Board/Map selection does not grant physical authority. |
| An authored choice resolves through engine truth | Player, reviewer | Encounter and result | resolver, gate-parity, acceptance tests | Cartridges cannot inject runtime logic. |
| A resolved place remains changed | Player | Theme-owned outcome landmark | cleared node plus ledger-derived transformation | A fallback does not invent authored consequence meaning. |
| The cartridge retains the run | Creator, player | Cartridge receipt and Export | digest save, ledger, custody round trip | Export does not promise undeclared major-version support. |
| Compatibility is inspectable | Creator, maintainer | Compatibility, run format, schemas, transformed count | `compatibility-receipt.test.ts` | Same-major support is not automatic major migration. |
| Appearance degrades without role assumptions | Creator | Doll and traveler theme fallbacks | `appearance.test.ts`, `embodiment-contract.test.ts` | Neutral fallback is not bespoke art. |

## Ownership contract

| Layer | Owns | Must not own |
|---|---|---|
| AXM-ARC / cartridge | Rules, roles, dialogue, places, namespaced appearance references, consequences | Runtime code injection or engine overrides |
| AXM-WORLD | Terrain, controller, camera, animation, interaction, encounter and environment presentation | Resolution truth or reinterpretation of ledger facts |
| Engine | Validation, deterministic resolution, saves, provenance, migrations | Cartridge-specific visual meaning |
| Theme/assets | Doll scale states, world avatar modules, place-state appearance, palettes and fallbacks | Platform assumptions about authored role IDs |

## Compatibility policy

“Durable” means inspectable, exportable, and reloadable under a declared engine contract.

- Runtime and cartridge requirements use semantic versions.
- Compatibility requires the same major and a runtime not older than the cartridge floor.
- A different major is `migration-required`; it is never silently accepted.
- Malformed versions are `unknown`, never optimistic compatibility.
- Save and ledger schema versions travel in the custody receipt.
- Migration must preserve identity, ledger order, consequences, and transformed-location derivation or fail visibly.

## Roadmap boundary

Not demonstrated: production-scale discovery, multiplayer authority, moderation, marketplace economics, indefinite cross-version preservation, or Nintendo-level content polish.
