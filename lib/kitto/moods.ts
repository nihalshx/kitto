// Mood ids, background colours and Rive state-machine numbers (PRD sections 2 and 7).

export const MOODS = ["curious", "helpful", "unimpressed", "fluff_cutter", "happy"] as const;
export type Mood = (typeof MOODS)[number];

export const MODES = ["muse", "therapy", "roast", "team", "general"] as const;
export type Mode = (typeof MODES)[number];

export const INTENTS = ["none", "lead", "sensitive"] as const;
export type Intent = (typeof INTENTS)[number];

// Stage styling follows the v3 character sheet: off-white backdrop with a soft
// circle behind Kitto. The circle's tint carries the mood.
export const STAGE_BACKGROUND = "#F8F6F3";
export const MOOD_COLORS: Record<Mood, string> = {
  curious: "#DDD7F2", // kit lavender
  helpful: "#D9E6CF", // soft sage
  unimpressed: "#F2D2D6", // soft rose
  fluff_cutter: "#F8E7A6", // butter yellow
  happy: "#E4D9FB", // bright lavender
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
