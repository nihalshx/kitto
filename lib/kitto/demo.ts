import "server-only";
import type { Mode } from "./moods";
import type { StoredMessage } from "./store";

// Demo mode: scripted, rule-based Kitto replies so the widget can be shown
// without a (funded) Claude API key. On when KITTO_DEMO=true or no key is set.
export function isDemoMode(): boolean {
  return process.env.KITTO_DEMO === "true" || !process.env.ANTHROPIC_API_KEY;
}

const BUZZWORDS = [
  "passionate", "quality", "solutions", "innovative", "synergy", "leverage", "world-class",
  "cutting-edge", "best-in-class", "revolutionary", "one-stop", "dedicated", "excellence",
  "customer-centric", "seamless", "dynamic", "next-level", "all your needs", "trusted",
];

interface DemoMeta {
  mood: string;
  mode: Mode;
  chips: string[];
  intent: "none" | "lead" | "sensitive";
  roast_score: number | null;
}

function withMeta(text: string, meta: DemoMeta): string {
  return `${text}\n<kitto_meta>${JSON.stringify(meta)}</kitto_meta>`;
}

function detectMode(message: string, picked?: Mode): Mode {
  const m = message.toLowerCase();
  if (/(price|pricing|cost|quote|how much|budget|timeline|can you build|hire|talk to the team)/.test(m)) return "team";
  if (picked) return picked;
  if (/(roast|bio|tagline|caption:|critique|rate my)/.test(m)) return "roast";
  if (/(idea|hook|caption|content|post|reel|plan|write one)/.test(m)) return "muse";
  if (/(feels off|my brand|brand feels|identity|confus|stuck)/.test(m)) return "therapy";
  return "general";
}

function roast(message: string): string {
  const pasted = message.replace(/^.*?(roast( my)?( bio| tagline| caption)?:?)/i, "").replace(/["“”]/g, "").trim() || message;
  const lower = pasted.toLowerCase();
  const found = BUZZWORDS.filter((w) => lower.includes(w));
  const score = Math.max(2, Math.min(9, 8 - found.length * 2 + (pasted.length > 160 ? -1 : 0)));

  const observation = found.length
    ? `"${found.slice(0, 2).join('" and "')}" could describe a bakery, a bank or a plumber. I read it twice and still don't know what you actually do.`
    : `No buzzword soup, respect. But I still had to guess who this is for.`;

  return withMeta(
    `${score}/10. ${observation}\n\nFixes: 1) Say what you do in plain words. 2) Say who it's for. 3) Add one proof point, like a number or a result you've seen.\n\nTry: "We build websites for Kerala clinics. Booked appointments, not just pretty pages."\n\nWant two more versions, or share your score?`,
    { mood: score <= 4 ? "unimpressed" : score >= 8 ? "happy" : "fluff_cutter", mode: "roast", chips: ["Write 2 more", "Share my score", "Talk to the team"], intent: "none", roast_score: score },
  );
}

const THERAPY_QUESTIONS = [
  "Let's lie down on the brand couch. First: what do you do, in one sentence?",
  "Got it. Who is it for? Picture one real customer, not \"everyone\".",
  "Nice. When that person finds you, how do you want them to feel? Pick three words.",
  "Now the honest bit: what feels off right now?",
  "Last one. What have you already tried to fix it?",
];

function therapy(history: StoredMessage[]): string {
  const asked = history.filter((m) => m.role === "assistant" && THERAPY_QUESTIONS.includes(m.content)).length;
  if (asked < THERAPY_QUESTIONS.length) {
    return withMeta(THERAPY_QUESTIONS[asked], { mood: "curious", mode: "therapy", chips: [], intent: "none", roast_score: null });
  }
  return withMeta(
    "Okay, cutting the fluff. Here's my diagnosis.\n\nWhat's working: you know what you do and you care about how people feel.\nWhat's off: your page talks about you, not about the person you want to reach.\n\nNext steps:\n1. Rewrite your bio around one customer and one result.\n2. Pick one colour and one font, and use only those for a month.\n3. Post one before/after story this week.",
    { mood: "fluff_cutter", mode: "therapy", chips: ["Roast my bio", "Give me ideas", "Talk to the team"], intent: "none", roast_score: null },
  );
}

function muse(message: string): string {
  if (/(plan|7[- ]day|week)/i.test(message)) {
    return withMeta(
      "Here's a 7-day plan you can actually keep:\n\n| Day | Post |\n| --- | --- |\n| Mon | Behind the scenes: your workspace |\n| Tue | One myth in your industry, busted |\n| Wed | A customer question, answered |\n| Thu | Before / after |\n| Fri | Your process in 3 steps |\n| Sat | A tiny win from this week |\n| Sun | Rest. Even cats nap. |\n\nWant me to write Tuesday's out?",
      { mood: "helpful", mode: "muse", chips: ["Write Tuesday out", "Roast my bio"], intent: "none", roast_score: null },
    );
  }
  return withMeta(
    "Here are five hooks you can try today:\n\n1. \"Nobody tells you this about starting a ___.\"\n2. \"I made this mistake so you don't have to.\"\n3. \"3 things I'd change if I started again.\"\n4. \"This took 10 minutes. It saved me 10 hours.\"\n5. \"Unpopular opinion: ___ is overrated.\"\n\nWant me to write one out?",
    { mood: "helpful", mode: "muse", chips: ["Write one out", "Make a 7-day plan", "Roast my bio"], intent: "none", roast_score: null },
  );
}

/** Build a scripted reply (visible text + metadata block) for demo mode. */
export function demoReply(message: string, history: StoredMessage[], picked?: Mode): string {
  const m = message.toLowerCase();

  if (/[ഀ-ൿ]/.test(message)) {
    return withMeta(
      "നമസ്കാരം! ഞാൻ കിറ്റോ, Codifykit-ന്റെ ബ്രാൻഡ് ബഡ്ഡി. നിങ്ങളുടെ ബ്രാൻഡ് എന്താണ് ചെയ്യുന്നത്? ഒരു വാക്യത്തിൽ പറയൂ.",
      { mood: "curious", mode: "general", chips: [], intent: "none", roast_score: null },
    );
  }
  if (/(sad|depressed|hopeless|can't cope|want to die|kill myself|anxious|lonely)/.test(m)) {
    return withMeta(
      "That sounds really heavy, and I'm glad you said it. I'm a brand buddy, not a counsellor, so I'm not the right one to help with this. Talking to someone you trust, or a mental health professional, can really help. If you feel unsafe, please contact a crisis line or emergency services now. I'm here for brand stuff whenever you want.",
      { mood: "curious", mode: "general", chips: [], intent: "sensitive", roast_score: null },
    );
  }
  if (/(are you (a )?(human|real|bot|ai))/.test(m)) {
    return withMeta("I'm an AI. A cat-shaped one. What are we working on?", { mood: "curious", mode: "general", chips: ["Give me ideas", "Roast my bio"], intent: "none", roast_score: null });
  }

  if (/(write 2 more|two more|more versions)/.test(m)) {
    return withMeta(
      "Two more, fresh out of the oven:\n\n1. \"Clinic websites that fill your appointment book.\"\n2. \"Your patients search online. We make sure they find you, and book.\"\n\nPick one and test it for a week.",
      { mood: "helpful", mode: "roast", chips: ["Roast another", "Talk to the team"], intent: "none", roast_score: null },
    );
  }
  if (/share my score/.test(m)) {
    return withMeta(
      "Share cards are still being drawn by my humans, so that button lands soon. For now, screenshot your score and tag Codifykit.",
      { mood: "happy", mode: "roast", chips: ["Roast another"], intent: "none", roast_score: null },
    );
  }
  if (/write (one|it|tuesday)( out)?/.test(m)) {
    return withMeta(
      "Here you go:\n\n\"Unpopular opinion: you don't need more followers. You need the right 100. Here's how we found ours.\"\n\nThen three short slides: who they are, where they hang out, the one post that brought them in. End with a question so people comment.",
      { mood: "helpful", mode: "muse", chips: ["Another one", "Make a 7-day plan"], intent: "none", roast_score: null },
    );
  }
  if (/roast another/.test(m)) {
    return withMeta("Bring it. Paste the next one.", { mood: "curious", mode: "roast", chips: [], intent: "none", roast_score: null });
  }

  // Continue an in-progress therapy session.
  const lastAssistant = [...history].reverse().find((h) => h.role === "assistant");
  const inTherapy = lastAssistant && THERAPY_QUESTIONS.includes(lastAssistant.content);

  const mode = inTherapy ? "therapy" : detectMode(message, picked);
  switch (mode) {
    case "roast":
      return /roast my bio$|^roast my bio\b\s*$/i.test(message.trim()) || message.trim().split(/\s+/).length <= 3
        ? withMeta("Paste it in. Bio, tagline, caption, whatever. I'll be honest, but kind.", { mood: "curious", mode: "roast", chips: [], intent: "none", roast_score: null })
        : roast(message);
    case "therapy":
      return therapy(history);
    case "muse":
      return muse(message);
    case "team":
      return withMeta(
        "Depends on what you need, so I won't guess a price. My humans at Codifykit can give you a real quote. Leave your details below and they'll get back to you.",
        { mood: "happy", mode: "team", chips: [], intent: "lead", roast_score: null },
      );
    default:
      return withMeta(
        "Hey, I'm Kitto. I give ideas, talk through brand problems, and roast bios (lovingly). What are we working on?",
        { mood: "curious", mode: "general", chips: ["Give me ideas", "My brand feels off", "Roast my bio"], intent: "none", roast_score: null },
      );
  }
}

/** Stream a string word by word, like a model would. */
export async function* streamWords(text: string, delayMs = 22): AsyncGenerator<string> {
  for (const piece of text.match(/\S+\s*|\s+/g) ?? []) {
    yield piece;
    await new Promise((r) => setTimeout(r, delayMs));
  }
}
