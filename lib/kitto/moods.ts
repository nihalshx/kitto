// Mood ids, background colours and Rive state-machine numbers (PRD sections 2 and 7).

export const MOODS = ["curious", "helpful", "unimpressed", "fluff_cutter", "happy"] as const;
export type Mood = (typeof MOODS)[number];

export const MODES = ["muse", "therapy", "roast", "team", "general"] as const;
export type Mode = (typeof MODES)[number];

export const INTENTS = ["none", "lead", "sensitive"] as const;
export type Intent = (typeof INTENTS)[number];

export const MOOD_COLORS: Record<Mood, string> = {
  curious: "#4A5A8C",
  helpful: "#A3B48A",
  unimpressed: "#A3313A",
  fluff_cutter: "#F2CF4A",
  happy: "#B9A8E8",
};

/** Value for the `mood` Number input on the KittoSM Rive state machine. */
export const MOOD_RIVE_NUMBER: Record<Mood, number> = {
  curious: 0,
  helpful: 1,
  unimpressed: 2,
  fluff_cutter: 3,
  happy: 4,
};

export const DEFAULT_MOOD: Mood = "helpful";
