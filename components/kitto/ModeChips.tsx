"use client";

// A little icon for the chips Kitto suggests most often.
const ICONS: [RegExp, string][] = [
  [/idea|hook|write|plan|another/i, "💡"],
  [/feels off|brand/i, "🛋️"],
  [/roast/i, "🔥"],
  [/team|humans/i, "👋"],
  [/share/i, "📸"],
];
const iconFor = (chip: string) => ICONS.find(([re]) => re.test(chip))?.[1];

export default function ModeChips({
  chips,
  onPick,
  onHover,
  disabled,
}: {
  chips: string[];
  onPick: (chip: string) => void;
  /** Kitto glances at the chip under the pointer. */
  onHover?: (hovering: boolean) => void;
  disabled?: boolean;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3 pl-[60px]">
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          disabled={disabled}
          onClick={() => onPick(chip)}
          onPointerEnter={() => onHover?.(true)}
          onPointerLeave={() => onHover?.(false)}
          className="flex items-center gap-1.5 rounded-full bg-[var(--kitto-lav-soft)] px-3.5 py-2 text-[13.5px] font-bold text-[var(--kitto-deep)] ring-1 ring-[var(--kitto-lav)] transition hover:-translate-y-0.5 hover:bg-[var(--kitto-lav)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kitto-violet)] disabled:opacity-50"
        >
          {iconFor(chip) && <span aria-hidden="true">{iconFor(chip)}</span>}
          {chip}
        </button>
      ))}
    </div>
  );
}
