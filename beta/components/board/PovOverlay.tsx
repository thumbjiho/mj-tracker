"use client";

import { useState } from "react";
import { deltaClass, sgn } from "@/lib/format";
import { posOf, riichiWord, roundLabel, seatWind } from "@/lib/mahjong/game";
import type { GameState, SeatIndex } from "@/lib/mahjong/types";

const SEAT_ROT = [0, -90, 180, 90];

function computeMetrics(rot: number) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const sw = Math.abs(rot) === 90;
  const w = sw ? H : W;
  const h = sw ? W : H;
  const side = Math.min(w, h) - Math.round(Math.min(w, h) * 0.06);
  const cell = Math.floor(side / 3);
  return { w, h, side, cell };
}

export function PovOverlay({
  state,
  seat,
  hold,
  onClose,
}: {
  state: GameState;
  seat: SeatIndex;
  hold: boolean;
  onClose: () => void;
}) {
  const rot = SEAT_ROT[posOf(state, seat)];
  // 닫기는 click 이 아니라 pointerup 으로 받는다. 터치에서는 POV 를 연 탭의 합성 click 이
  // 새로 생긴 오버레이에 떨어져 곧바로 닫혀 버렸다(깜빡임). pointerup 은 연 탭에서는
  // 카드 쪽에서 이미 소비됐으므로 오버레이에는 다음 탭부터 도달한다.
  // Matches the alpha exactly: computed once at open time, not recalculated on resize.
  const [{ w, h, side, cell }] = useState(() => computeMetrics(rot));
  const me = state.players[seat];
  const toimen = ((seat + 2) % 4) as SeatIndex;
  const kami = ((seat + 3) % 4) as SeatIndex;
  const shimo = ((seat + 1) % 4) as SeatIndex;
  const rank =
    [0, 1, 2, 3].sort((a, b) => state.players[b].score - state.players[a].score || a - b).indexOf(seat) + 1;

  const relCell = (j: SeatIndex, cls: string, label: string) => {
    const df = me.score - state.players[j].score;
    return (
      <div className={`pv ${cls}`} key={cls}>
        <span className="rel">{label}</span>
        <span className="nm">{state.players[j].name}</span>
        <span className={`df ${deltaClass(df)}`}>{df === 0 ? "±0" : sgn(df)}</span>
        <span className="sc">{state.players[j].score}</span>
      </div>
    );
  };

  return (
    <div className="pov" onPointerUp={onClose}>
      <div
        className="pov-in"
        style={{ width: w, height: h, transform: `translate(-50%,-50%) rotate(${rot}deg)` }}
      >
        <div className="pgrid" style={{ width: side, height: side, "--cell": `${cell}px` } as React.CSSProperties}>
          {relCell(toimen, "toimen", "대면")}
          {relCell(kami, "kami", "상가")}
          {relCell(shimo, "shimo", "하가")}
          <div className="pv mid">
            <span className="rk">
              {rank}
              <small>위</small>
            </span>
            <span className="rd">{roundLabel(state)}</span>
            {!hold && <span className="hint">탭하면 닫힙니다</span>}
          </div>
          <div className="pv me">
            <span className="rel">{seatWind(state, seat)} · 나</span>
            <span className="nm">{me.name}</span>
            <span className="df">{me.score}</span>
            <span className="sc">{me.riichi ? `${riichiWord(me.name)} 중` : state.kyotaku ? `공탁 ${state.kyotaku}` : " "}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
