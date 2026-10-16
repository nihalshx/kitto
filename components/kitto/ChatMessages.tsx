"use client";

import type { ReactNode } from "react";

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
    <div className="flex flex-col gap-2 px-4 py-3" role="log" aria-live="polite" aria-relevant="additions">
      {messages.map((m) =>
        m.role === "user" ? (
          <div key={m.id} className="max-w-[85%] self-end whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-[var(--kitto-ink)] px-3.5 py-2 text-[15px] leading-snug text-white">
            {m.text}
          </div>
        ) : (
          <div
            key={m.id}
            className={`max-w-[90%] self-start break-words rounded-2xl rounded-bl-md px-3.5 py-2 text-[15px] leading-snug ${
              m.error ? "bg-red-50 text-red-900" : "bg-[var(--kitto-bubble)] text-[var(--kitto-ink)]"
            }`}
          >
            {renderText(m.text)}
          </div>
        ),
      )}
      {thinking && (
        <div className="self-start rounded-2xl rounded-bl-md bg-[var(--kitto-bubble)] px-4 py-3" aria-label="Kitto is thinking">
          <span className="kitto-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
      )}
    </div>
  );
}
