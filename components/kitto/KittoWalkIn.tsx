"use client";

import { useEffect, useRef } from "react";

// Kitto walks along the bottom of the page to the chat button, using the
// 12-frame side-view walk cycle from the kit (public/kitto/walk/).
const FRAMES = Array.from({ length: 12 }, (_, i) => `/kitto/walk/walk_${String(i + 1).padStart(2, "0")}.svg`);
const FRAME_MS = 80;
const SPEED_PX_PER_S = 260;
const SIZE = 150; // rendered height in px (frames are 640 x 560)

export default function KittoWalkIn({ onArrive, from = "edge" }: { onArrive: () => void; from?: "edge" | "near" }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const arriveRef = useRef(onArrive);

  useEffect(() => {
    arriveRef.current = onArrive;
  }, [onArrive]);

  useEffect(() => {
    // Preload so the flip-book doesn't flicker.
    for (const src of FRAMES) new Image().src = src;

    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return;

    const width = (SIZE * 640) / 560;
    const end = window.innerWidth - 24 - 64 - width * 0.55; // stop just left of the launcher
    // "near": a short stroll (page changes); "edge": all the way from the left (first visit).
    const start = from === "near" ? Math.max(-width, end - 380) : -width;
    const duration = ((end - start) / SPEED_PX_PER_S) * 1000;
    const t0 = performance.now();
    let frame = 0;
    let raf = 0;
    let lastFlip = t0;

    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      wrap.style.transform = `translateX(${start + (end - start) * p}px)`;
      if (now - lastFlip >= FRAME_MS) {
        frame = (frame + 1) % FRAMES.length;
        img.src = FRAMES[frame];
        lastFlip = now;
      }
      if (p < 1) raf = requestAnimationFrame(step);
      else arriveRef.current();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from]);

  return (
    <div ref={wrapRef} className="pointer-events-none fixed bottom-2 left-0 z-40" style={{ transform: "translateX(-200px)" }} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- flip-book frames swapped imperatively */}
      <img ref={imgRef} src={FRAMES[0]} alt="" width={(SIZE * 640) / 560} height={SIZE} draggable={false} />
    </div>
  );
}
