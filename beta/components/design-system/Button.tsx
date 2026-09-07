import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "warn" | "ghost" | "danger-ghost";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "border border-amber bg-amber text-[#1a1408]",
  warn: "border border-red bg-red text-white",
  ghost: "border border-line-2 bg-panel text-ink",
  "danger-ghost": "border border-red bg-panel text-red",
};

export function AppButton({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`w-full rounded-2xl py-4 text-lg font-semibold transition disabled:opacity-40 ${VARIANT_CLASS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Chip({
  active,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={`rounded-xl border px-2 py-3 text-center font-num text-lg font-bold tabular-nums transition disabled:opacity-40 ${
        active ? "border-ink bg-ink text-[#10161a]" : "border-line bg-panel text-ink"
      } ${className}`}
      {...props}
    />
  );
}

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-xl border border-line">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-2 py-3 text-sm font-medium transition ${
            opt.value === value ? "bg-ink font-semibold text-[#10161a]" : "bg-panel text-ink-2"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function SeatOptionButton({
  active,
  disabled,
  dealer,
  wind,
  name,
  sub,
  onClick,
}: {
  active?: boolean;
  disabled?: boolean;
  dealer?: boolean;
  wind: string;
  name: string;
  sub?: string | number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-16 items-center gap-3 rounded-2xl border px-4 text-left text-lg font-semibold transition disabled:opacity-30 ${
        active ? "border-ink bg-ink text-[#10161a]" : "border-line bg-panel text-ink"
      }`}
    >
      <span
        className={`rounded-md border px-2 py-1 font-cjk text-lg leading-none ${
          dealer ? "border-red bg-red text-white" : active ? "border-[#10161a]/30" : "border-line text-ink-2"
        }`}
      >
        {wind}
      </span>
      <span className="flex-1">{name}</span>
      {sub !== undefined && (
        <span className="font-num text-lg font-semibold text-muted tabular-nums">{sub}</span>
      )}
    </button>
  );
}
