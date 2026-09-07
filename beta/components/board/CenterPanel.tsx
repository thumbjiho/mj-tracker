"use client";

import { WINDS } from "@/lib/mahjong/constants";
import type { SeatIndex } from "@/lib/mahjong/types";
import { StickRow } from "./StickRow";

interface CenterPanelProps {
  dealer: SeatIndex;
  names: string[];
  roundWind: number;
  kyoku: number;
  honba: number;
  kyotaku: number;
  ended: boolean;
  isOorasu: boolean;
  onDraw: () => void;
  onMenu: () => void;
}

const POS_CLASS = ["bottom", "right", "top", "left"];

export function CenterPanel({
  dealer,
  names,
  roundWind,
  kyoku,
  honba,
  kyotaku,
  ended,
  isOorasu,
  onDraw,
  onMenu,
}: CenterPanelProps) {
  const tag = ended ? "종료" : isOorasu ? "오라스" : null;

  return (
    <div className="card">
      <div className="c-in">
        <div className="pw">
          {[0, 1, 2, 3].map((pos) => {
            const seat = ((dealer + pos) % 4) as SeatIndex;
            return (
              <button
                key={pos}
                type="button"
                className={`pwb ${POS_CLASS[pos]}`}
                data-seat={seat}
                disabled={ended}
              >
                <span className="lab">
                  화료
                  <small>{names[seat]}</small>
                </span>
              </button>
            );
          })}
          <div className="pwm">
            <button type="button" className="pwm-top" disabled={ended} onClick={onDraw}>
              <span>
                <i>유</i>
                <i>국</i>
              </span>
            </button>
            <button type="button" className="pwm-bot" aria-label="메뉴" onClick={onMenu}>
              <span>
                <i>메</i>
                <i>뉴</i>
              </span>
            </button>
            <div className="pwc" aria-live="polite">
              {tag && <span className="tag hot">{tag}</span>}
              <div className="round">
                {WINDS[roundWind]}
                <b>{kyoku}</b>局
              </div>
              <StickRow honba={honba} kyotaku={kyotaku} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
