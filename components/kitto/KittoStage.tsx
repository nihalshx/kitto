"use client";

import { useMemo } from "react";
import type { Action, Expression } from "@/lib/kitto/expressions";
import { STAGE_BACKGROUND } from "@/lib/kitto/moods";
import KittoAvatar, { type LookTarget } from "./KittoAvatar";

const CONFETTI_COLORS = ["#F7D64A", "#B9AEE6", "#E5A0A7", "#ffffff", "#9FB08A", "#6d4fe0"];

// Deterministic per burst so re-renders don't reshuffle the pieces.
function confettiPieces(seed: number) {
  let x = seed % 233280;
  const rnd = () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
  return Array.from({ length: 18 }, (_, i) => ({
    dx: `${Math.round((rnd() - 0.5) * 320)}px`,
    dy: `${Math.round(-60 - rnd() * 120)}px`,
    rot: `${Math.round(rnd() * 720 - 360)}deg`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    w: 6 + Math.round(rnd() * 5),
  }));
}

function Confetti({ seed }: { seed: number }) {
  const pieces = useMemo(() => confettiPieces(seed), [seed]);
  return (
    <div className="kitto-confetti pointer-events-none absolute bottom-16 left-1/2" aria-hidden="true">
      {pieces.map((p, i) => (
        <i
          key={i}
          className="absolute block rounded-[2px] opacity-0"
          style={
            {
              width: p.w,
              height: p.w * 0.6,
              background: p.color,
              "--dx": p.dx,
              "--dy": p.dy,
              "--rot": p.rot,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export interface StageProps {
  background: string;
  expression: Expression;
  talking: boolean;
  action: { name: Action; id: number } | null;
  lookAt: LookTarget | null;
  trackPointer: boolean;
  fidget: boolean;
  popKey: number;
  bubble: { text: string; id: number } | null;
  score: number | null;
  confetti: number | null;
  hint: boolean;
  onTap: () => void;
  onPet: () => void;
}

export default function KittoStage(props: StageProps) {
  const { background, bubble, score, confetti, hint, popKey, onTap, ...avatar } = props;
  return (
    <div
      onClick={onTap}
      className="kitto-stage relative flex h-[120px] shrink-0 cursor-pointer select-none justify-center overflow-hidden sm:h-[180px]"
      style={{ backgroundColor: STAGE_BACKGROUND }}
    >
      {/* Mood-tinted circle behind Kitto, as on the character sheet */}
      <div
        className="kitto-blob pointer-events-none absolute top-3 h-[150px] w-[150px] rounded-full sm:top-4 sm:h-[220px] sm:w-[220px]"
        style={{ backgroundColor: background }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute -bottom-2 h-4 w-[120px] rounded-[50%] bg-[#DDD7F2]/70 blur-[2px] sm:w-[170px]" aria-hidden="true" />

      <div key={popKey} className="kitto-pop absolute -bottom-1 h-[124px] w-[116px] sm:h-[186px] sm:w-[174px]">
        <KittoAvatar {...avatar} crop="bust" className="h-full w-full" />
      </div>

      {bubble && (
        <div
          key={bubble.id}
          className="kitto-bubble-pop pointer-events-none absolute top-3 left-[calc(50%+52px)] rounded-2xl rounded-bl-sm bg-white px-3 py-1.5 text-[13px] font-semibold text-[var(--kitto-ink)] shadow-md ring-1 ring-black/5 sm:left-[calc(50%+76px)] sm:top-6"
          aria-hidden="true"
        >
          {bubble.text}
        </div>
      )}

      {score !== null && (
        <div
          key={`score-${score}-${popKey}`}
          className="kitto-stamp pointer-events-none absolute top-3 left-4 grid h-16 w-16 rotate-[-8deg] place-items-center rounded-full border-[3px] border-[var(--kitto-violet)] bg-white text-[var(--kitto-violet)] shadow-md sm:top-5 sm:h-20 sm:w-20"
          aria-hidden="true"
        >
          <span className="text-center leading-none">
            <span className="block text-2xl font-black sm:text-3xl">{score}</span>
            <span className="text-[10px] font-bold tracking-widest">/ 10</span>
          </span>
        </div>
      )}

      {confetti !== null && <Confetti key={confetti} seed={confetti} />}

      {hint && (
        <span className="pointer-events-none absolute right-3 bottom-2 rounded-full bg-[#DDD7F2] px-2 py-0.5 text-[11px] font-medium text-[#46416B]">
          tap or pet me
        </span>
      )}
    </div>
  );
}
