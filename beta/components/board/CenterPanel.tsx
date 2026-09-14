"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
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

/** 화면 위치는 고정: 좌석 0 = bottom, 1 = right, 2 = top, 3 = left */
const POS_CLASS = ["bottom", "right", "top", "left"];

const TIMER_MS = 20_000;
const TIMER_HOLD_MS = 500;

/**
 * 가운데 원판(.pwc)을 길게 누르면 20초 부채꼴 타이머가 돌고, 다시 길게 누르면 꺼진다.
 * 원판은 pointer-events:none 이라 유국/메뉴 버튼 위에 얹혀 있어도 짧은 탭은 그대로
 * 버튼으로 간다. 길게 누름은 .pwm 컨테이너에서 감지하고, 성공하면 뒤따르는 click 을
 * 한 번 삼켜서 버튼이 눌리지 않게 한다.
 */
function useHoldTimer() {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const swallowClickRef = useRef(false);

  useEffect(() => {
    if (startedAt == null) return;
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - startedAt) / TIMER_MS);
      setProgress(p);
      if (p >= 1) {
        setStartedAt(null);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [startedAt]);

  const clearHold = useCallback(() => {
    if (holdRef.current) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
    }
    originRef.current = null;
  }, []);

  const insideDisc = (e: ReactPointerEvent<HTMLDivElement>) => {
    const disc = e.currentTarget.querySelector(".pwc");
    if (!disc) return false;
    const r = disc.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return Math.hypot(e.clientX - cx, e.clientY - cy) <= Math.min(r.width, r.height) / 2;
  };

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      clearHold();
      if (!insideDisc(e)) return;
      originRef.current = { x: e.clientX, y: e.clientY };
      holdRef.current = setTimeout(() => {
        holdRef.current = null;
        swallowClickRef.current = true;
        setProgress(0);
        setStartedAt((prev) => (prev == null ? Date.now() : null));
        if (navigator.vibrate) navigator.vibrate(12);
      }, TIMER_HOLD_MS);
    },
    [clearHold]
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const o = originRef.current;
      if (o && Math.hypot(e.clientX - o.x, e.clientY - o.y) > 12) clearHold();
    },
    [clearHold]
  );

  const onClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (swallowClickRef.current) {
      swallowClickRef.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  useEffect(() => clearHold, [clearHold]);

  return {
    running: startedAt != null,
    progress,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: clearHold,
      onPointerCancel: clearHold,
      onPointerLeave: clearHold,
      onClickCapture,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
}

/** 부채꼴(파이) SVG. progress 0→1 이 12시 방향부터 시계 방향으로 채워진다. */
function PieTimer({ progress }: { progress: number }) {
  const r = 50;
  const cx = 50;
  const cy = 50;
  const a = progress * Math.PI * 2;
  const x = cx + r * Math.sin(a);
  const y = cy - r * Math.cos(a);
  const large = progress > 0.5 ? 1 : 0;
  const d =
    progress >= 1
      ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
      : `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${large} 1 ${x} ${y} Z`;
  return (
    <svg className="pie" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} fill="rgba(232,85,63,.18)" />
      <path d={d} fill="var(--red)" />
    </svg>
  );
}

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
  const timer = useHoldTimer();
  const remain = Math.ceil((1 - timer.progress) * (TIMER_MS / 1000));

  return (
    <div className="card">
      <div className="c-in">
        <div className="pw">
          {[0, 1, 2, 3].map((pos) => {
            const seat = pos as SeatIndex;
            return (
              <button
                key={pos}
                type="button"
                className={`pwb ${POS_CLASS[pos]} ${seat === dealer ? "dealer" : ""}`}
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
          <div className="pwm" {...timer.handlers}>
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
            <div className={`pwc ${timer.running ? "timing" : ""}`} aria-live="polite">
              {timer.running ? (
                <>
                  <PieTimer progress={timer.progress} />
                  <div className="tsec">{remain}</div>
                </>
              ) : (
                <>
                  {tag && <span className="tag hot">{tag}</span>}
                  <div className="round">
                    {WINDS[roundWind]}
                    <b>{kyoku}</b>局
                  </div>
                  <StickRow honba={honba} kyotaku={kyotaku} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
