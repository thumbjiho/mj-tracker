"use client";

import { WINDS } from "@/lib/mahjong/constants";
import type { SeatIndex } from "@/lib/mahjong/types";
import styles from "./board.module.css";
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
  onWinFor: (seat: SeatIndex) => void;
  onDraw: () => void;
  onMenu: () => void;
}

const WEDGE_CLASS = [styles.wedgeBottom, styles.wedgeRight, styles.wedgeTop, styles.wedgeLeft];

export function CenterPanel({
  dealer,
  names,
  roundWind,
  kyoku,
  honba,
  kyotaku,
  ended,
  isOorasu,
  onWinFor,
  onDraw,
  onMenu,
}: CenterPanelProps) {
  const tag = ended ? "종료" : isOorasu ? "오라스" : null;

  return (
    <div className={styles.card}>
      <div className={styles.wheel}>
        {[0, 1, 2, 3].map((pos) => {
          const seat = ((dealer + pos) % 4) as SeatIndex;
          return (
            <button
              key={pos}
              type="button"
              disabled={ended}
              onClick={() => onWinFor(seat)}
              className={`${styles.wedge} ${WEDGE_CLASS[pos]} bg-amber font-ui font-bold text-[#1a1408] disabled:opacity-40`}
            >
              <span className={`${styles.wedgeLabel} flex flex-col items-center gap-0.5 leading-none`}>
                화료
                <small className="text-[0.6em] font-semibold opacity-75">{names[seat]}</small>
              </span>
            </button>
          );
        })}

        <div className={styles.middle}>
          <button
            type="button"
            disabled={ended}
            onClick={onDraw}
            className={`${styles.middleSlot} flex items-center justify-center border border-red/45 bg-red/10 font-ui text-base font-extrabold text-red/70 disabled:opacity-40`}
          >
            유국
          </button>
          <button
            type="button"
            onClick={onMenu}
            aria-label="메뉴"
            className={`${styles.middleSlot} flex items-center justify-center border border-line-2 bg-panel font-ui text-base font-extrabold text-ink-2/40`}
          >
            메뉴
          </button>

          <div className={`${styles.circle} border border-line-2 bg-panel-2 shadow-lg`}>
            {tag && (
              <span
                className={`mb-1 rounded-full border px-2 py-0.5 text-[10px] tracking-wide sm:text-[11px] ${
                  tag === "종료" ? "border-line-2 text-muted" : "border-red text-red"
                }`}
              >
                {tag}
              </span>
            )}
            <div className="font-cjk text-xl leading-none sm:text-3xl">
              {WINDS[roundWind]}
              <b className="mx-1 font-num text-amber">{kyoku}</b>局
            </div>
            <div className="mt-1.5">
              <StickRow honba={honba} kyotaku={kyotaku} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
