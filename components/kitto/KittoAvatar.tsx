"use client";

import { useEffect, useState } from "react";
import type { Mood } from "@/lib/kitto/moods";

// Kitto, built from the black-cat kit rig (design/kitto-kit/black_cat_fullbody_rig.svg).
// Same layer names as the rig, so it maps 1:1 to the future kitto.riv. CSS drives
// the idle loop, blink, thinking, talking and mood-change animations.

type Face = "default" | "neutral" | "look_right" | "sleepy" | "gold" | "happy" | "blink";

const MOOD_FACE: Record<Mood, Face> = {
  curious: "default",
  helpful: "neutral",
  unimpressed: "sleepy",
  fluff_cutter: "gold",
  happy: "happy",
};

// Crops of the 500 x 800 artboard.
const VIEWBOX = {
  full: "0 0 500 800",
  bust: "40 0 420 460",
  head: "112 0 276 330",
} as const;

const INK = "#0B0B0B";
const WHITE = "#FFFFFF";

function RoundEyes({ px, py, rx, ry }: { px: number; py: number; rx: number; ry: number }) {
  return (
    <>
      <ellipse cx="200" cy="200" rx="34" ry="39" fill={WHITE} transform="rotate(-6 200 200)" />
      <ellipse cx={200 + px} cy={200 + py} rx={rx} ry={ry} fill={INK} />
      <ellipse cx="300" cy="200" rx="34" ry="39" fill={WHITE} transform="rotate(6 300 200)" />
      <ellipse cx={300 + px} cy={200 + py} rx={rx} ry={ry} fill={INK} />
    </>
  );
}

function Eyes({ face }: { face: Face }) {
  switch (face) {
    case "default":
      return <RoundEyes px={-12} py={0} rx={10} ry={12} />;
    case "neutral":
      return <RoundEyes px={0} py={2} rx={9} ry={11} />;
    case "look_right":
      return <RoundEyes px={12} py={-6} rx={10} ry={12} />;
    case "sleepy":
      return (
        <>
          <RoundEyes px={0} py={14} rx={11} ry={13} />
          <path d="M160,155 H240 V202 L160,198 Z" fill={INK} />
          <path d="M260,155 H340 V198 L260,202 Z" fill={INK} />
        </>
      );
    case "gold":
      return (
        <>
          <circle cx="200" cy="200" r="31" fill={INK} stroke="#D9A21E" strokeWidth="7" />
          <circle cx="211" cy="190" r="6" fill={WHITE} />
          <circle cx="300" cy="200" r="31" fill={INK} stroke="#D9A21E" strokeWidth="7" />
          <circle cx="311" cy="190" r="6" fill={WHITE} />
        </>
      );
    case "happy":
      return (
        <g fill="none" stroke={WHITE} strokeWidth="8" strokeLinecap="round">
          <path d="M178,208 Q200,180 222,208" />
          <path d="M278,208 Q300,180 322,208" />
        </g>
      );
    case "blink":
      return <path d="M176,204 H224 M276,204 H324" stroke={WHITE} strokeWidth="6" strokeLinecap="round" />;
  }
}

/** The fluff-cutter prop: a red pen held in the mouth (PRD: never the kit's knife). */
function RedPen() {
  return (
    <g className="kitto-prop" transform="rotate(-3 250 268)">
      {/* nib */}
      <path d="M418,256 L460,268 L418,280 Z" fill="#F3E3C3" stroke="#1A1A1A" strokeWidth="3" strokeLinejoin="round" />
      <path d="M448,265 L460,268 L448,271 Z" fill="#D7263D" />
      {/* barrel */}
      <rect x="196" y="250" width="226" height="36" rx="10" fill="#D7263D" stroke="#1A1A1A" strokeWidth="3" />
      <path d="M214,260 H404" stroke="#F06A7A" strokeWidth="4" strokeLinecap="round" />
      {/* cap end + clip */}
      <rect x="128" y="248" width="78" height="40" rx="10" fill="#8E1526" stroke="#1A1A1A" strokeWidth="3" />
      <rect x="150" y="240" width="46" height="9" rx="4" fill="#C9CDD2" stroke="#1A1A1A" strokeWidth="2.5" />
    </g>
  );
}

interface Props {
  mood: Mood;
  thinking?: boolean;
  talking?: boolean;
  waving?: boolean;
  crop?: keyof typeof VIEWBOX;
  className?: string;
}

export default function KittoAvatar({ mood, thinking = false, talking = false, waving = false, crop = "bust", className }: Props) {
  const [blinking, setBlinking] = useState(false);

  // Blink every 3–6 s (PRD section 7), unless the visitor prefers reduced motion.
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setBlinking(true);
        timer = setTimeout(() => {
          setBlinking(false);
          schedule();
        }, 180);
      }, 3000 + Math.random() * 3000);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  let face: Face = thinking ? "look_right" : MOOD_FACE[mood];
  // Closed-eye faces don't blink.
  if (blinking && face !== "happy" && face !== "sleepy") face = "blink";

  const state = [thinking && "is-thinking", talking && "is-talking", waving && "is-waving", `mood-${mood}`]
    .filter(Boolean)
    .join(" ");

  return (
    <svg viewBox={VIEWBOX[crop]} className={`kitto-cat ${state} ${className ?? ""}`} aria-hidden="true" focusable="false">
      <g className="kitto-shadow">
        <ellipse cx="255" cy="768" rx="165" ry="13" fill="#000" opacity="0.18" />
      </g>
      <g transform="translate(0,20)">
        <g className="kitto-root-group">
          <g className="kitto-tail">
            <path d="M352,712 C430,722 455,660 432,604 C422,578 398,586 406,604" fill="none" stroke={INK} strokeWidth="26" strokeLinecap="round" />
          </g>
          <g className="kitto-body">
            <g fill={INK}>
              <ellipse cx="168" cy="672" rx="58" ry="74" />
              <ellipse cx="332" cy="672" rx="58" ry="74" />
            </g>
            <path
              d="M200,288 C196,345 168,400 152,470 C134,550 124,640 136,700 C146,738 200,746 250,746 C300,746 354,738 364,700 C376,640 366,550 348,470 C332,400 304,345 300,288 Z"
              fill={INK}
            />
            <path
              d="M250,600 L250,728 M206,610 C196,660 200,700 210,730 M294,610 C304,660 300,700 290,730"
              fill="none"
              stroke="#262626"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
          <g className="kitto-leg-r">
            <path d="M254,470 C254,590 256,670 257,732 L285,732 C286,670 288,590 288,470 Z" fill={INK} />
            <ellipse cx="271" cy="736" rx="22" ry="12" fill={INK} stroke="#262626" strokeWidth="2.5" />
          </g>
          <g className="kitto-leg-l">
            <path d="M212,470 C212,590 214,670 215,732 L243,732 C244,670 246,590 246,470 Z" fill={INK} />
            <ellipse cx="229" cy="736" rx="22" ry="12" fill={INK} stroke="#262626" strokeWidth="2.5" />
          </g>
          <g className="kitto-head">
            <path
              d="M250,108 C278,108 296,96 306,78 L338,20 C354,58 368,110 373,155 C388,202 383,262 346,296 C322,318 282,324 250,324 C218,324 178,318 154,296 C117,262 112,202 127,155 C132,110 146,58 162,20 L194,78 C204,96 222,108 250,108 Z"
              fill={INK}
            />
            <g className="kitto-whiskers" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round">
              <path d="M170,238 Q110,226 58,222" />
              <path d="M170,250 Q108,248 54,252" />
              <path d="M170,262 Q114,270 66,284" />
              <path d="M330,238 Q390,226 442,222" />
              <path d="M330,250 Q392,248 446,252" />
              <path d="M330,262 Q386,270 434,284" />
            </g>
            <g className="kitto-eyes">
              <Eyes face={face} />
            </g>
            <ellipse cx="250" cy="247" rx="6" ry="3.5" fill={WHITE} />
            {mood === "fluff_cutter" && !thinking && <RedPen />}
          </g>
        </g>
      </g>
    </svg>
  );
}
