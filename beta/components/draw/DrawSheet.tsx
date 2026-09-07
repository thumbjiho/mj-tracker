"use client";

import { useState } from "react";
import { Full } from "@/components/chrome/Full";
import { useEscapeKey } from "@/components/chrome/useEscapeKey";
import { sgn } from "@/lib/format";
import { dealer, seatWind } from "@/lib/mahjong/game";
import type { SeatIndex } from "@/lib/mahjong/types";
import { useGame } from "@/state/game-context";

export function DrawSheet({ onDone }: { onDone: (ended: boolean) => void }) {
  const { state, confirmDraw } = useGame();
  const [tenpai, setTenpai] = useState<[boolean, boolean, boolean, boolean]>([false, false, false, false]);
  const [abortive, setAbortive] = useState(false);
  const d = dealer(state);
  const n = tenpai.filter(Boolean).length;

  let text: string;
  if (abortive) text = "점수 이동 없음 · 본장 +1 · 親 유지";
  else if (n === 0 || n === 4) text = `점수 이동 없음 · 본장 +1 · ${tenpai[d] ? "親 유지" : "親 이동"}`;
  else text = `텐파이 ${sgn(3000 / n)} · 노텐 ${sgn(-3000 / (4 - n))} · 본장 +1 · ${tenpai[d] ? "親 유지" : "親 이동"}`;

  function toggle(seat: SeatIndex) {
    setTenpai((prev) => {
      const next = [...prev] as [boolean, boolean, boolean, boolean];
      next[seat] = !next[seat];
      return next;
    });
  }

  function confirm() {
    const r = confirmDraw({ tenpai, abortive });
    onDone(r.ended);
  }

  useEscapeKey(() => onDone(false));

  return (
    <Full title="유국" dialog center onClose={() => onDone(false)} q="텐파이한 사람을 모두 고르세요" footer={
      <button type="button" className="primary" onClick={confirm}>
        확정
      </button>
    }>
      <div className="big c1">
        {([0, 1, 2, 3] as SeatIndex[]).map((i) => (
          <button
            key={i}
            type="button"
            className={`bopt ${tenpai[i] ? "on" : ""} ${i === d ? "dealer" : ""}`}
            disabled={abortive}
            onClick={() => toggle(i)}
          >
            <span className="wind">{seatWind(state, i)}</span>
            <span>{state.players[i].name}</span>
            <span className="sub2">{state.players[i].score}</span>
          </button>
        ))}
      </div>
      <label className="check">
        <input type="checkbox" checked={abortive} onChange={(e) => setAbortive(e.target.checked)} /> 도중 유국 (구종구패 ·
        사풍연타 · 사가리치 · 사깡산료)
      </label>
      <div className="sum">
        <div className="li">
          <span className="k">결과</span>
          <span className="v">{text}</span>
        </div>
      </div>
    </Full>
  );
}
