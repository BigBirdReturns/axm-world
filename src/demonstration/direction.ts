import {
  DEMONSTRATION_PROPOSAL_FORMAT,
  type DemonstrationProgram,
  type DemonstrationProposal,
  type DirectionCompilation,
} from "./contracts.js";

const FOCUS_CHAPTERS: Readonly<Record<string, readonly string[]>> = {
  custody: ["one-world", "world-remembers", "providers-rotate", "take-it-home"],
  generation: ["one-world", "say-the-change", "world-grows", "providers-rotate", "take-it-home"],
  games: ["one-world", "play-the-story", "world-remembers", "take-it-home"],
  architecture: [
    "one-revision",
    "say-the-change",
    "world-grows",
    "world-remembers",
    "providers-rotate",
    "take-it-home",
  ],
  proof: [
    "one-revision",
    "say-the-change",
    "world-grows",
    "world-remembers",
    "take-it-home",
  ],
};

function boundedHash(value: string): string {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function chooseEdition(text: string): string | null {
  if (/\b(?:social|vertical|phone|short-form|reel|tiktok|shorts)\b/u.test(text)) {
    return "social";
  }
  if (/\b(?:booth|kiosk|unattended|loop|expo|trade\s*show)\b/u.test(text)) {
    return "booth";
  }
  if (/\b(?:proof|evidence|receipt|audit|technical\s*review)\b/u.test(text)) {
    return "proof";
  }
  if (/\b(?:technical|engineering|architecture|developer|deep\s*dive)\b/u.test(text)) {
    return "technical";
  }
  if (/\b(?:executive|investor|board|leadership|meeting|pitch)\b/u.test(text)) {
    return "executive";
  }
  return null;
}

function chooseFocus(text: string): keyof typeof FOCUS_CHAPTERS | null {
  if (/\b(?:custody|ownership|offline|portable|sovereign|network\s*off)\b/u.test(text)) {
    return "custody";
  }
  if (/\b(?:generation|generate|model|provider|prompt|make|authoring)\b/u.test(text)) {
    return "generation";
  }
  if (/\b(?:game|games|play|arcade|story|trial)\b/u.test(text)) {
    return "games";
  }
  if (/\b(?:architecture|system|engine|runtime|technical)\b/u.test(text)) {
    return "architecture";
  }
  if (/\b(?:proof|evidence|receipt|audit|provenance)\b/u.test(text)) {
    return "proof";
  }
  return null;
}

function parseTargetDurationMs(text: string): number | null {
  const minutes = text.match(/\b(\d{1,2}(?:\.\d+)?)\s*(?:minutes?|mins?|min)\b/u);
  if (minutes) return Math.round(Number(minutes[1]) * 60_000);
  const seconds = text.match(/\b(\d{1,3})\s*(?:seconds?|secs?|sec)\b/u);
  if (seconds) return Number(seconds[1]) * 1_000;
  return null;
}

function filterKnownChapterIds(
  chapterIds: readonly string[],
  program: DemonstrationProgram,
): readonly string[] {
  const known = new Set(program.chapters.map((chapter) => chapter.id));
  return chapterIds.filter((chapterId) => known.has(chapterId));
}

export function compileNaturalLanguageDirection(
  program: DemonstrationProgram,
  direction: string,
): DirectionCompilation {
  const normalized = direction.trim().replace(/\s+/gu, " ");
  if (normalized.length === 0) {
    throw new Error("Demonstration direction must not be empty");
  }
  if (normalized.length > 600) {
    throw new Error("Demonstration direction exceeds 600 characters");
  }
  const text = normalized.toLocaleLowerCase("en-US");
  const matchedControls: string[] = [];
  const warnings: string[] = [];

  const requestedEdition = chooseEdition(text);
  const editionId = requestedEdition
    && program.editions.some((edition) => edition.id === requestedEdition)
      ? requestedEdition
      : program.defaultEditionId;
  if (requestedEdition) matchedControls.push(`edition:${editionId}`);

  const edition = program.editions.find((entry) => entry.id === editionId);
  if (!edition) throw new Error(`Default demonstration edition ${editionId} is unavailable`);

  const focus = chooseFocus(text);
  const focusedChapterIds = focus
    ? filterKnownChapterIds(FOCUS_CHAPTERS[focus], program)
    : undefined;
  if (focus && focusedChapterIds && focusedChapterIds.length > 0) {
    matchedControls.push(`focus:${focus}`);
  }

  const targetDurationMs = parseTargetDurationMs(text);
  let durationScale: number | undefined;
  if (targetDurationMs !== null) {
    const sourceIds = focusedChapterIds && focusedChapterIds.length > 0
      ? focusedChapterIds
      : edition.chapterIds;
    const chapterById = new Map(program.chapters.map((chapter) => [chapter.id, chapter] as const));
    const sourceDurationMs = sourceIds.reduce(
      (total, chapterId) => total + (chapterById.get(chapterId)?.durationMs ?? 0),
      0,
    );
    if (sourceDurationMs > 0) {
      durationScale = Math.max(0.4, Math.min(2.5, targetDurationMs / sourceDurationMs));
      matchedControls.push(`duration:${Math.round(targetDurationMs / 1_000)}s`);
      if (durationScale === 0.4 || durationScale === 2.5) {
        warnings.push("Requested duration reached the bounded timing limit");
      }
    }
  }

  const autoplay = /\b(?:autoplay|auto-play|start\s+automatically)\b/u.test(text)
    ? true
    : /\b(?:manual|presenter-controlled|do\s+not\s+autoplay)\b/u.test(text)
      ? false
      : undefined;
  if (autoplay !== undefined) matchedControls.push(`autoplay:${autoplay}`);

  const loop = /\b(?:loop|repeat|unattended|kiosk)\b/u.test(text)
    ? true
    : /\b(?:once|one\s+pass|do\s+not\s+loop)\b/u.test(text)
      ? false
      : undefined;
  if (loop !== undefined) matchedControls.push(`loop:${loop}`);

  const clean = /\b(?:clean|capture|recording|no\s+controls|hide\s+controls)\b/u.test(text)
    ? true
    : /\b(?:operator|proof\s+rail|show\s+controls)\b/u.test(text)
      ? false
      : undefined;
  if (clean !== undefined) matchedControls.push(`clean:${clean}`);

  const sound = /\b(?:muted|mute|silent|no\s+sound)\b/u.test(text)
    ? false
    : /\b(?:with\s+sound|sound\s+on|audio)\b/u.test(text)
      ? true
      : undefined;
  if (sound !== undefined) matchedControls.push(`sound:${sound}`);

  const aspect = /\b(?:vertical|9:16|phone|portrait)\b/u.test(text)
    ? "9:16" as const
    : /\b(?:4:5|social\s+post|feed)\b/u.test(text)
      ? "4:5" as const
      : /\b(?:wide|widescreen|16:9|television|tv)\b/u.test(text)
        ? "16:9" as const
        : undefined;
  if (aspect) matchedControls.push(`aspect:${aspect}`);

  if (matchedControls.length === 0) {
    warnings.push("No bounded control phrase was recognized; the default edition was retained");
  }

  const proposal: DemonstrationProposal = {
    format: DEMONSTRATION_PROPOSAL_FORMAT,
    id: `proposal:direction:${boundedHash(normalized)}`,
    programId: program.id,
    baseVersion: program.version,
    editionId,
    ...(focusedChapterIds && focusedChapterIds.length > 0
      ? { chapterIds: focusedChapterIds }
      : {}),
    ...(durationScale === undefined ? {} : { durationScale }),
    ...(autoplay === undefined ? {} : { autoplay }),
    ...(loop === undefined ? {} : { loop }),
    ...(clean === undefined ? {} : { clean }),
    ...(sound === undefined ? {} : { sound }),
    ...(aspect === undefined ? {} : { aspect }),
    ...(focus ? { focus } : {}),
    direction: normalized,
  };

  return { proposal, matchedControls, warnings };
}
