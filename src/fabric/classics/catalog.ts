export const CLASSIC_TRIAL_IDS = [
  "balance-of-oaths",
  "wall-of-terms",
  "serpent-of-memory",
  "swarm-at-the-gate",
  "courier-beyond-the-charter",
] as const;

export type ClassicTrialId = typeof CLASSIC_TRIAL_IDS[number];

export interface ClassicTrialDefinition {
  id: ClassicTrialId;
  chapter: string;
  title: string;
  mechanic: string;
  story: string;
  objective: string;
  controls: string;
  seal: string;
}

export const CLASSIC_TRIALS: readonly ClassicTrialDefinition[] = [
  {
    id: "balance-of-oaths",
    chapter: "I",
    title: "Balance of Oaths",
    mechanic: "paddle duel",
    story: "Two houses dispute the First Charter. Keep the oath in motion until one side yields without breaking the covenant.",
    objective: "Reach five points before the rival keeper.",
    controls: "Move with W/S, arrows, or the left stick.",
    seal: "Judgment",
  },
  {
    id: "wall-of-terms",
    chapter: "II",
    title: "Wall of Terms",
    mechanic: "brickbreaker",
    story: "The Charter was hidden behind a wall of false clauses. Break every term while keeping the living text from falling into the dark.",
    objective: "Clear all thirty-two terms with three lives.",
    controls: "Move with A/D, arrows, or the left stick. PRIMARY launches the seal.",
    seal: "Clarity",
  },
  {
    id: "serpent-of-memory",
    chapter: "III",
    title: "Serpent of Memory",
    mechanic: "grid serpent",
    story: "Memory grows by carrying what came before. Gather the lost clauses without crossing the path already written.",
    objective: "Recover eight memory fragments.",
    controls: "Turn with WASD, arrows, or the left stick.",
    seal: "Continuity",
  },
  {
    id: "swarm-at-the-gate",
    chapter: "IV",
    title: "Swarm at the Gate",
    mechanic: "fixed shooter",
    story: "A swarm descends on the north gate while the village is still learning the Charter. Hold the line long enough for the people to organize.",
    objective: "Defeat all eighteen invaders before they reach the ground.",
    controls: "Move with A/D or the left stick. PRIMARY fires.",
    seal: "Defense",
  },
  {
    id: "courier-beyond-the-charter",
    chapter: "V",
    title: "Courier Beyond the Charter",
    mechanic: "vector courier",
    story: "Carry the final seal through the debris field to the next world. The Charter survives only if it can travel beyond the place that made it.",
    objective: "Destroy eight hazards and keep the courier alive.",
    controls: "Turn with A/D or the left stick, thrust with W/up, and fire with PRIMARY.",
    seal: "Portability",
  },
] as const;

export const CLASSIC_TRIAL_BY_ID = new Map(
  CLASSIC_TRIALS.map((trial) => [trial.id, trial] as const),
);
