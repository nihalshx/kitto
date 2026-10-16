# Kitto — Codifykit's AI brand buddy

A black-cat chat buddy for the Codifykit website: brand ideas, brand therapy, roasts and lead capture. Built with Next.js (App Router), TypeScript, Tailwind, Supabase and the Claude API. See the PRD for the full spec.

## Status

| PRD build step | State |
| --- | --- |
| 1. Next.js + TS + Tailwind project | Done |
| 2. Supabase schema migration with RLS | Done (`supabase/migrations/`) |
| 3. `/api/chat` with streaming + metadata parsing | Done (and `/api/session`) |
| 4. Chat widget (placeholder SVG moods until the art lands) | Done |
| 5. `/api/lead`, lead form, email alert | Done (email needs `RESEND_API_KEY`) |
| 6. Rate limiting + error fallbacks | Done |
| 7–11 | Not started |

## Demo mode

With `KITTO_DEMO=true`, or with no `ANTHROPIC_API_KEY` set, Kitto answers with scripted replies (`lib/kitto/demo.ts`) instead of calling Claude. Roast, muse, therapy, team, sensitive and Malayalam paths all work, and the header shows a **DEMO** badge. To go live, set a funded `ANTHROPIC_API_KEY`, remove `KITTO_DEMO`, and rebuild (the badge is read at build time).

## Setup

```bash
npm install
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY at minimum
npm run dev
```

Without `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, the API falls back to an in-memory store (dev only; it resets on restart).

### Environment variables

| Name | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude API key (server only) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB access (server only, never in browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public key, admin login only |
| `RESEND_API_KEY` | Lead emails |
| `LEAD_NOTIFY_EMAIL` | Where leads are sent (codifykit@gmail.com) |
| `KITTO_DAILY_MESSAGE_LIMIT` | Messages per visitor per day (default 40) |
| `KITTO_DAILY_IP_LIMIT` | Messages per IP per day (default 100) |
| `KITTO_DEMO` | `true` = scripted demo replies, no Claude calls |
| `LEAD_FROM_EMAIL` | Sender for lead emails (a domain verified in Resend) |
| `ADMIN_EMAILS` | Comma-separated emails allowed into `/admin` |

### Database

Apply the migration with the Supabase CLI (`supabase db push`) or paste `supabase/migrations/20261016000000_kitto_init.sql` into the SQL editor. Then:

- Add admin emails: `insert into admin_emails (email) values ('you@codifykit.com');`
- Enable `pg_cron` and schedule retention: `select cron.schedule('kitto-retention', '17 3 * * *', 'select kitto_purge_old_data()');`

## API

### `POST /api/session`

`{ firstPage?, utmSource?, language? }` → `{ visitorId }`

### `POST /api/chat`

`{ visitorId, conversationId?, mode?, message }` (message ≤ 1,000 chars) → `text/event-stream`:

```
event: text
data: {"text":"3/10. \"Passionate\" could describe"}

event: meta
data: {"mood":"unimpressed","mode":"roast","chips":["Share my score"],"intent":"none","roastScore":3,"conversationId":"…","messageId":"…"}
```

On a model failure or refusal you get `event: error` with `{ message: "Hairball moment. Try that again?", retry: true, discardPartial: true }`. Over the daily limit: HTTP 429 with the "nap" message and `showLeadForm: true`.

Try it:

```bash
V=$(curl -s -XPOST localhost:3000/api/session -H 'content-type: application/json' -d '{}' | jq -r .visitorId)
curl -N -XPOST localhost:3000/api/chat -H 'content-type: application/json' \
  -d "{\"visitorId\":\"$V\",\"mode\":\"roast\",\"message\":\"roast my bio: Passionate team delivering quality solutions\"}"
```

### How a chat request works

1. Zod validates the body; the visitor must exist.
2. Daily counters (visitor + hashed IP) are bumped atomically in Postgres.
3. The last 20 messages are loaded; each visitor message is wrapped in `<user_content>` tags (prompt-injection guard).
4. Claude Sonnet 5.5 streams the reply (`lib/kitto/anthropic.ts`): system prompt cached, low effort with thinking off for fast first tokens, and server-side refusal fallback on.
5. `MetaStreamFilter` forwards visible text and holds back everything from `<kitto_meta>` on, so metadata never reaches the browser.
6. The metadata is validated (bad values fall back to defaults), both messages are saved with token counts, and a final `meta` event is sent.

## Layout

```
app/api/chat/route.ts       streaming chat endpoint
app/api/session/route.ts    visitor id
app/api/lead/route.ts       lead capture (+ Haiku summary, Resend email)
components/kitto/           widget, avatar, messages, input, chips, lead form
lib/kitto/demo.ts           scripted replies for demo mode
lib/kitto/client.ts         browser session + SSE parsing
lib/kitto/systemPrompt.ts   Kitto system prompt (PRD section 6, verbatim)
lib/kitto/parseMeta.ts      metadata parsing + stream filter
lib/kitto/moods.ts          mood ids, colours, Rive numbers
lib/kitto/anthropic.ts      Claude client and request settings
lib/kitto/store.ts          Supabase / in-memory persistence
lib/kitto/rateLimit.ts      daily limits
supabase/migrations/        schema, RLS, rate-limit and retention functions
tests/                      unit tests (npm test)
```

## Scripts

`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm test`

## Deploy

Vercel: import the repo, set the env vars above (keep the API and service-role keys server-only), deploy. Supabase: apply the migration to the cloud project.
