# ADR 0001 — The minimum inhabited-world loop for Program 001

- **Status:** Proposed
- **Date:** 2026-07-04
- **Scope:** Design only. **No implementation.** This ADR defines semantics so that
  later map art and world-building have a fixed frame: what is decorative, what is
  state-bearing, what writes to the ledger, what persists, and what is derived from
  the cartridge.

## Control question

> What is the smallest single-player inhabited-world loop that lets a player enter
> **The First Charter**, talk to an NPC, accept or resolve a contract, see the world
> change, and prove the result wrote back to the same **digest-stamped ledger**?

## Context

Program 001 (The First Charter) is a CI-proven playable loop today: load → choose a
contract → resolve → ledger → mutate world state → persist → reload, with a
computed authored identity (`cartridgeIdentity` = `cartridgeDigest(cartridge.arc)`)
as the anchor (#47–#52). Its surfaces are projections of one authored cartridge:
the board, the map, the orbit "planet", the encounter, the ledger, and now an
in-shell identity strip.

The poster north-star adds an **inhabited world** (panel ⑦): entering the world as
an avatar, talking to people, and changing it. A walkable-avatar substrate already
exists as a prototype (`src/world/core/*`: `PlayerCharacter`, `PlanetController`,
`FollowCamera`, `input`), but it is **not** wired to contracts, dialogue, world
state, or the ledger.

This ADR fixes the semantics of that wiring **before** any code, so the inhabited
world is another faithful projection of the same authored program — not a second
system with its own identity, save, or ledger.

## Decision

### 1. The minimum inhabited-world loop

The smallest loop that answers the control question, and nothing more:

1. **Enter** The First Charter → the player spawns as an **avatar** in one small
   **authored hub scene** (the founding hall / guild district).
2. **Walk** to one **NPC** — a contract-giver authored by the cartridge.
3. **Talk** — an authored dialogue whose choices map to **existing engine actions**
   (accept a contract / resolve the authored opening decision). No new agency.
4. **Accept or resolve one contract** through the **existing** deterministic engine
   (`runCycle` / `resolveDramaCard` / the encounter path) — the same resolution the
   board triggers, reached spatially instead of from a card.
5. **See the world change** — exactly one authored **world-state flag** flips and is
   **visibly** reflected in the scene (e.g. a door opens, a banner rises, the NPC's
   state changes).
6. **Prove the writeback** — resolving writes exactly **one digest-stamped ledger
   entry**, identical to the board path's entry.
7. **Reload** — the scene, the flipped flag, and the ledger entry are restored via
   the **digest-guarded** save; a foreign-digest save is refused.

Anything richer (multiple scenes, NPC schedules, branching quests, procedural
content) is explicitly later.

### 2. Identity stays the single anchor

The scene, avatar, NPCs, dialogue, and world-flags are **projections** of the
authored cartridge plus engine run state, all anchored to the **computed**
`cartridgeIdentity`. There is **no new identity concept** and **no new save
keying**: inhabited-world state lives inside the **same digest-keyed
`ProgramRunState`** the loop already persists, and the ledger stays
digest-stamped. Program 001 remains The First Charter.

### 3. How each element relates to the cartridge digest

| Element | What it is | Identity / persistence relationship |
|---|---|---|
| **Avatar** | Runtime presentation of the player's presence | Not authored content, **not identity-bearing**. Position/transform is runtime state; may persist in the digest-keyed save as convenience only. |
| **NPCs** | **Authored cartridge content** (a contract-giver / role / drama source the arc defines) | Existence, placement, and identity flow **verbatim** from the arc. NPC runtime state (contract taken? resolved?) is **derived** from engine/ledger state, not stored separately. |
| **Dialogue** | Text = **authored content**; the dialogue box is **runtime chrome** | Choices map to **existing** engine actions (accept contract / resolve drama option). No new outcomes, no fake agency. |
| **Contracts** | Unchanged authored **arc challenges** | The scene is one more **surface** that triggers the same resolution — like board/map/encounter today. |
| **World-state flags** | The arc defines **which** flags exist and their meaning (e.g. `cellar-cleared`); their **values** are engine/run state | **Derived** from the run/ledger, persisted in the **same** digest-keyed save. The scene reads flags to render change. Not a parallel store. |
| **Ledger entries** | Unchanged, append-only, **digest-stamped** | Resolving in the scene writes the **same** entry as resolving on the board. **One ledger, one digest.** |
| **Save / reload** | Extend the **existing** `ProgramRunState` to carry any new inhabited runtime state | Restores **only** into the same authored program (digest guard); refuses a foreign-digest save. No new keying scheme. |

**Equality is the invariant:** the board path and the inhabited-scene path for the
same contract must produce the **same** digest-stamped ledger entry and the **same**
world-flag transition. Two surfaces, one authored result.

### 4. Authored cartridge content vs. runtime chrome

- **Authored cartridge content** (flows verbatim from the arc; **never** catalogued
  as chrome): scene identity, NPC identity/placement, dialogue text, contract
  definitions, which world-flags exist and what they mean, and the world-change
  semantics.
- **Runtime chrome** (through `t()`, under #51's localization coverage guard from
  birth): the dialogue box frame, interaction prompts ("Talk", "Accept", "Leave"),
  HUD labels, and control hints.
- **Boundary test:** *if a second cartridge would supply its own version, it is
  authored content; if it is identical regardless of cartridge, it is chrome.*

### 5. What the orbit / node view becomes

**Decision: it is retained as a strategic overlay and an entry point into inhabited
scenes — not discarded, not the primary surface.**

The node/orbit ("planet") and 2D map are already faithful projections of contract
state, and the map already carries an enter-encounter action. In the inhabited
model they become the **world overview / strategic layer** (the poster's "WORLD
OVERVIEW" minimap): a way to see contract state at a glance and to **enter** the
inhabited scene for a location. The inhabited scene is the primary "make it real"
surface; the map is navigation + strategy + fast entry. This preserves the **one
authored cartridge, many runtime surfaces** principle — board, map, orbit, and
inhabited scene all project the same state and resolve to the same digest.

### 6. Acceptance tests — defined before code

**Logic receipts (vitest, CI-gated):**
1. **Path equality:** resolving a contract via the inhabited-scene path writes a
   ledger entry byte-equal (challenge, outcome, digest) to the board path's entry.
2. **Flag derivation + round-trip:** a world-flag derives from run state and
   survives the digest-guarded save/reload.
3. **Digest guard:** reload restores flags + ledger under the same digest and
   **refuses** a foreign-digest save (custody cannot resurrect into another program).
4. **No fake agency:** each dialogue choice maps to exactly one existing engine
   action; there is no scene-only outcome the engine did not produce.

**Playwright receipts (local, authored — not CI-gated):**
- Enter → walk to the NPC → talk → accept/resolve one contract → the world visibly
  changes → open the ledger → exactly one entry under the same digest → reload →
  state remembered. Runs on **desktop and mobile**.

**Manual / visual checks:**
- The scene reads as "inside The First Charter"; the world-change is legible; the
  in-shell identity strip still shows Program 001 (identity continuity); performance
  is acceptable on desktop and mobile.

**Evidence discipline:** every claim distinguishes CI-gated (typecheck/vitest) from
local Playwright receipts from manual/visual review — never overstated.

### 7. Explicitly out of scope

Co-op, multiplayer, and any networking; No. 03 ingestion; trust UX; signing;
publisher semantics; procedural content. No new mechanics beyond surfacing the
**existing** contract/drama resolution spatially.

## Consequences

- Future **map art** has defined semantics: decorative vs. state-bearing vs.
  ledger-writing vs. persisted vs. cartridge-derived are all pinned here.
- The inhabited world cannot become a parallel system: it shares identity, save,
  ledger, and evidence semantics with the rest of Program 001 — consistent with the
  AXM-WOLF inheritance laws (identity computed-not-claimed; digest-isolated saves;
  digest-stamped ledger; surfaces are projections, not forks).
- Implementation, when authorized, proceeds as small CI-proven increments, each with
  the logic receipts above landing **before or with** the surface that needs them.

## Open questions (to resolve during implementation, not here)

- Does avatar position persist across reload, or reset to the hub spawn? (Leaning:
  reset to spawn; position is not identity- or state-bearing.)
- Is the first inhabited scene authored per-cartridge, or a neutral hub the cartridge
  furnishes? (Leaning: neutral hub furnished by authored content, so a second
  cartridge inhabits the same shell with its own NPCs/dialogue.)
