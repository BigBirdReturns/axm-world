# Lessons learned, gates missed, and edges discovered v0.2

## Lessons learned

1. **Selection is information; proximity is authority.** Embodied action needs a separate physical fact that is revoked when World unmounts.
2. **A session highlight is not durable state.** Place change derives from cleared engine state and ledger facts after reload.
3. **Touch is not a tiny keyboard event.** A fast tap may occur between WebGL frames, so a consumed one-shot spatial impulse is required.
4. **Identity is not role.** Role binding belongs to theme data; identity accents derive from identity; neutral renderers never branch on bundled vocabulary.
5. **Crisp scaling is not authored scaling.** `micro`, `field`, `card`, and `close` states must disclose authored versus fallback topology.
6. **Animation must name causality.** Idle, walk, airborne, and arrived are distinct motion families.
7. **A generic mutation proves persistence, not consequence.** Theme state and persisted outcome must choose place presentation.
8. **Durability needs a compatibility boundary.** Export/reload today does not prove indefinite support across engine majors.
9. **Proof beats scale.** One complete loop with an inspectable receipt is stronger than a rendered ecosystem claim.

## Gates initially missed

| Missed gate | Repair | Executable evidence |
|---|---|---|
| Physical custody | Nearby authority, hysteresis, unmount revocation, shell gating | `walkable-world.test.ts` |
| Touch-frame edge | Consumed one-shot movement impulse | `walkable-world.test.ts` |
| Cross-embodiment ownership | Theme-owned world avatar plus identity palette | `embodiment-contract.test.ts` |
| Motion causality | Controller idle/walk/airborne plus World arrival | `embodiment-contract.test.ts` |
| Honest scale fallback | Named state and authored/fallback disclosure | `embodiment-contract.test.ts` |
| Consequence presentation | Theme and persisted outcome choose landmark/palette | `embodiment-contract.test.ts` |
| Preservation boundary | Compatibility receipt, schemas, guarantee and edge statuses | `compatibility-receipt.test.ts` |
| Proof composition | Release-facing capability ledger | `docs/product/capability-ledger.md` |

## Edges discovered

- Malformed versions resolve to `unknown`; an older same-major runtime is `runtime-too-old`; a different major is `migration-required`.
- Cleared-place appearance survives reload when `lastReport` is null and uses the latest ledger outcome.
- Unknown roles, scale states, appearance IDs, and imported cartridges retain neutral fallbacks.
- Theme-specific 2D art cannot imply a corresponding 3D asset exists.
- Arrival hysteresis prevents action flicker at the boundary.
- Modal decisions and encounters must prevent avatar drift.
- A completed cartridge may spawn toward the next available place after reload; navigation policy cannot erase prior transformation.
- Additive custody fields still require a documented migration policy for strict external consumers.
- “Nintendo + Roblox” cannot become a public visual, copy, layout, or scale claim.

## New hard gates

1. No theme-owned 2D state paired with platform-hardcoded 3D identity.
2. No displayed scale described as authored unless `data-scale-authored` is true.
3. No world transformation dependent solely on session state.
4. No optimistic compatibility from an unparseable version.
5. No public capability claim without a visible artifact and deterministic receipt.
6. No roadmap capability presented as demonstrated.
7. No source comparison promoted into imitation or implied scale.

## 52/52 Aspirational Power rescore

| Dimension | Score | Evidence |
|---|---:|---|
| Object classification | 4 | Capability ledger classifies product, runtime, custody, proof venues. |
| Actor specificity | 4 | Creator, player, maintainer, reviewer, community have distinct proof/action/risk. |
| Capability truth | 4 | Claims and non-claims are paired line by line. |
| Aspiration mechanism | 4 | Custody converts persistence into creator/player agency. |
| Resistance conversion | 4 | Each doubt maps to an artifact and receipt. |
| Proof architecture | 4 | Runtime, custody, tests, and documentation have distinct jobs. |
| Product/program character | 4 | ARC, WORLD, engine, and themes have normative boundaries. |
| World-system coherence | 4 | Authoring through action to migration boundary is represented. |
| Cross-medium grammar | 4 | One capability ledger governs interaction, receipt, tests, docs. |
| Multi-audience compatibility | 4 | Proposition is stable while proof/action vary by actor. |
| Critical legibility | 4 | Migration, moderation, preservation, discovery, compatibility costs are explicit. |
| Independent expression | 4 | Value derives from custody/proof, not source resemblance. |
| Replicability | 4 | Contracts, policies, edge tests, hard gates are executable. |

Total: **52/52**, conditional on every referenced test, typecheck, production build, and hard gate passing in the same revision.

Control question: **Can a skeptical creator reproduce the claim, inspect its boundary, and identify who bears failure without trusting aspiration or recognizing a borrowed source?**
