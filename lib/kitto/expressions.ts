import type { Mood } from "./moods";

// Faces available in the Kitto v3 rig (design/kitto-kit-v3/RIVE_SETUP.md).
export type Eyes =
  | "curious" | "happy" | "focused" | "sleepy" | "excited" | "surprised" | "thinking"
  | "grumpy" | "sad" | "look_left" | "look_right" | "wink" | "blink";
export type Mouth = "neutral" | "smile" | "open" | "o" | "frown" | "flat";
export type Fx = "marks" | "sparkle" | "zzz" | "dots";

export interface Expression {
  eyes: Eyes;
  mouth: Mouth;
  fx?: Fx;
  /** The fluff-cutter prop (PRD: a red pen, never a knife). */
  pen?: boolean;
}

/** One-shot body animations (rig timelines). */
export type Action = "hop" | "wave" | "tail_flick" | "head_tilt" | "ear_twitch" | "look_around" | "shake";

/** How each AI mood shows on Kitto's face. */
export const MOOD_EXPRESSION: Record<Mood, Expression> = {
  curious: { eyes: "curious", mouth: "neutral" },
  helpful: { eyes: "curious", mouth: "smile" },
  unimpressed: { eyes: "sleepy", mouth: "flat" },
  fluff_cutter: { eyes: "focused", mouth: "flat", pen: true },
  happy: { eyes: "happy", mouth: "smile", fx: "sparkle" },
};

/** A body action to play when the mood changes to this one. */
export const MOOD_ACTION: Partial<Record<Mood, Action>> = {
  happy: "hop",
  unimpressed: "tail_flick",
  fluff_cutter: "head_tilt",
};

export const EXPRESSIONS = {
  thinking: { eyes: "thinking", mouth: "flat", fx: "dots" },
  asleep: { eyes: "sleepy", mouth: "flat", fx: "zzz" },
  surprised: { eyes: "surprised", mouth: "o", fx: "marks" },
  purr: { eyes: "happy", mouth: "smile", fx: "sparkle" },
  excited: { eyes: "excited", mouth: "open", fx: "sparkle" },
  sad: { eyes: "sad", mouth: "frown" },
  gentle: { eyes: "sad", mouth: "neutral" },
  wink: { eyes: "wink", mouth: "smile" },
  grumpy: { eyes: "grumpy", mouth: "frown", fx: "marks" },
} satisfies Record<string, Expression>;
