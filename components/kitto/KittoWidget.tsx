"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getVisitorId, nudgeStorage, sendChat, submitLead, writeStorage } from "@/lib/kitto/client";
import { MOOD_COLORS, type Mode, type Mood } from "@/lib/kitto/moods";
import ChatInput from "./ChatInput";
import ChatMessages, { type ChatMessage } from "./ChatMessages";
import KittoAvatar from "./KittoAvatar";
import LeadForm, { type LeadValues } from "./LeadForm";
import ModeChips from "./ModeChips";

const GREETING =
  "Hey, I'm Kitto, Codifykit's brand buddy. I give ideas, talk through brand problems, and roast bios (lovingly). What are we working on?";

// First-open chips map to modes (PRD F2).
const STARTER_CHIPS: Record<string, Mode> = {
  "Give me ideas": "muse",
  "My brand feels off": "therapy",
  "Roast my bio": "roast",
  "Talk to the team": "team",
};

// Open questions in the PRD: response-time promise and verified helpline.
const RESPONSE_TIME = "24 hours";
const HELPLINE = { name: "Tele-MANAS", number: "14416", note: "free, 24/7, India" };

const NUDGE_DELAY_MS = 8000;

let idCounter = 0;
const newId = () => `m${++idCounter}`;

export default function KittoWidget({ demoMode = false }: { demoMode?: boolean }) {
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: "greeting", role: "assistant", text: GREETING }]);
  const [chips, setChips] = useState<string[]>(Object.keys(STARTER_CHIPS));
  const [mood, setMood] = useState<Mood>("curious");
  const [thinking, setThinking] = useState(false);
  const [talking, setTalking] = useState(false);
  const [mode, setMode] = useState<Mode | undefined>();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [leadForm, setLeadForm] = useState<{ need: string } | null>(null);
  const [leadSent, setLeadSent] = useState(false);
  const [sensitive, setSensitive] = useState(false);
  const [demo, setDemo] = useState(demoMode);
  const [lastFailed, setLastFailed] = useState<string | null>(null);
  const [popKey, setPopKey] = useState(0);

  const visitorRef = useRef<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = thinking || talking;

  // Attention nudge: once per visitor, 8 s after landing.
  useEffect(() => {
    if (nudgeStorage.seen()) return;
    const t = setTimeout(() => {
      setNudge(true);
      nudgeStorage.markSeen();
    }, NUDGE_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // Escape closes the panel; focus moves into the panel on open and back on close.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLTextAreaElement>("#kitto-input")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Keep the newest message, chips and lead form in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, messages, chips, leadForm, thinking, sensitive, lastFailed]);

  const changeMood = useCallback((next: Mood) => {
    setMood((prev) => {
      if (prev !== next) setPopKey((k) => k + 1);
      return next;
    });
  }, []);

  const send = useCallback(
    async (text: string, pickedMode?: Mode) => {
      if (busy) return;
      setChips([]);
      setLastFailed(null);
      setLeadForm(null);
      const requestMode = pickedMode ?? mode;
      if (pickedMode) setMode(pickedMode);

      const replyId = newId();
      setMessages((m) => [...m, { id: newId(), role: "user", text }]);
      setThinking(true);

      try {
        visitorRef.current ??= await getVisitorId();
        let started = false;
        const onText = (chunk: string) => {
          if (!started) {
            started = true;
            setThinking(false);
            setTalking(true);
            setMessages((m) => [...m, { id: replyId, role: "assistant", text: chunk }]);
          } else {
            setMessages((m) => m.map((x) => (x.id === replyId ? { ...x, text: x.text + chunk } : x)));
          }
        };

        let result = await sendChat({ visitorId: visitorRef.current, conversationId, mode: requestMode, message: text }, onText);

        // Stale visitor or conversation (e.g. the dev store restarted): start fresh once.
        if (result.kind === "unknown_visitor" || result.kind === "unknown_conversation") {
          if (result.kind === "unknown_visitor") {
            writeStorage("kitto.visitorId", null);
            visitorRef.current = await getVisitorId(true);
          }
          setConversationId(undefined);
          result = await sendChat({ visitorId: visitorRef.current, mode: requestMode, message: text }, onText);
        }

        if (result.kind === "ok") {
          const { meta } = result;
          setConversationId(meta.conversationId);
          setDemo(Boolean(meta.demo));
          changeMood(meta.mood);
          if (meta.mode && meta.mode !== "general") setMode(meta.mode);
          if (meta.intent === "sensitive") setSensitive(true);
          const hideChips = sensitive || meta.intent === "sensitive";
          setChips(hideChips ? [] : meta.chips);
          if (meta.intent === "lead" && !leadSent) {
            // Pre-fill "what you need" with the message that triggered the offer, unless it was a chip.
            setLeadForm({ need: text in STARTER_CHIPS ? "" : text });
          }
        } else if (result.kind === "rate_limited") {
          setMessages((m) => [...m.filter((x) => x.id !== replyId), { id: replyId, role: "assistant", text: result.message }]);
          changeMood("helpful");
          if (!leadSent) setLeadForm({ need: "" });
        } else {
          const message = result.kind === "error" ? result.message : "Hairball moment. Try that again?";
          // Replace any partial reply with the fallback line.
          setMessages((m) => [...m.filter((x) => x.id !== replyId), { id: replyId, role: "assistant", text: message, error: true }]);
          setLastFailed(text);
        }
      } catch {
        setMessages((m) => [
          ...m.filter((x) => x.id !== replyId),
          { id: replyId, role: "assistant", text: "Hairball moment. Try that again?", error: true },
        ]);
        setLastFailed(text);
      } finally {
        setThinking(false);
        setTalking(false);
      }
    },
    [busy, mode, conversationId, sensitive, leadSent, changeMood],
  );

  function retry() {
    if (!lastFailed) return;
    const text = lastFailed;
    // Drop the failed exchange before resending.
    setMessages((m) => m.slice(0, -2));
    send(text);
  }

  function pickChip(chip: string) {
    send(chip, STARTER_CHIPS[chip]);
  }

  async function onLead(values: LeadValues): Promise<string | null> {
    if (!visitorRef.current || !conversationId) return "Say hi to Kitto first, then try again.";
    const res = await submitLead({ visitorId: visitorRef.current, conversationId, ...values });
    if (!res.ok) return res.error;
    setLeadForm(null);
    setLeadSent(true);
    changeMood("happy");
    setMessages((m) => [
      ...m,
      {
        id: newId(),
        role: "assistant",
        text: `Okay, that's actually good. Got your details, ${values.name.split(" ")[0]}. My humans will reply within ${RESPONSE_TIME}.`,
      },
    ]);
    setChips([]);
    return null;
  }

  const bg = MOOD_COLORS[mood];

  return (
    <div className="kitto-root">
      {/* Launcher */}
      {!open && (
        <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-3">
          {nudge && (
            <button
              type="button"
              onClick={() => {
                setNudge(false);
                setOpen(true);
              }}
              className="kitto-nudge relative max-w-[220px] rounded-2xl rounded-br-sm bg-white px-4 py-2.5 text-left text-sm font-medium text-[var(--kitto-ink)] shadow-lg ring-1 ring-black/5"
            >
              Psst. Want me to roast your bio?
            </button>
          )}
          <button
            ref={launcherRef}
            type="button"
            onClick={() => {
              setNudge(false);
              setOpen(true);
            }}
            aria-label="Chat with Kitto"
            className={`kitto-launcher grid h-16 w-16 place-items-center overflow-hidden rounded-full shadow-xl ring-2 ring-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--kitto-violet)] ${nudge ? "kitto-wave" : ""}`}
            style={{ background: "var(--kitto-gradient)" }}
          >
            <KittoAvatar mood="curious" className="mt-3 h-16 w-16" />
          </button>
        </div>
      )}

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Chat with Kitto"
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white sm:inset-auto sm:right-6 sm:bottom-6 sm:h-[640px] sm:max-h-[calc(100vh-3rem)] sm:w-[400px] sm:rounded-3xl sm:shadow-2xl sm:ring-1 sm:ring-black/10"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-2.5 text-white" style={{ background: "var(--kitto-gradient)" }}>
            <span className="text-[17px] font-semibold tracking-tight">Kitto</span>
            <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[11px] font-bold tracking-wide">AI</span>
            {demo && <span className="rounded-md bg-amber-300 px-1.5 py-0.5 text-[11px] font-bold text-amber-950">DEMO</span>}
            <span className="ml-1 truncate text-[12px] text-white/70">brand buddy by Codifykit</span>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTimeout(() => launcherRef.current?.focus(), 0);
              }}
              aria-label="Close chat"
              className="ml-auto grid h-8 w-8 place-items-center rounded-full hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {/* Avatar stage */}
          <div className="kitto-stage relative grid h-[120px] shrink-0 place-items-center sm:h-[180px]" style={{ backgroundColor: bg }}>
            <div className="kitto-grain pointer-events-none absolute inset-0" aria-hidden="true" />
            <div key={popKey} className="kitto-pop relative h-[110px] w-[110px] sm:h-[160px] sm:w-[160px]">
              <KittoAvatar mood={mood} thinking={thinking} talking={talking} className="h-full w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)]" />
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="kitto-scroll min-h-0 flex-1 overflow-y-auto bg-[#faf9f7]">
            <ChatMessages messages={messages} thinking={thinking} />
            {sensitive && (
              <div className="mx-4 mb-3 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-[14px] text-sky-950">
                <p className="font-semibold">You don&apos;t have to handle this alone.</p>
                <p className="mt-1">
                  Call {HELPLINE.name} on{" "}
                  <a className="font-semibold underline" href={`tel:${HELPLINE.number}`}>
                    {HELPLINE.number}
                  </a>{" "}
                  ({HELPLINE.note}), or contact local emergency services if you&apos;re in danger.
                </p>
              </div>
            )}
            {lastFailed && !busy && (
              <div className="px-4 pb-2">
                <button type="button" onClick={retry} className="rounded-full bg-[var(--kitto-ink)] px-3 py-1.5 text-sm font-medium text-white">
                  Try again
                </button>
              </div>
            )}
            {leadForm && <LeadForm initialNeed={leadForm.need} onSubmit={onLead} />}
            <ModeChips chips={chips} onPick={pickChip} disabled={busy} />
          </div>

          <ChatInput onSend={(t) => send(t)} disabled={busy} showPrivacy={!conversationId} />
        </div>
      )}
    </div>
  );
}
