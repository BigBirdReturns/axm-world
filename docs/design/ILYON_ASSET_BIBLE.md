# The Kind Gods of Ilyon — visual asset bible

**Status: implemented reference pack.**

This document governs the cartridge-owned visual expression for **The Kind Gods
of Ilyon** inside Rodoh. It closes the gap between a palette-only skin and a
recognizable world while preserving the white-label rule: the runtime can host
any valid cartridge in a neutral presentation, and a bundled cartridge may add
its own expression without becoming a gameplay exception.

The executable authority remains the Arc. These assets interpret identities,
places, evidence, factions, and consequences that the validated cartridge
already names. They do not create characters, outcomes, relationships, or
mechanics.

## 1. Control sentence

> A gift must remain refusible.

Every visual decision should hold both halves of that sentence:

- **gift:** medicine, food security, translation, peace, public infrastructure,
  astronomical knowledge;
- **refusal:** forks, open custody, plural voices, visible dependency, routes
  that cannot be closed by one owner.

Ilyon must never read as a generic evil-empire palette. Its danger is
indispensable benevolence becoming constitutional closure.

## 2. Material language

| Material | Meaning | Runtime use |
|---|---|---|
| Abyss blue | the uncommanded ocean and what the model cannot own | deep fields, negative space, shell backgrounds |
| Observatory teal | public knowledge, navigation, translation, living systems | primary motifs, borders, active marks |
| Nacre | civic dignity and the vulnerable concrete life inside abstraction | faces, highlights, paper/instrument surfaces |
| Coral | refusal, interruption, exposure, bodily cost | warnings, dead-star and route marks, exception accents |
| Archive gold | custody, provenance, durable record | evidence, emblems, receipt headers |
| Black-green depth | ecological exteriority | shadows, underlays, ocean-voice forms |

The palette is declared in `src/world/themes/ilyon/theme.ts` and scoped under
`<html data-cartridge="ilyon">`. No Ilyon selector may apply to an unknown or
imported cartridge.

## 3. Shape grammar

Ilyon combines three recurring shapes:

1. **rings and orbits** — observatories, public instruments, planetary models;
2. **forks and branching routes** — systems that remain interoperable without
   becoming singularly closable;
3. **waves and plural lines** — the ocean as several actors rather than one
   convenient planetary voice.

Perfect symmetry belongs to the Benefactor model. Broken symmetry, offset
orbits, and branching lines belong to refusal and exteriority. Neither is coded
as purely good or evil.

## 4. Role appearances

The five roles receive cartridge-owned 16×16 portraits and standing bodies.
They are not recolored Rodoh starter dolls.

### Auditor

- silhouette: compact hood, instrument band, gold provenance trim;
- visual priority: eyes and archive geometry;
- responsibility: holds evidence whose verification changes the world.

### Interlocutor

- silhouette: open tidal hood, coral listening bands, asymmetric wave trim;
- visual priority: receptive shape rather than command posture;
- responsibility: translates the excluded actor without manufacturing one voice.

### Witness

- silhouette: dark observatory cap, nacre face, restrained archive robe;
- visual priority: stable framing and custody;
- responsibility: benefits from delay and preserves uncertainty.

### Protector

- silhouette: civic rescue plating, coral medical band, broad planted stance;
- visual priority: bodily presence and immediate care;
- responsibility: depends on the system under accusation.

### Sovereign Exception

- silhouette: reef-antler sensory crown, pale tidal body, open coral robe;
- visual priority: visibly nonstandard anatomy without becoming a monster;
- responsibility: learns the imposed model and invalidates it from outside.

The source files are:

- `src/world/themes/ilyon/portrait-icons.tsx`
- `src/world/themes/appearance.ts`
- `src/world/pixel-ui/PixelDoll.tsx`
- `src/world/pixel-ui/PixelDollPortrait.tsx`

## 5. Campaign beat motifs

Each beat has one distinct motif, dispatched by challenge id through the shared
theme seam.

| Beat | Motif | Visual claim |
|---|---|---|
| End the Fever | cure cross over a tide line | the public good is real |
| Map the Dependency | five-node dependency graph | miracles have owners and failure points |
| Read the Dead Star | crossed dead-star record | evidence widens the conflict but remains damaged |
| Hear the Ocean | three incompatible wave voices | plurality must not be collapsed into one Answer |
| Refuse Integration | forked systems | refusal is infrastructure work |
| Carry the Evidence | opening route | disclosure changes who can reach the pocket |

Unknown challenge ids fall back to the tide astrolabe, not to another
cartridge's motif.

## 6. Institutional marks

### Final Humanity Benefactors

A complete circular cross: integrated care, integrated authority, and the
temptation of one legible system.

### Uncrowned Compact

A crown crossed before closure: refusal of singular command, including the
costs and delays that refusal imposes.

### Thalassic Houses

A civic house under a wave: local continuity, rescue, law, hierarchy, and
dynastic capture in the same mark.

## 7. Evidence and consequence marks

Evidence marks distinguish:

- cure ledger;
- dead-star record;
- reef testimony;
- contested seal.

Consequence marks distinguish:

- negotiated cure dependency;
- public dependency map;
- archive custody;
- oceanic political standing;
- forked infrastructure;
- open scarway route.

These glyphs appear in the Godscar Aperture beside the exact validated source
records. They are orientation aids, not alternate evidence tiers or resolver
state.

## 8. Environment treatment

### Board

A civic dependency chart laid over tidal observatory rings. Cards remain
readable first; atmosphere stays behind the contract information.

### Hall

The generic plank floor becomes an intertidal observatory chamber using scoped
CSS geometry: orbit rings, tide lines, and a reflective instrument floor. The
party uses the cartridge-owned body pack.

### Encounter

The neutral encounter panel becomes a nacre instrument table with star-chart
geometry and coral interruption marks. Objectives and readiness remain derived
from the same challenge record.

### Aperture

The Godscar panel becomes a constitutional observatory:

- tide-astrolabe cartridge emblem;
- illustrated six-pressure strip;
- five founder responsibility portraits;
- evidence receipt marks;
- faction marks;
- inherited consequence marks.

## 9. White-label contract

The implementation follows these rules:

1. Unknown/imported cartridges resolve to `RODOH_BASE_THEME`.
2. Unknown/imported cartridges receive no `data-cartridge` palette scope.
3. Unknown/imported cartridges receive no bundled motif or authored-person art.
4. A cartridge theme may own appearance specs and marks, but never engine law.
5. Every authored face is keyed by a stable source id, never a display name.
6. Every pixel grid carries `Source:`, `Grid:`, and `Encoding:` provenance.
7. All runtime art remains local-first and dependency-free.
8. Reduced-motion preferences disable decorative transitions.

## 10. Acceptance checklist

The Ilyon reference pack is complete at the current pixel-art runtime scope
when all of the following remain true:

- [x] five distinct role portraits;
- [x] five distinct standing bodies;
- [x] exact founder-id portrait/body mapping;
- [x] six distinct campaign beat motifs;
- [x] cartridge emblem;
- [x] six pressure marks;
- [x] three faction marks;
- [x] three evidence receipt marks;
- [x] six consequence marks;
- [x] board treatment;
- [x] hall treatment;
- [x] encounter treatment;
- [x] Aperture cast/evidence/faction/consequence integration;
- [x] desktop/mobile responsive styling;
- [x] neutral fallback preserved for unknown cartridges;
- [x] executable integrity tests for grids, mappings, and dispatch.

This closes the missing **visual identity asset pack** for Ilyon. It does not
claim that all future sound, music, cinematic animation, accessibility
research, or higher-resolution illustration work for the wider AXM product is
finished.
