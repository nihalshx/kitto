"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getVisitorId, nudgeStorage, readStorage, sendChat, submitLead, writeStorage } from "@/lib/kitto/client";
import { EXPRESSIONS, MOOD_ACTION, MOOD_EXPRESSION, type Action, type Expression } from "@/lib/kitto/expressions";
import { MOOD_COLORS, type Mode, type Mood } from "@/lib/kitto/moods";
import { playSound, setSoundEnabled, soundEnabled, type Sound } from "@/lib/kitto/sound";
import ChatInput from "./ChatInput";
import ChatMessages, { type ChatMessage } from "./ChatMessages";
import KittoAvatar, { type LookTarget } from "./KittoAvatar";
import KittoStage from "./KittoStage";
import KittoWalkIn from "./KittoWalkIn";
import LeadForm, { type LeadValues } from "./LeadForm";
import ModeChips from "./ModeChips";
import ShareCard, { verdictFrom } from "./ShareCard";

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
const NAP_AFTER_MS = 25_000; // panel open, nothing happening
const LAUNCHER_NAP_AFTER_MS = 40_000;
const HINT_KEY = "kitto.petHintDone";

// Playful reactions (local, no AI call).
type ReactionKind = "tap" | "pet" | "wake" | "hello" | "celebrate" | "back";
const REACTIONS: Record<ReactionKind, { expr: Expression; action: Action; lines: string[]; ms: number }[]> = {
  tap: [
    { expr: EXPRESSIONS.excited, action: "hop", lines: ["mrrp!", "boop!", "hehe"], ms: 1300 },
    { expr: EXPRESSIONS.wink, action: "head_tilt", lines: ["😼", "hi again", "yes?"], ms: 1300 },
    { expr: EXPRESSIONS.surprised, action: "ear_twitch", lines: ["hey!", "!!", "whoa"], ms: 1100 },
  ],
  pet: [{ expr: EXPRESSIONS.purr, action: "head_tilt", lines: ["purrrr…", "prrrrr ♡", "more please"], ms: 2000 }],
  wake: [{ expr: EXPRESSIONS.surprised, action: "shake", lines: ["huh? I'm up!", "wasn't sleeping", "…5 more mins"], ms: 1400 }],
  hello: [{ expr: EXPRESSIONS.purr, action: "wave", lines: ["hi!", "hello!", "oh hey!"], ms: 1400 }],
  celebrate: [{ expr: EXPRESSIONS.excited, action: "hop", lines: ["yay!", "woohoo!", "purr-fect"], ms: 1800 }],
  back: [{ expr: EXPRESSIONS.excited, action: "hop", lines: ["oh, you're back!", "missed you!", "welcome back!"], ms: 1800 }],
};
const REACTION_SOUND: Record<ReactionKind, Sound> = {
  tap: "mrrp",
  pet: "purr",
  wake: "wake",
  hello: "hello",
  celebrate: "celebrate",
  back: "back",
};
const AWAY_TITLE = "Kitto misses you 😿";
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

// Tap Kitto lots of times quickly for a secret.
const SECRET_TAPS = 6;
const SECRETS = [
  "Okay, okay, you found my secret: the best bio fits in one breath. Read yours out loud. If you run out of air, cut it.",
  "Secret unlocked: posting 3 times a week for 3 months beats posting 3 times a day for 3 days. Cats know about naps.",
  "Fine, a secret: your customers don't read your 'About us'. They read the first line of every post. Make it count.",
];

let idCounter = 0;
const newId = () => `m${++idCounter}`;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function KittoWidget({ demoMode = false }: { demoMode?: boolean }) {
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [walking, setWalking] = useState<"edge" | "near" | null>(null);
  const [arrived, setArrived] = useState(false);
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

  // Character state
  const [action, setAction] = useState<{ name: Action; id: number } | null>(null);
  const [reaction, setReaction] = useState<Expression | null>(null);
  const [bubble, setBubble] = useState<{ text: string; id: number } | null>(null);
  const [asleep, setAsleep] = useState(false);
  const [napping, setNapping] = useState(false); // rate-limited
  const [sad, setSad] = useState(false); // last request failed
  const [typing, setTyping] = useState(false);
  const [chipHover, setChipHover] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [confetti, setConfetti] = useState<number | null>(null);
  const [hint, setHint] = useState(false);
  const [launcherHover, setLauncherHover] = useState(false);
  const [jumping, setJumping] = useState(false);
  const [lastRoast, setLastRoast] = useState<{ score: number; line: string } | null>(null);
  const [sharing, setSharing] = useState<{ score: number; line: string } | null>(null);
  const [sound, setSound] = useState(false);
  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState(pathname);

  const visitorRef = useRef<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastActive = useRef(0);
  const reactionTimer = useRef<number | undefined>(undefined);
  const typingTimer = useRef<number | undefined>(undefined);
  const taps = useRef<number[]>([]);
  const asleepRef = useRef(false);
  const openedOnce = useRef(false);
  const busy = thinking || talking;

  const playAction = useCallback((name: Action) => setAction({ name, id: Date.now() + Math.random() }), []);

  const say = useCallback((text: string) => setBubble({ text, id: Date.now() + Math.random() }), []);

  const react = useCallback(
    (kind: ReactionKind) => {
      const r = pick(REACTIONS[kind]);
      setReaction(r.expr);
      playAction(r.action);
      say(pick(r.lines));
      playSound(REACTION_SOUND[kind]);
      window.clearTimeout(reactionTimer.current);
      reactionTimer.current = window.setTimeout(() => setReaction(null), r.ms);
    },
    [playAction, say],
  );

  // Any activity keeps Kitto awake; waking her up gets a reaction.
  const markActive = useCallback(() => {
    lastActive.current = Date.now();
    if (asleepRef.current) {
      asleepRef.current = false;
      setAsleep(false);
      react("wake");
    }
  }, [react]);

  useEffect(() => {
    lastActive.current = Date.now();
    const onMove = () => markActive();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("keydown", onMove);
    const t = window.setInterval(() => {
      const idle = Date.now() - lastActive.current;
      const limit = open ? NAP_AFTER_MS : LAUNCHER_NAP_AFTER_MS;
      if (!asleepRef.current && idle > limit && !busy && !sensitive) {
        asleepRef.current = true;
        setAsleep(true);
      }
    }, 2000);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onMove);
      window.clearInterval(t);
    };
  }, [open, busy, sensitive, markActive]);

  // Attention: once per visitor, Kitto walks in after 8 s, then shows the nudge.
  useEffect(() => {
    if (nudgeStorage.seen()) return;
    const t = window.setTimeout(() => {
      nudgeStorage.markSeen();
      if (reducedMotion()) setNudge(true);
      else setWalking("edge");
    }, NUDGE_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  const onArrive = useCallback(() => {
    setWalking((w) => {
      if (w === "edge") setNudge(true);
      return null;
    });
    setArrived(true);
    window.setTimeout(() => setArrived(false), 700);
  }, []);

  // Navigating to another page: Kitto strolls over to the new page with you.
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    if (!open && !walking && !reducedMotion()) setWalking("near");
  }

  // Sound preference (off by default) is read after mount.
  useEffect(() => {
    const t = window.setTimeout(() => setSound(soundEnabled()), 0);
    return () => window.clearTimeout(t);
  }, []);

  function toggleSound() {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
    if (next) playSound("mrrp");
  }

  // Switching tabs: Kitto dozes off, and is delighted when you come back.
  useEffect(() => {
    const original = document.title;
    const onVisibility = () => {
      if (document.hidden) {
        asleepRef.current = true;
        setAsleep(true);
        if (openedOnce.current) document.title = AWAY_TITLE;
      } else {
        if (document.title === AWAY_TITLE) document.title = original;
        lastActive.current = Date.now();
        if (asleepRef.current) {
          asleepRef.current = false;
          setAsleep(false);
          if (!sensitive) react("back");
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (document.title === AWAY_TITLE) document.title = original;
    };
  }, [react, sensitive]);

  function openPanel() {
    openedOnce.current = true;
    setNudge(false);
    setOpen(true);
    setHint(readStorage(HINT_KEY) !== "1");
    markActive();
    window.setTimeout(() => react("hello"), 250);
  }

  function closePanel() {
    setOpen(false);
    window.setTimeout(() => launcherRef.current?.focus(), 0);
  }

  // Escape closes the panel; focus moves into the panel on open.
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

  const changeMood = useCallback(
    (next: Mood) => {
      setMood((prev) => {
        if (prev !== next) setPopKey((k) => k + 1);
        return next;
      });
      const a = MOOD_ACTION[next];
      if (a) playAction(a);
    },
    [playAction],
  );

  function celebrate(big = false) {
    react("celebrate");
    if (reducedMotion()) return;
    setConfetti(Date.now());
    if (big) setJumping(true);
  }

  function openShare() {
    if (lastRoast) setSharing(lastRoast);
  }

  function doneHint() {
    if (hint) {
      setHint(false);
      writeStorage(HINT_KEY, "1");
    }
  }

  function onTap() {
    markActive();
    doneHint();
    if (sensitive) return; // no jokes after a sensitive moment
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 3000), now];
    if (taps.current.length >= SECRET_TAPS) {
      taps.current = [];
      celebrate();
      setMessages((m) => [...m, { id: newId(), role: "assistant", text: pick(SECRETS) }]);
      return;
    }
    react("tap");
  }

  function onPet() {
    markActive();
    doneHint();
    if (!sensitive) react("pet");
  }

  function onTyping() {
    markActive();
    setTyping(true);
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => setTyping(false), 1200);
  }

  const send = useCallback(
    async (text: string, pickedMode?: Mode) => {
      if (busy) return;
      setChips([]);
      setLastFailed(null);
      setLeadForm(null);
      setSad(false);
      setScore(null);
      setTyping(false);
      const requestMode = pickedMode ?? mode;
      if (pickedMode) setMode(pickedMode);

      const replyId = newId();
      setMessages((m) => [...m, { id: newId(), role: "user", text }]);
      setThinking(true);

      try {
        visitorRef.current ??= await getVisitorId();
        let started = false;
        let replyText = "";
        const onText = (chunk: string) => {
          replyText += chunk;
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
          if (meta.roastScore !== null) {
            setScore(meta.roastScore);
            setLastRoast({ score: meta.roastScore, line: verdictFrom(replyText) });
            if (meta.roastScore >= 8) celebrate(meta.roastScore >= 9);
          }
          if (meta.intent === "lead" && !leadSent) {
            // Pre-fill "what you need" with the message that triggered the offer, unless it was a chip.
            setLeadForm({ need: text in STARTER_CHIPS ? "" : text });
          }
        } else if (result.kind === "rate_limited") {
          setMessages((m) => [...m.filter((x) => x.id !== replyId), { id: replyId, role: "assistant", text: result.message }]);
          setNapping(true);
          if (!leadSent) setLeadForm({ need: "" });
        } else {
          const message = result.kind === "error" ? result.message : "Hairball moment. Try that again?";
          // Replace any partial reply with the fallback line.
          setMessages((m) => [...m.filter((x) => x.id !== replyId), { id: replyId, role: "assistant", text: message, error: true }]);
          setLastFailed(text);
          setSad(true);
        }
      } catch {
        setMessages((m) => [
          ...m.filter((x) => x.id !== replyId),
          { id: replyId, role: "assistant", text: "Hairball moment. Try that again?", error: true },
        ]);
        setLastFailed(text);
        setSad(true);
      } finally {
        setThinking(false);
        setTalking(false);
      }
    },
    // celebrate only reads stable setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setChipHover(false);
    if (/share my score/i.test(chip) && lastRoast) {
      openShare();
      return;
    }
    send(chip, STARTER_CHIPS[chip]);
  }

  async function onLead(values: LeadValues): Promise<string | null> {
    if (!visitorRef.current || !conversationId) return "Say hi to Kitto first, then try again.";
    const res = await submitLead({ visitorId: visitorRef.current, conversationId, ...values });
    if (!res.ok) return res.error;
    setLeadForm(null);
    setLeadSent(true);
    setNapping(false);
    changeMood("happy");
    celebrate(true);
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

  // What Kitto's face shows right now, most important first.
  let expression: Expression = MOOD_EXPRESSION[mood];
  let lookAt: LookTarget | null = null;
  if (thinking) {
    expression = EXPRESSIONS.thinking;
    lookAt = { x: 0, y: 0 };
  } else if (reaction) expression = reaction;
  else if (asleep || napping) expression = EXPRESSIONS.asleep;
  else if (sensitive) expression = EXPRESSIONS.gentle;
  else if (sad) expression = EXPRESSIONS.sad;
  if (!thinking && !reaction && !asleep) {
    if (typing) lookAt = { x: -0.15, y: 1 };
    else if (chipHover) lookAt = { x: -0.6, y: 1 };
  }

  const statusText = thinking ? "thinking…" : talking ? "typing…" : asleep || napping ? "napping" : "online";

  const launcherExpression: Expression = asleep
    ? EXPRESSIONS.asleep
    : launcherHover || nudge
      ? EXPRESSIONS.purr
      : MOOD_EXPRESSION.curious;

  return (
    <div className="kitto-root">
      {walking && <KittoWalkIn from={walking} onArrive={onArrive} />}

      {/* Launcher */}
      {!open && (
        <div className="fixed right-5 bottom-5 z-50 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
          {nudge && (
            <button
              type="button"
              onClick={openPanel}
              className="kitto-nudge relative flex max-w-[240px] items-center gap-2.5 rounded-[20px] rounded-br-md bg-white py-2.5 pr-4 pl-3 text-left text-[14px] leading-snug font-semibold text-[var(--kitto-ink)] shadow-[0_12px_30px_-8px_rgba(27,21,48,0.3)] ring-1 ring-black/5"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--kitto-lav-soft)] text-base" aria-hidden="true">
                🔥
              </span>
              Psst. Want me to roast your bio?
            </button>
          )}
          <button
            ref={launcherRef}
            type="button"
            onClick={openPanel}
            onPointerEnter={() => setLauncherHover(true)}
            onPointerLeave={() => setLauncherHover(false)}
            aria-label="Chat with Kitto"
            className={`kitto-launcher relative grid h-[68px] w-[68px] place-items-center overflow-hidden rounded-full bg-[var(--kitto-lav)] shadow-[0_14px_34px_-10px_rgba(70,65,107,0.6)] ring-4 ring-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--kitto-violet)] ${arrived ? "is-arriving" : ""}`}
          >
            <KittoAvatar expression={launcherExpression} crop="head" fidget={!asleep} className="mt-2 h-[66px] w-[66px]" />
          </button>
        </div>
      )}

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Chat with Kitto"
          className="kitto-panel fixed inset-0 z-50 flex flex-col overflow-hidden bg-[var(--kitto-paper)] sm:inset-auto sm:right-6 sm:bottom-6 sm:h-[680px] sm:max-h-[calc(100vh-3rem)] sm:w-[400px] sm:rounded-[28px] sm:shadow-[0_30px_80px_-20px_rgba(27,21,48,0.45)] sm:ring-1 sm:ring-black/5"
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-5 pt-4 pb-3">
            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- small static logo */}
                <img src="/kitto/logo-kitto.png" alt="Kitto" width={70} height={24} className="h-[22px] w-auto" />
                <span className="rounded-full bg-[var(--kitto-lav)] px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-[var(--kitto-deep)]">AI</span>
                {demo && (
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-amber-800">
                    DEMO
                  </span>
                )}
              </div>
              <span className="mt-0.5 flex items-center gap-1.5 text-[12px] font-medium text-[var(--kitto-deep)]/70">
                <span
                  className={`h-2 w-2 rounded-full ${asleep || napping ? "bg-zinc-400" : busy ? "animate-pulse bg-amber-400" : "bg-emerald-500"}`}
                  aria-hidden="true"
                />
                {statusText} · by Codifykit
              </span>
            </div>
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={sound}
              aria-label={sound ? "Turn Kitto's sounds off" : "Turn Kitto's sounds on"}
              title={sound ? "Sounds on" : "Sounds off"}
              className="kitto-icon-btn ml-auto"
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
                {sound ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /> : <path d="M17 9l5 6M22 9l-5 6" />}
              </svg>
            </button>
            <button type="button" onClick={closePanel} aria-label="Close chat" className="kitto-icon-btn">
              <svg viewBox="0 0 24 24" width="17" height="17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <KittoStage
            background={MOOD_COLORS[mood]}
            expression={expression}
            talking={talking}
            action={action}
            lookAt={lookAt}
            trackPointer={!thinking}
            fidget={!asleep && !sensitive && !busy}
            popKey={popKey}
            bubble={bubble}
            score={score}
            confetti={confetti}
            hint={hint}
            jumping={jumping}
            onJumpDone={() => setJumping(false)}
            onShare={openShare}
            onTap={onTap}
            onPet={onPet}
          />

          {/* Messages */}
          <div ref={scrollRef} className="kitto-scroll min-h-0 flex-1 overflow-y-auto">
            <ChatMessages messages={messages} thinking={thinking} />
            {sensitive && (
              <div className="mx-4 mb-3 ml-[52px] rounded-[20px] bg-sky-50 p-4 text-[14px] text-sky-950 ring-1 ring-sky-200">
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
              <div className="px-4 pb-2 pl-[52px]">
                <button type="button" onClick={retry} className="rounded-full bg-[var(--kitto-deep)] px-4 py-2 text-sm font-bold text-white">
                  Try again
                </button>
              </div>
            )}
            {leadForm && <LeadForm initialNeed={leadForm.need} onSubmit={onLead} />}
            <ModeChips chips={chips} onPick={pickChip} onHover={setChipHover} disabled={busy} />
          </div>

          <ChatInput onSend={(t) => send(t)} onTyping={onTyping} disabled={busy} showPrivacy={!conversationId} />
          {sharing && <ShareCard score={sharing.score} line={sharing.line} onClose={() => setSharing(null)} />}
        </div>
      )}
    </div>
  );
}
