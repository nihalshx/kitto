"use client";

import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import type { Action, Expression, Mouth } from "@/lib/kitto/expressions";
import { RIG_MARKUP, RIG_VIEWBOX } from "./rig.generated";

// Kitto, rendered from the v3 front rig (design/kitto-kit-v3/rigs/kitto_front_rig.svg).
// Layer ids match the rig, so this maps 1:1 to a future kitto.riv state machine.
// Faces swap by toggling layer opacity; body motion is CSS (see globals.css, "Kitto rig").

const CROPS = {
  full: RIG_VIEWBOX,
  bust: "30 18 440 470",
  head: "128 30 244 300",
} as const;

const FIDGETS: Action[] = ["tail_flick", "head_tilt", "ear_twitch", "look_around", "tail_flick", "ear_twitch"];

export interface LookTarget {
  /** -1 (left/up) … 1 (right/down) */
  x: number;
  y: number;
}

interface Props {
  expression: Expression;
  /** Lip-flap while a reply streams in. */
  talking?: boolean;
  /** Plays once each time `action.id` changes. */
  action?: { name: Action; id: number } | null;
  /** Fixed gaze (e.g. down at the input while the visitor types). Otherwise follows the pointer. */
  lookAt?: LookTarget | null;
  trackPointer?: boolean;
  /** Small idle movements every few seconds. */
  fidget?: boolean;
  crop?: keyof typeof CROPS;
  className?: string;
  onTap?: () => void;
  /** Fired when the visitor strokes the cat with the pointer. */
  onPet?: () => void;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function KittoAvatar({
  expression,
  talking = false,
  action = null,
  lookAt = null,
  trackPointer = true,
  fidget = true,
  crop = "bust",
  className,
  onTap,
  onPet,
}: Props) {
  const prefix = `k${useId().replace(/[^a-zA-Z0-9]/g, "")}-`;
  const markup = useMemo(() => RIG_MARKUP.replaceAll("__K__", prefix), [prefix]);
  const svgRef = useRef<SVGSVGElement>(null);
  const [blinking, setBlinking] = useState(false);
  const [flap, setFlap] = useState(false);

  // Restart a CSS one-shot animation class on the svg.
  const play = (name: Action) => {
    const el = svgRef.current;
    if (!el || prefersReducedMotion()) return;
    const cls = `act-${name}`;
    el.classList.remove(cls);
    void el.getBoundingClientRect(); // reflow so the animation restarts
    el.classList.add(cls);
    window.setTimeout(() => el.classList.remove(cls), 1400);
  };

  useEffect(() => {
    if (action) play(action.name);
  }, [action]);

  // Random blink every 3–5 s.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let t: number;
    const loop = () => {
      t = window.setTimeout(() => {
        setBlinking(true);
        t = window.setTimeout(() => {
          setBlinking(false);
          loop();
        }, 160);
      }, 3000 + Math.random() * 2000);
    };
    loop();
    return () => window.clearTimeout(t);
  }, []);

  // Idle fidgets.
  useEffect(() => {
    if (!fidget || talking || prefersReducedMotion()) return;
    const t = window.setInterval(() => play(FIDGETS[Math.floor(Math.random() * FIDGETS.length)]), 5200 + Math.random() * 3000);
    return () => window.clearInterval(t);
  }, [fidget, talking]);

  // Lip-flap while talking.
  useEffect(() => {
    if (!talking || prefersReducedMotion()) return;
    const t = window.setInterval(() => setFlap((f) => !f), 130);
    return () => {
      window.clearInterval(t);
      setFlap(false);
    };
  }, [talking]);

  // Gaze: fixed target, or follow the pointer anywhere on the page.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const setGaze = (x: number, y: number) => {
      el.style.setProperty("--kx", `${(x * 7).toFixed(2)}px`);
      el.style.setProperty("--ky", `${(y * 6).toFixed(2)}px`);
      el.style.setProperty("--khead", `${(x * 4).toFixed(2)}deg`);
    };
    if (lookAt) {
      setGaze(lookAt.x, lookAt.y);
      return;
    }
    if (!trackPointer || prefersReducedMotion()) {
      setGaze(0, 0);
      return;
    }
    let frame = 0;
    const onMove = (e: globalThis.PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height * 0.35;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const d = Math.max(1, Math.hypot(dx, dy));
        const reach = Math.min(1, d / 260);
        setGaze((dx / d) * reach, (dy / d) * reach);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [lookAt, trackPointer]);

  // Petting: enough stroking over the cat within a short window.
  const pet = useRef({ dist: 0, since: 0, last: null as null | { x: number; y: number } });
  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!onPet || e.pointerType === "touch") return;
    const p = pet.current;
    const now = performance.now();
    if (now - p.since > 1500) {
      p.since = now;
      p.dist = 0;
    }
    if (p.last) p.dist += Math.hypot(e.clientX - p.last.x, e.clientY - p.last.y);
    p.last = { x: e.clientX, y: e.clientY };
    if (p.dist > 420) {
      p.dist = -4000; // cool-down until the window resets
      onPet();
    }
  }

  const eyes = blinking && !["happy", "sleepy", "blink", "wink"].includes(expression.eyes) ? "blink" : expression.eyes;
  const mouth: Mouth = talking ? (flap ? "open" : expression.mouth === "frown" ? "frown" : "neutral") : expression.mouth;
  const shown = [`#${prefix}eyes_${eyes}`, `#${prefix}mouth_${mouth}`];
  if (expression.fx) shown.push(`#${prefix}fx_${expression.fx}`);

  return (
    <svg
      ref={svgRef}
      viewBox={CROPS[crop]}
      className={`kitto-cat ${talking ? "is-talking" : ""} ${expression.eyes === "thinking" ? "is-thinking" : ""} ${
        expression.fx === "zzz" ? "is-asleep" : ""
      } ${className ?? ""}`}
      aria-hidden="true"
      focusable="false"
      onPointerMove={onPointerMove}
      onClick={onTap}
    >
      <style>{`${shown.join(",")}{opacity:1}`}</style>
      <g dangerouslySetInnerHTML={{ __html: markup }} />
      {expression.pen && (
        <g className="kitto-pen" transform="rotate(-4 250 300)">
          <path d="M412,288 L450,300 L412,312 Z" fill="#F3E3C3" stroke="#1A1A1A" strokeWidth="3" strokeLinejoin="round" />
          <path d="M440,297 L450,300 L440,303 Z" fill="#D7263D" />
          <rect x="196" y="284" width="218" height="32" rx="10" fill="#D7263D" stroke="#1A1A1A" strokeWidth="3" />
          <path d="M212,293 H398" stroke="#F06A7A" strokeWidth="4" strokeLinecap="round" />
          <rect x="132" y="282" width="72" height="36" rx="10" fill="#8E1526" stroke="#1A1A1A" strokeWidth="3" />
          <rect x="152" y="274" width="44" height="9" rx="4" fill="#C9CDD2" stroke="#1A1A1A" strokeWidth="2.5" />
        </g>
      )}
    </svg>
  );
}
