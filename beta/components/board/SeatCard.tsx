"use client";

import { deltaClass, sgn } from "@/lib/format";
import type { SeatIndex } from "@/lib/mahjong/types";
import type { PointerEvent as ReactPointerEvent } from "react";

interface SeatCardProps {
  seat: SeatIndex;
  wind: string;
  name: string;
  score: number;
  riichi: boolean;
  ended: boolean;
  flashDelta: number;
  onToggleRiichi: () => void;
  onCardPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onCardPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onCardPointerCancel: (e: ReactPointerEvent<HTMLDivElement>) => void;
}

export function SeatCard({
  seat,
  wind,
  name,
  score,
  riichi,
  ended,
  flashDelta,
  onToggleRiichi,
  onCardPointerDown,
  onCardPointerUp,
  onCardPointerCancel,
}: SeatCardProps) {
  return (
    <div
      className="card"
      data-seat={seat}
      onPointerDown={onCardPointerDown}
      onPointerUp={onCardPointerUp}
      onPointerCancel={onCardPointerCancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="who">
        <span className="wind">{wind}</span>
        <span className="pname">{name}</span>
      </div>
      <div className="scorebox">
        <div className={`score ${score < 0 ? "neg" : ""}`}>{score}</div>
        <div className={`flash ${deltaClass(flashDelta)}`}>{flashDelta ? sgn(flashDelta) : ""}</div>
        {!flashDelta && <div className="tip">눌러서 점수 차 보기</div>}
      </div>
      <button
        type="button"
        className={`rbtn ${riichi ? "on" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleRiichi();
        }}
        disabled={ended}
        aria-label="리치"
      >
        <span className="stick" />
        <span>리치!</span>
      </button>
    </div>
  );
}
