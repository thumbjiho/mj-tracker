"use client";

import { deltaClass, sgn } from "@/lib/format";
import { roundLabel, seatWind } from "@/lib/mahjong/game";
import type { GameState, SeatIndex } from "@/lib/mahjong/types";

interface PovCellProps {
  label: string;
  name: string;
  value: number;
  isMe?: boolean;
}

function PovCell({ label, name, value, isMe }: PovCellProps) {
  const kind = deltaClass(value);
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center ${
        isMe ? "border-amber-2 bg-panel-2" : "border-line bg-panel"
      }`}
    >
      <span className={`text-[11px] tracking-wide ${isMe ? "text-ink" : "text-muted"}`}>{label}</span>
      <span className={`max-w-full truncate text-sm font-semibold ${isMe ? "text-ink" : "text-ink-2"}`}>{name}</span>
      <span
        className={`font-num text-2xl font-bold tabular-nums ${
          isMe ? "text-amber" : kind === "up" ? "text-green" : kind === "down" ? "text-red" : "text-muted"
        }`}
      >
        {isMe ? value : value === 0 ? "±0" : sgn(value)}
      </span>
    </div>
  );
}

export function PovOverlay({
  state,
  seat,
  onClose,
}: {
  state: GameState;
  seat: SeatIndex;
  onClose: () => void;
}) {
  const me = state.players[seat];
  const toimen = ((seat + 2) % 4) as SeatIndex;
  const kami = ((seat + 3) % 4) as SeatIndex;
  const shimo = ((seat + 1) % 4) as SeatIndex;
  const rank =
    [0, 1, 2, 3]
      .sort((a, b) => state.players[b].score - state.players[a].score || a - b)
      .indexOf(seat) + 1;

  return (
    <div
      className="absolute inset-0 z-30 flex cursor-pointer items-center justify-center bg-[rgba(15,21,19,0.985)]"
      onClick={onClose}
    >
      <div
        className="grid w-[min(88vw,88vh)] grid-cols-3 grid-rows-3 gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div />
        <PovCell label="대면" name={state.players[toimen].name} value={me.score - state.players[toimen].score} />
        <div />
        <PovCell label="상가" name={state.players[kami].name} value={me.score - state.players[kami].score} />
        <div className="flex flex-col items-center justify-center text-center">
          <div className="font-num text-3xl leading-none font-bold text-ink">
            {rank}
            <small className="ml-1 font-ui text-sm font-semibold text-ink-2">위</small>
          </div>
          <div className="mt-1 font-cjk text-sm text-muted">{roundLabel(state)}</div>
          <div className="mt-1 text-xs text-muted">탭하면 닫힙니다</div>
        </div>
        <PovCell label="하가" name={state.players[shimo].name} value={me.score - state.players[shimo].score} />
        <div />
        <PovCell label={`${seatWind(state, seat)} · 나`} name={me.name} value={me.score} isMe />
        <div />
      </div>
    </div>
  );
}
