import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { z } from "zod";

// PRD F9: 1080 x 1350 roast share card (Kitto face, score, one-line verdict, Codifykit).
const Query = z.object({
  score: z.coerce.number().int().min(1).max(10),
  line: z.string().trim().max(160).default(""),
});

function faceFor(score: number) {
  if (score <= 3) return "grumpy";
  if (score <= 5) return "focused";
  if (score <= 7) return "curious";
  if (score <= 8) return "happy";
  return "excited";
}

function headlineFor(score: number) {
  if (score <= 3) return "My bio got roasted.";
  if (score <= 6) return "Kitto cut the fluff.";
  if (score <= 8) return "Kitto approves (mostly).";
  return "Kitto is impressed.";
}

const INK = "#1b1530";
const VIOLET = "#5b3fd1";

export async function GET(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = Query.safeParse(params);
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });
  const { score, line } = parsed.data;

  const svg = await readFile(join(process.cwd(), "public/kitto/card", `kitto_${faceFor(score)}.svg`), "base64");
  const kitto = `data:image/svg+xml;base64,${svg}`;
  const logo = `data:image/png;base64,${await readFile(join(process.cwd(), "public/kitto/logo-kitto.png"), "base64")}`;
  const raw = line.length > 0 ? line : "Short, clear, honest. That's the bar.";
  // Don't double up quotes when the verdict already starts with a quoted word.
  const verdict = /^["“]/.test(raw) ? raw : `“${raw}”`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#F8F6F3",
          padding: "72px 80px",
          color: INK,
          position: "relative",
        }}
      >
        {/* Lavender blob behind Kitto, as on the character sheet */}
        <div
          style={{
            position: "absolute",
            left: 290,
            top: 300,
            width: 720,
            height: 720,
            borderRadius: 9999,
            background: "#DDD7F2",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser */}
          <img src={logo} width={190} height={64} alt="Kitto" />
          <div style={{ display: "flex", fontSize: 36, letterSpacing: 6, color: VIOLET, marginTop: 10 }}>ROAST</div>
        </div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.05, marginTop: 18, maxWidth: 720 }}>
          {headlineFor(score)}
        </div>

        {/* Score badge */}
        <div
          style={{
            position: "absolute",
            left: 80,
            top: 420,
            width: 300,
            height: 300,
            borderRadius: 9999,
            border: `12px solid ${VIOLET}`,
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(-8deg)",
            color: VIOLET,
          }}
        >
          <div style={{ display: "flex", fontSize: 150, fontWeight: 900, lineHeight: 1 }}>{score}</div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, letterSpacing: 4 }}>/ 10</div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser */}
        <img src={kitto} width={500} height={800} alt="" style={{ position: "absolute", left: 420, top: 250 }} />

        {/* Verdict */}
        <div
          style={{
            position: "absolute",
            left: 80,
            right: 80,
            bottom: 170,
            display: "flex",
            background: "#ffffff",
            borderRadius: 36,
            padding: "36px 44px",
            fontSize: 44,
            lineHeight: 1.25,
            boxShadow: "0 10px 30px rgba(27,21,48,0.12)",
          }}
        >
          {verdict}
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            left: 80,
            right: 80,
            bottom: 64,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 34,
          }}
        >
          <div style={{ display: "flex", fontWeight: 800, fontSize: 44, letterSpacing: -1 }}>Codifykit</div>
          <div style={{ display: "flex", color: "#6b6580" }}>Get roasted by Kitto</div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      headers: { "Cache-Control": "public, max-age=86400, immutable" },
    },
  );
}
