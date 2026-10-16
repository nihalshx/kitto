"use client";

import { useEffect, useRef } from "react";

// Side-view jump from the kit (public/kitto/jump/), played as a flip-book
// across the stage: anticipate → launch → air → peak → reach → land.
const KEYS = [
  { src: "/kitto/jump/jump_1_anticipate.svg", at: 0, x: -70, y: 0 },
  { src: "/kitto/jump/jump_2_launch.svg", at: 160, x: -55, y: -10 },
  { src: "/kitto/jump/jump_3_air.svg", at: 330, x: -20, y: -32 },
  { src: "/kitto/jump/jump_4_peak.svg", at: 500, x: 10, y: -38 },
  { src: "/kitto/jump/jump_5_reach.svg", at: 680, x: 40, y: -18 },
  { src: "/kitto/jump/jump_6_land.svg", at: 860, x: 60, y: 0 },
];
export const JUMP_MS = 1200;

export default function KittoJump({ onDone }: { onDone: () => void }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    for (const k of KEYS) new Image().src = k.src;
    const img = imgRef.current;
    if (!img) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = now - t0;
      // current and next key for smooth position between frames
      let i = KEYS.length - 1;
      while (i > 0 && KEYS[i].at > t) i--;
      const a = KEYS[i];
      const b = KEYS[Math.min(i + 1, KEYS.length - 1)];
      const p = b === a ? 0 : Math.min(1, (t - a.at) / (b.at - a.at));
      if (!img.src.endsWith(a.src)) img.src = a.src;
      img.style.transform = `translate(${a.x + (b.x - a.x) * p}px, ${a.y + (b.y - a.y) * p}px)`;
      if (t < JUMP_MS) raf = requestAnimationFrame(step);
      else doneRef.current();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- flip-book frames swapped imperatively
    <img
      ref={imgRef}
      src={KEYS[0].src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="pointer-events-none absolute bottom-0 h-[110px] w-auto sm:h-[160px]"
    />
  );
}
