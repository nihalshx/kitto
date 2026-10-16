"use client";

export default function ModeChips({
  chips,
  onPick,
  disabled,
}: {
  chips: string[];
  onPick: (chip: string) => void;
  disabled?: boolean;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2">
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          disabled={disabled}
          onClick={() => onPick(chip)}
          className="rounded-full border border-[var(--kitto-ink)]/20 bg-white px-3 py-1.5 text-sm font-medium text-[var(--kitto-ink)] transition-colors hover:border-[var(--kitto-violet)] hover:text-[var(--kitto-violet)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kitto-violet)] disabled:opacity-50"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
