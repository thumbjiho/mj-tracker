"use client";

import { useState } from "react";
import { Full } from "@/components/chrome/Full";
import { useEscapeKey } from "@/components/chrome/useEscapeKey";
import { sgn } from "@/lib/format";
import { dealer, seatWind } from "@/lib/mahjong/game";
import type { ChomboPay, SeatIndex } from "@/lib/mahjong/types";
import { useGame } from "@/state/game-context";

type Mode = "draw" | "chombo";

function SeatButton({
  seat,
  active,
  disabled,
  onClick,
}: {
  seat: SeatIndex;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const { state } = useGame();
  const d = dealer(state);
  return (
    <button
      type="button"
      className={`bopt ${active ? "on" : ""} ${seat === d ? "dealer" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="wind">{seatWind(state, seat)}</span>
      <span>{state.players[seat].name}</span>
      <span className="sub2">{state.players[seat].score}</span>
    </button>
  );
}

export function DrawSheet({ onDone }: { onDone: (ended: boolean) => void }) {
  const { state, confirmDraw, confirmChombo } = useGame();
  const [mode, setMode] = useState<Mode>("draw");
  const [tenpai, setTenpai] = useState<[boolean, boolean, boolean, boolean]>([false, false, false, false]);
  const [abortive, setAbortive] = useState(false);
  const [culprit, setCulprit] = useState<SeatIndex | null>(null);
  const [pay, setPay] = useState<ChomboPay>("flat");
  const d = dealer(state);
  const n = tenpai.filter(Boolean).length;
  const riichiCount = state.players.filter((p) => p.riichi).length;

  let text: string;
  if (mode === "chombo") {
    if (culprit == null) text = "쵼보한 사람을 고르세요";
    else {
      const split = pay === "split" && culprit !== d;
      const how = split ? `${state.players[culprit].name} -8000 · 親 +4000 · 子 +2000` : `${state.players[culprit].name} -9000 · 각 +3000`;
      text = `${how} · 본장 유지 · 같은 국 다시${riichiCount ? ` · 리치봉 ${riichiCount}개 반환` : ""}`;
    }
  } else if (abortive) text = "점수 이동 없음 · 본장 +1 · 親 유지";
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
    if (mode === "chombo") {
      if (culprit == null) return;
      const r = confirmChombo({ culprit, pay });
      onDone(r.ended);
      return;
    }
    const r = confirmDraw({ tenpai, abortive });
    onDone(r.ended);
  }

  useEscapeKey(() => onDone(false));

  const canConfirm = mode === "draw" || culprit != null;
  const q =
    mode === "chombo"
      ? "누가 쵼보를 했나요?"
      : abortive
        ? "도중 유국은 점수 이동 없이 본장만 올라갑니다"
        : "텐파이한 사람을 모두 고르세요";

  return (
    <Full
      title={mode === "chombo" ? "쵼보" : "유국"}
      dialog
      center
      onClose={() => onDone(false)}
      q={q}
      footer={
        <button type="button" className="primary" onClick={confirm} disabled={!canConfirm}>
          확정
        </button>
      }
    >
      <div className="seg">
        <button type="button" className={mode === "draw" ? "on" : ""} onClick={() => setMode("draw")}>
          유국
        </button>
        <button type="button" className={mode === "chombo" ? "on" : ""} onClick={() => setMode("chombo")}>
          쵼보
        </button>
      </div>

      {mode === "draw" ? (
        <>
          <div
            className={`switch ${abortive ? "on" : ""}`}
            role="switch"
            aria-checked={abortive}
            tabIndex={0}
            onClick={() => setAbortive((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                setAbortive((v) => !v);
              }
            }}
          >
            <span>
              도중 유국
              <small>구종구패 · 사풍연타 · 사가리치 · 사깡산료</small>
            </span>
            <span className="knob" />
          </div>
          {!abortive && (
            <div className="big c1">
              {([0, 1, 2, 3] as SeatIndex[]).map((i) => (
                <SeatButton key={i} seat={i} active={tenpai[i]} onClick={() => toggle(i)} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="big c1">
            {([0, 1, 2, 3] as SeatIndex[]).map((i) => (
              <SeatButton key={i} seat={i} active={culprit === i} onClick={() => setCulprit(i)} />
            ))}
          </div>
          <div className="lbl">
            <span>지불 방식</span>
          </div>
          <div className="seg">
            <button type="button" className={pay === "flat" ? "on" : ""} onClick={() => setPay("flat")}>
              각 3000
            </button>
            <button type="button" className={pay === "split" ? "on" : ""} onClick={() => setPay("split")}>
              親 4000 · 子 2000
            </button>
          </div>
          {pay === "split" && culprit === d && <div className="note">親이 쵼보한 경우에는 세 명에게 각 3000씩 지불합니다.</div>}
        </>
      )}

      <div className="sum">
        <div className="li">
          <span className="k">결과</span>
          <span className="v">{text}</span>
        </div>
      </div>
    </Full>
  );
}
