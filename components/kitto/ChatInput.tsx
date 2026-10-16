"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";

const MAX = 1000;

export default function ChatInput({
  onSend,
  onTyping,
  disabled,
  showPrivacy,
}: {
  onSend: (text: string) => void;
  /** Called on every keystroke (Kitto watches you type). */
  onTyping?: () => void;
  disabled?: boolean;
  showPrivacy?: boolean;
}) {
  const [value, setValue] = useState("");

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={submit} className="px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-end gap-2 rounded-[26px] bg-white p-1.5 pl-4 shadow-[0_8px_24px_-12px_rgba(27,21,48,0.35)] ring-1 ring-black/[0.06] focus-within:ring-2 focus-within:ring-[var(--kitto-lav)]">
        <label htmlFor="kitto-input" className="sr-only">
          Message Kitto
        </label>
        <textarea
          id="kitto-input"
          rows={1}
          maxLength={MAX}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            onTyping?.();
          }}
          onKeyDown={onKeyDown}
          placeholder="Tell Kitto about your brand…"
          className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent py-2.5 text-[15px] text-[var(--kitto-ink)] placeholder:text-zinc-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Send"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--kitto-ink)] text-white transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kitto-violet)] disabled:bg-zinc-300"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5M6 11l6-6 6 6" />
          </svg>
        </button>
      </div>
      <div className="mt-1.5 flex justify-between gap-3 px-2 text-[11px] leading-tight text-zinc-500">
        {showPrivacy ? (
          <span>
            Kitto is an AI. Chats are saved to improve Kitto. Don&apos;t share passwords or sensitive info.{" "}
            <a href="/privacy" className="underline">
              Privacy
            </a>
          </span>
        ) : (
          <span />
        )}
        {value.length > MAX - 150 && (
          <span className="shrink-0 tabular-nums">
            {value.length}/{MAX}
          </span>
        )}
      </div>
    </form>
  );
}
