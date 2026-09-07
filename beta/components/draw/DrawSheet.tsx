"use client";

import { useState } from "react";
import { AppButton, SeatOptionButton } from "@/components/design-system/Button";
import { Sheet } from "@/components/design-system/Sheet";
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

  return (
    <Sheet
      title="유국"
      onClose={() => onDone(false)}
      question="텐파이한 사람을 모두 고르세요"
      footer={<AppButton onClick={confirm}>확정</AppButton>}
    >
      {([0, 1, 2, 3] as SeatIndex[]).map((i) => (
        <SeatOptionButton
          key={i}
          wind={seatWind(state, i)}
          name={state.players[i].name}
          dealer={i === d}
          active={tenpai[i]}
          disabled={abortive}
          onClick={() => toggle(i)}
        />
      ))}
      <label className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-3.5 text-sm">
        <input
          type="checkbox"
          checked={abortive}
          onChange={(e) => setAbortive(e.target.checked)}
          className="h-5 w-5 accent-amber"
        />
        도중 유국 (구종구패 · 사풍연타 · 사가리치 · 사깡산료)
      </label>
      <div className="flex items-center justify-between rounded-2xl border border-line bg-panel px-3.5 py-2.5">
        <span className="text-sm text-muted">결과</span>
        <span className="text-right text-sm font-semibold text-ink">{text}</span>
      </div>
    </Sheet>
  );
}
