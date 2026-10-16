// Small round Kitto face for chat bubbles (head crop of a kit emotion still).
export default function KittoFace({ className = "" }: { className?: string }) {
  return (
    <span className={`relative block h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[var(--kitto-lav)] ring-2 ring-white ${className}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- static kit SVG */}
      <img src="/kitto/card/kitto_curious.svg" alt="" className="absolute top-[-1px] left-1/2 h-[104px] w-auto max-w-none -translate-x-1/2" />
    </span>
  );
}
