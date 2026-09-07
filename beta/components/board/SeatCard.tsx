"use client";

import { deltaClass, sgn } from "@/lib/format";
import styles from "./board.module.css";

interface SeatCardProps {
  wind: string;
  name: string;
  score: number;
  riichi: boolean;
  isDealer: boolean;
  ended: boolean;
  flashDelta?: number;
  onToggleRiichi: () => void;
  onTap: () => void;
}

export function SeatCard({
  wind,
  name,
  score,
  riichi,
  isDealer,
  ended,
  flashDelta,
  onToggleRiichi,
  onTap,
}: SeatCardProps) {
  const hasFlash = typeof flashDelta === "number" && flashDelta !== 0;
  const flashKind = hasFlash ? deltaClass(flashDelta as number) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onTap();
      }}
      className={[
        styles.card,
        "flex cursor-pointer items-stretch gap-2 border bg-panel p-2 sm:gap-3 sm:p-3",
        riichi
          ? "border-amber shadow-[inset_0_0_0_2px_var(--color-amber),0_0_24px_rgba(245,179,66,0.35)]"
          : isDealer
            ? "border-red-2"
            : "border-line",
      ].join(" ")}
      style={riichi ? { background: "#241F13" } : undefined}
    >
      <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-1 text-center sm:w-20">
        <span
          className={`rounded-md border px-2 py-1 font-cjk text-base leading-none sm:text-xl ${
            isDealer ? "border-red bg-red text-white" : "border-line text-ink-2"
          }`}
        >
          {wind}
        </span>
        <span className="max-w-full truncate text-xs font-semibold text-ink-2 sm:text-sm">{name}</span>
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col items-center justify-center overflow-hidden">
        <div
          className={`font-num text-3xl leading-none font-bold tabular-nums sm:text-6xl ${
            score < 0 ? "text-red" : riichi ? "text-[#FFD27A]" : "text-amber"
          }`}
        >
          {score}
        </div>
        <div
          className={`mt-1 h-4 text-center font-num text-xs leading-none font-semibold tabular-nums sm:text-sm ${
            flashKind === "up" ? "text-green" : flashKind === "down" ? "text-red" : "text-muted opacity-60"
          }`}
        >
          {hasFlash ? sgn(flashDelta as number) : "탭해서 점수 차 보기"}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleRiichi();
        }}
        disabled={ended}
        aria-label="리치"
        className={`flex w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border text-[11px] font-bold tracking-wide sm:w-20 sm:text-sm ${
          riichi ? "border-amber bg-amber text-[#1a1408]" : "border-line bg-panel-2 text-ink-2/50"
        } disabled:opacity-35`}
      >
        <span className={`h-2 w-3/4 rounded-full ${riichi ? "bg-[#FFFBF2]" : "bg-line-2/60"}`} />
        <span>리치!</span>
      </button>
    </div>
  );
}
