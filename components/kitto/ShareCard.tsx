"use client";

import { useEffect, useRef, useState } from "react";

/** Build the share-card URL for a roast (PRD F9). */
export function shareCardUrl(score: number, line: string): string {
  return `/api/share-card?${new URLSearchParams({ score: String(score), line: line.slice(0, 160) })}`;
}

/** Pull a one-line verdict from a roast reply: the first sentence after "N/10." */
export function verdictFrom(reply: string): string {
  const afterScore = reply.replace(/^\s*\d{1,2}\s*\/\s*10\.?\s*/, "");
  const first = afterScore.split(/(?<=[.!?])\s+/)[0] ?? "";
  return first.trim().slice(0, 160);
}

export default function ShareCard({ score, line, onClose }: { score: number; line: string; onClose: () => void }) {
  const url = shareCardUrl(score, line);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [note, setNote] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  async function getFile(): Promise<File> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    return new File([await res.blob()], `kitto-roast-${score}-of-10.png`, { type: "image/png" });
  }

  async function share() {
    try {
      const file = await getFile();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Kitto roasted my bio", text: `Kitto gave my bio a ${score}/10.` });
        return;
      }
      download(file);
      setNote("Sharing isn't supported here, so I downloaded the card instead.");
    } catch (err) {
      if ((err as Error).name !== "AbortError") setNote("Couldn't share that. Try Download.");
    }
  }

  function download(file?: File) {
    const go = (f: File) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(f);
      a.download = f.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
    if (file) go(file);
    else getFile().then(go, () => setNote("Couldn't download the card. Try again?"));
  }

  return (
    <div
      role="dialog"
      aria-label="Share your roast score"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#1b1530]/70 p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex w-full max-w-[300px] flex-col gap-3 rounded-3xl bg-white p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#F8F6F3]">
          {status !== "ready" && (
            <div className="absolute inset-0 grid place-items-center text-sm text-zinc-500">
              {status === "loading" ? "Drawing your card…" : "Couldn't draw the card."}
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element -- dynamic PNG from our own route */}
          <img
            src={url}
            alt={`Share card: Kitto gave this bio ${score} out of 10.`}
            className="h-full w-full object-cover"
            onLoad={() => setStatus("ready")}
            onError={() => setStatus("error")}
          />
        </div>
        {note && <p className="px-1 text-[12px] text-zinc-600">{note}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={share}
            disabled={status !== "ready"}
            className="flex-1 rounded-xl bg-[var(--kitto-violet)] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Share
          </button>
          <button
            type="button"
            onClick={() => download()}
            disabled={status !== "ready"}
            className="flex-1 rounded-xl border border-black/15 py-2.5 text-sm font-semibold text-[var(--kitto-ink)] disabled:opacity-50"
          >
            Download
          </button>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} className="py-1 text-sm text-zinc-600 underline">
          Close
        </button>
      </div>
    </div>
  );
}
