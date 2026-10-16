"use client";

import type { ReactNode } from "react";
import KittoFace from "./KittoFace";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  pending?: boolean;
  error?: boolean;
}

// Tiny formatter for Kitto's replies: paragraphs, numbered lists and the
// markdown tables used for content plans. Everything renders as text (no HTML injection).
function renderText(text: string): ReactNode[] {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      out.push(
        <table key={`t${i}`} className="my-1 w-full border-collapse text-left text-[13px]">
          <thead>
            <tr>{head.map((c, j) => <th key={j} className="border-b border-black/15 py-1 pr-2 font-semibold">{c}</th>)}</tr>
          </thead>
          <tbody>
            {body.map((r, k) => (
              <tr key={k}>{r.map((c, j) => <td key={j} className="border-b border-black/5 py-1 pr-2 align-top">{c}</td>)}</tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }
    out.push(
      <span key={`l${i}`} className="block min-h-[0.6em]">
        {lines[i]}
      </span>,
    );
    i++;
  }
  return out;
}

export default function ChatMessages({ messages, thinking }: { messages: ChatMessage[]; thinking: boolean }) {
  return (
    <div className="flex flex-col gap-1.5 px-4 pt-4 pb-3" role="log" aria-live="polite" aria-relevant="additions">
      {messages.map((m, i) => {
        if (m.role === "user") {
          return (
            <div
              key={m.id}
              className="mt-1.5 max-w-[80%] self-end whitespace-pre-wrap break-words rounded-[20px] rounded-br-md bg-[var(--kitto-deep)] px-4 py-2.5 text-[15px] leading-snug text-white shadow-[0_6px_16px_-8px_rgba(70,65,107,0.7)]"
            >
              {m.text}
            </div>
          );
        }
        // Show Kitto's face on the first message of each run of her messages.
        const first = i === 0 || messages[i - 1].role !== "assistant";
        return (
          <div key={m.id} className={`flex items-end gap-2 ${first ? "mt-1.5" : ""}`}>
            {first ? <KittoFace /> : <span className="w-9 shrink-0" aria-hidden="true" />}
            <div
              className={`max-w-[84%] break-words rounded-[20px] px-4 py-2.5 text-[15px] leading-snug ${first ? "rounded-bl-md" : ""} ${
                m.error
                  ? "bg-rose-50 text-rose-900 ring-1 ring-rose-200"
                  : "bg-white text-[var(--kitto-ink)] shadow-[0_4px_14px_-8px_rgba(27,21,48,0.25)] ring-1 ring-black/[0.04]"
              }`}
            >
              {renderText(m.text)}
            </div>
          </div>
        );
      })}
      {thinking && (
        <div className="mt-1.5 flex items-end gap-2">
          <KittoFace />
          <div className="rounded-[20px] rounded-bl-md bg-white px-4 py-3.5 ring-1 ring-black/[0.04]" aria-label="Kitto is thinking">
            <span className="kitto-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
