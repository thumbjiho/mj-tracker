"use client";

import { WINDS } from "@/lib/mahjong/constants";
import type { ManualState } from "@/lib/mahjong/game";
import type { SeatIndex } from "@/lib/mahjong/types";

export interface ManualRow {
  /** original seat index — used to look up/update manual.scores */
  seat: SeatIndex;
  /** display position 0-3 — decides the wind badge and dealer highlight */
  pos: number;
  name: string;
}

/**
 * Shared 장풍/국/본장/공탁/각자 점수 block, used by both the "새 게임 → 이어서"
 * screen and the settings sheet's "현재 상태" tab (ported from the alpha's
 * shared stateFields()). Callers own useManualScores() so they can also use
 * `balanced`/`total`/`expect` for their own footer button text.
 */
export function ManualStateFields({
  manual,
  setManual,
  setScore,
  setKyotaku,
  isAuto,
  total,
  expect,
  balanced,
  rows,
}: {
  manual: ManualState;
  setManual: (m: ManualState) => void;
  setScore: (seat: SeatIndex, value: number) => void;
  setKyotaku: (value: number) => void;
  isAuto: (seat: SeatIndex) => boolean;
  total: number;
  expect: number;
  balanced: boolean;
  rows: ManualRow[];
}) {
  const dealerPos = (manual.kyoku - 1) % 4;

  return (
    <>
      <div className="lbl">
        <span>장풍</span>
      </div>
      <div className="seg">
        {[0, 1, 2].map((v) => (
          <button key={v} type="button" className={manual.roundWind === v ? "on" : ""} onClick={() => setManual({ ...manual, roundWind: v })}>
            {WINDS[v]}장
          </button>
        ))}
      </div>

      <div className="lbl">
        <span>국</span>
      </div>
      <div className="seg">
        {[1, 2, 3, 4].map((v) => (
          <button key={v} type="button" className={manual.kyoku === v ? "on" : ""} onClick={() => setManual({ ...manual, kyoku: v })}>
            {v}국
          </button>
        ))}
      </div>

      <div className="row2">
        <div>
          <div className="lbl">
            <span>본장</span>
          </div>
          <div className="stp">
            <button
              type="button"
              className="stp-b"
              onClick={() => setManual({ ...manual, honba: Math.max(0, manual.honba - 1) })}
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={manual.honba}
              onChange={(e) => setManual({ ...manual, honba: Math.max(0, Number(e.target.value) || 0) })}
            />
            <button type="button" className="stp-b" onClick={() => setManual({ ...manual, honba: manual.honba + 1 })}>
              +
            </button>
          </div>
        </div>
        <div>
          <div className="lbl">
            <span>공탁 리치봉</span>
          </div>
          <div className="stp">
            <button type="button" className="stp-b" onClick={() => setKyotaku(manual.kyotaku - 1)}>
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={manual.kyotaku}
              onChange={(e) => setKyotaku(Number(e.target.value) || 0)}
            />
            <button type="button" className="stp-b" onClick={() => setKyotaku(manual.kyotaku + 1)}>
              +
            </button>
          </div>
        </div>
      </div>

      <div className="lbl">
        <span>각자 점수</span>
        <span>
          {balanced ? (
            `합계 ${total} ✓`
          ) : (
            <span style={{ color: "var(--red)" }}>{`합계 ${total} (기준 ${expect})`}</span>
          )}
        </span>
      </div>
      <div className="mrows">
        {rows.map(({ seat, pos, name }) => (
          <div className="mrow" key={seat}>
            <span className={`wind ${dealerPos === pos ? "dl" : ""}`}>{WINDS[pos]}</span>
            <span className="mname">{name}</span>
            <input
              type="number"
              inputMode="numeric"
              step={100}
              className={isAuto(seat) ? "auto" : ""}
              value={manual.scores[seat]}
              onChange={(e) => setScore(seat, Number(e.target.value) || 0)}
            />
          </div>
        ))}
      </div>
    </>
  );
}
