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
    <form onSubmit={submit} className="border-t border-black/10 bg-white px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-end gap-2">
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
          className="max-h-28 min-h-[42px] flex-1 resize-none rounded-xl border border-black/15 bg-white px-3 py-2.5 text-[15px] text-[var(--kitto-ink)] placeholder:text-zinc-500 focus:border-[var(--kitto-violet)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Send"
          className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-[var(--kitto-violet)] text-white transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kitto-violet)] disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
      <div className="mt-1 flex justify-between gap-3 text-[11px] leading-tight text-zinc-500">
        {showPrivacy ? (
          <span>
            Kitto is an AI. Chats are saved to improve Kitto. Don&apos;t share passwords or sensitive personal info.{" "}
            <a href="/privacy" className="underline">
              Privacy policy
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
