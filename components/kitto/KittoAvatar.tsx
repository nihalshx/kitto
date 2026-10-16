import type { Mood } from "@/lib/kitto/moods";

// Placeholder Kitto drawn in SVG until the commissioned artwork and kitto.riv land
// (PRD section 7). Same props the Rive version will take, so it can be swapped in.

interface Props {
  mood: Mood;
  thinking?: boolean;
  talking?: boolean;
  className?: string;
}

const EYES = { left: 72, right: 128, y: 112 };

function Eyes({ mood, thinking }: { mood: Mood; thinking: boolean }) {
  if (mood === "happy") {
    return (
      <g stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d={`M${EYES.left - 14} 116 Q${EYES.left} 100 ${EYES.left + 14} 116`} />
        <path d={`M${EYES.right - 14} 116 Q${EYES.right} 100 ${EYES.right + 14} 116`} />
      </g>
    );
  }

  const shape = {
    curious: { rx: 20, ry: 23, pr: 11, fill: "#fff" },
    helpful: { rx: 18, ry: 16, pr: 8, fill: "#fff" },
    unimpressed: { rx: 19, ry: 17, pr: 8, fill: "#fff" },
    fluff_cutter: { rx: 21, ry: 22, pr: 0, fill: "#E8B923" },
  }[mood];

  const look = thinking ? { dx: 5, dy: -9 } : mood === "unimpressed" ? { dx: 0, dy: 6 } : { dx: 0, dy: 1 };

  return (
    <g className="kitto-eyes">
      {[EYES.left, EYES.right].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={EYES.y} rx={shape.rx} ry={shape.ry} fill={shape.fill} />
          {mood === "fluff_cutter" ? (
            <ellipse cx={x} cy={EYES.y} rx="4" ry="15" fill="#111" />
          ) : (
            <>
              <circle cx={x + look.dx} cy={EYES.y + look.dy} r={shape.pr} fill="#111" />
              <circle cx={x + look.dx + 3} cy={EYES.y + look.dy - 3} r="2.5" fill="#fff" />
            </>
          )}
          {mood === "unimpressed" && (
            // Half-lidded: the black lid covers the top half of the eye.
            <rect x={x - 24} y={EYES.y - 26} width="48" height="26" fill="#141414" />
          )}
        </g>
      ))}
    </g>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  if (mood === "unimpressed" || mood === "fluff_cutter") {
    return <path d="M90 152 L110 152" stroke="#fff" strokeOpacity=".8" strokeWidth="3" strokeLinecap="round" />;
  }
  if (mood === "happy") {
    return <path d="M88 148 Q100 162 112 148" stroke="#fff" strokeOpacity=".9" strokeWidth="3" fill="none" strokeLinecap="round" />;
  }
  return (
    <path d="M90 149 Q95 155 100 149 Q105 155 110 149" stroke="#fff" strokeOpacity=".8" strokeWidth="3" fill="none" strokeLinecap="round" />
  );
}

export default function KittoAvatar({ mood, thinking = false, talking = false, className }: Props) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={`${className ?? ""} ${talking ? "kitto-talking" : ""} ${thinking ? "kitto-thinking" : ""}`}
      aria-hidden="true"
      focusable="false"
    >
      <g className="kitto-body">
        {/* ears */}
        <path d="M38 92 L50 22 L96 64 Z" fill="#141414" />
        <path d="M162 92 L150 22 L104 64 Z" fill="#141414" />
        <path d="M50 76 L56 40 L80 62 Z" fill="#3a3a3a" />
        <path d="M150 76 L144 40 L120 62 Z" fill="#3a3a3a" />
        {/* head */}
        <ellipse cx="100" cy="116" rx="72" ry="62" fill="#141414" />
        <Eyes mood={mood} thinking={thinking} />
        {/* nose */}
        <path d="M95 136 L105 136 L100 142 Z" fill="#555" />
        <Mouth mood={mood} />
        {/* whiskers */}
        <g stroke="#fff" strokeOpacity=".55" strokeWidth="1.5" strokeLinecap="round">
          <path d="M40 132 L74 138" />
          <path d="M38 144 L74 144" />
          <path d="M160 132 L126 138" />
          <path d="M162 144 L126 144" />
        </g>
        {mood === "fluff_cutter" && (
          // The red pen prop (PRD: scissors or a red pen, never a knife).
          <g transform="rotate(-35 168 168)">
            <g className="kitto-prop">
              <rect x="140" y="160" width="58" height="12" rx="3" fill="#D7263D" />
              <rect x="140" y="160" width="14" height="12" rx="2" fill="#8E1526" />
              <path d="M198 160 L210 166 L198 172 Z" fill="#f4e4c1" />
            </g>
          </g>
        )}
      </g>
    </svg>
  );
}
