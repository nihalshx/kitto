import { test } from "node:test";
import assert from "node:assert/strict";
import { MetaStreamFilter, parseReply } from "../lib/kitto/parseMeta";

const REPLY =
  '3/10. "Passionate" could describe a bakery.\n\nFixes: say what you do.\n' +
  '<kitto_meta>{"mood":"unimpressed","mode":"roast","chips":["Write 2 more versions","Share my score","Talk to the team"],"intent":"none","roast_score":3}</kitto_meta>';

function streamInChunks(text: string, size: number) {
  const f = new MetaStreamFilter();
  let shown = "";
  for (let i = 0; i < text.length; i += size) shown += f.push(text.slice(i, i + size));
  const end = f.finish();
  return { shown: shown + end.tail, ...end };
}

test("parses a full reply", () => {
  const { text, meta } = parseReply(REPLY);
  assert.equal(text, '3/10. "Passionate" could describe a bakery.\n\nFixes: say what you do.');
  assert.deepEqual(meta, {
    mood: "unimpressed",
    mode: "roast",
    chips: ["Write 2 more versions", "Share my score", "Talk to the team"],
    intent: "none",
    roastScore: 3,
  });
});

test("metadata never reaches the visible stream, at any chunk size", () => {
  for (const size of [1, 2, 3, 5, 7, 11, 13, 50, 1000]) {
    const { shown, text } = streamInChunks(REPLY, size);
    assert.equal(shown, text, `chunk size ${size}`);
    assert.ok(!shown.includes("<kitto"), `chunk size ${size} leaked the tag`);
  }
});

test("missing metadata falls back to defaults and shows all text", () => {
  const { shown, meta } = streamInChunks("Just a plain reply <with a bracket>.", 4);
  assert.equal(shown, "Just a plain reply <with a bracket>.");
  assert.equal(meta.mood, "helpful");
  assert.deepEqual(meta.chips, []);
  assert.equal(meta.intent, "none");
});

test("invalid values are dropped", () => {
  const { meta } = parseReply(
    'Hi<kitto_meta>{"mood":"angry","mode":"sales","chips":["ok","this chip is far too long",3],"intent":"buy","roast_score":42}</kitto_meta>',
  );
  assert.deepEqual(meta, { mood: "helpful", mode: null, chips: ["ok"], intent: "none", roastScore: null });
});

test("broken JSON falls back to defaults", () => {
  const { text, meta } = parseReply('Hello<kitto_meta>{"mood": "happy"');
  assert.equal(text, "Hello");
  assert.equal(meta.mood, "helpful");
});

test("Malayalam text streams intact", () => {
  const ml = "നിങ്ങളുടെ ബ്രാൻഡ് എന്താണ് ചെയ്യുന്നത്?\n<kitto_meta>{\"mood\":\"curious\",\"mode\":\"therapy\",\"chips\":[],\"intent\":\"none\",\"roast_score\":null}</kitto_meta>";
  const { shown, meta } = streamInChunks(ml, 3);
  assert.equal(shown, "നിങ്ങളുടെ ബ്രാൻഡ് എന്താണ് ചെയ്യുന്നത്?");
  assert.equal(meta.mood, "curious");
});
