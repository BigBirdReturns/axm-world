export type ShowcaseSceneKind =
  | "hero"
  | "projections"
  | "make"
  | "materialize"
  | "classics"
  | "memory"
  | "providers"
  | "custody";

export interface ShowcaseChapter {
  id: string;
  indexLabel: string;
  eyebrow: string;
  title: string;
  body: string;
  claim: string;
  scene: ShowcaseSceneKind;
  durationMs: number;
  worldMoment: "root" | "star" | "village" | "rain";
}

export const SHOWCASE_CHAPTERS: readonly ShowcaseChapter[] = [
  {
    id: "one-world",
    indexLabel: "00",
    eyebrow: "AXM INFINITE FABRIC",
    title: "One world. Every game. Still yours.",
    body: "The First Charter begins as a creator-owned cartridge and becomes a living planet, a game suite, and a persistent memory without surrendering custody to a model or platform.",
    claim: "CARTRIDGE → WORLD → PLAY → MEMORY",
    scene: "hero",
    durationMs: 7800,
    worldMoment: "root",
  },
  {
    id: "one-revision",
    indexLabel: "01",
    eyebrow: "ONE CANONICAL REVISION",
    title: "Board, Map, Planet, and Play are the same world.",
    body: "Every projection reads the same stable entities, law binding, relationships, quests, and append-only event ledger.",
    claim: "NO SECOND GAME STATE",
    scene: "projections",
    durationMs: 7600,
    worldMoment: "star",
  },
  {
    id: "say-the-change",
    indexLabel: "02",
    eyebrow: "MAKE INSIDE THE WORLD",
    title: "Describe a place. Receive a bounded proposal.",
    body: "Generation providers propose structured cells, entities, assets, and known behaviors. They cannot rewrite law, inject canonical runtime code, or mutate the ledger directly.",
    claim: "PROPOSAL ONLY · HOST ACCEPTANCE REQUIRED",
    scene: "make",
    durationMs: 9000,
    worldMoment: "star",
  },
  {
    id: "world-grows",
    indexLabel: "03",
    eyebrow: "ACCEPTED REVISION",
    title: "The village becomes part of the running world.",
    body: "A new cell, bridge, shopkeeper, and quest appear through a content-addressed revision while the previous world remains recoverable.",
    claim: "FUNCTIONAL CELL · IMMUTABLE BRANCH",
    scene: "materialize",
    durationMs: 8400,
    worldMoment: "village",
  },
  {
    id: "play-the-story",
    indexLabel: "04",
    eyebrow: "THE FIVE CLASSIC TRIALS",
    title: "A story can contain an entire game shelf.",
    body: "Five recognizable arcade forms become chapters of The First Charter. Their victories restore seals and alter the same Tiny World memory.",
    claim: "FIVE GAMES · ONE STORY LEDGER",
    scene: "classics",
    durationMs: 11000,
    worldMoment: "village",
  },
  {
    id: "world-remembers",
    indexLabel: "05",
    eyebrow: "CONSEQUENCE CUSTODY",
    title: "Play leaves durable marks on the world.",
    body: "Collected objects, completed trials, relationships, accepted patches, weather, and bridge state remain attributable across every projection.",
    claim: "APPEND-ONLY MEMORY · STABLE IDENTITIES",
    scene: "memory",
    durationMs: 8600,
    worldMoment: "rain",
  },
  {
    id: "providers-rotate",
    indexLabel: "06",
    eyebrow: "COMMODITY PROVIDERS",
    title: "Models compete. The world does not move.",
    body: "Muse, OpenAI, Anthropic, Gemini, local models, voxel generators, splats, and future systems all meet the same bounded world and asset contracts.",
    claim: "SAME PATCH CONTRACT · PROVIDER ABSENT DURING PLAY",
    scene: "providers",
    durationMs: 8600,
    worldMoment: "rain",
  },
  {
    id: "take-it-home",
    indexLabel: "07",
    eyebrow: "CREATOR-OWNED CUSTODY",
    title: "Export the branch. Kill the network. Keep playing.",
    body: "The world package carries its accepted revisions, behavior identities, assets, controls, and memory. The originating provider is provenance, never a runtime dependency.",
    claim: "PROVIDER OFF · NETWORK OFF · WORLD CONTINUES",
    scene: "custody",
    durationMs: 9800,
    worldMoment: "rain",
  },
] as const;

export function clampShowcaseIndex(index: number): number {
  return Math.min(SHOWCASE_CHAPTERS.length - 1, Math.max(0, index));
}

export function chapterIndexById(id: string | null): number {
  if (!id) return 0;
  const index = SHOWCASE_CHAPTERS.findIndex((chapter) => chapter.id === id);
  return index < 0 ? 0 : index;
}
