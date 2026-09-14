"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { SeatIndex } from "@/lib/mahjong/types";

const HOLD_MS = 200;

interface PressState {
  seat: SeatIndex;
  held: boolean;
  timer: ReturnType<typeof setTimeout>;
  cleanup: () => void;
}

/**
 * 좌석 카드 눌림 판정. 짧은 탭은 점수보기(POV)를 열고/닫고(토글), HOLD_MS 이상 누르면
 * 바로 열리고 손을 떼는 순간 닫힌다.
 *
 * 손을 떼는 이벤트는 카드가 아니라 document 에서 받는다. POV 오버레이가 열리면 손가락
 * 아래 요소가 카드에서 오버레이로 바뀌고, 브라우저에 따라(특히 iPad Safari) 포인터
 * 캡처가 걸리지 않아 카드의 pointerup 이 오지 않는 경우가 있었다 — 그러면 길게 누른 뒤
 * 떼도 POV 가 닫히지 않는 버그가 됐다.
 */
export function useSeatPress() {
  const [povSeat, setPovSeat] = useState<SeatIndex | null>(null);
  const [held, setHeld] = useState(false);
  const pressRef = useRef<PressState | null>(null);
  const povSeatRef = useRef<SeatIndex | null>(null);
  useEffect(() => {
    povSeatRef.current = povSeat;
  });

  const closePov = useCallback(() => {
    setPovSeat(null);
    setHeld(false);
  }, []);

  const openPov = useCallback((seat: SeatIndex, isHold: boolean) => {
    setPovSeat(seat);
    setHeld(isHold);
  }, []);

  const endPress = useCallback(
    (isPointerUp: boolean) => {
      const p = pressRef.current;
      if (!p) return;
      clearTimeout(p.timer);
      p.cleanup();
      pressRef.current = null;
      if (p.held) {
        if (povSeatRef.current === p.seat) closePov();
        return;
      }
      if (!isPointerUp) return;
      if (povSeatRef.current === p.seat) closePov();
      else openPov(p.seat, false);
    },
    [closePov, openPov]
  );

  const onPointerDown = useCallback(
    (seat: SeatIndex, e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      // 리치 버튼 위에서 시작한 터치는 점수보기 판정에서 제외한다 (버튼 탭이 POV를 열던 버그).
      if ((e.target as HTMLElement).closest(".rbtn")) return;
      if (pressRef.current) endPress(false);

      const pointerId = e.pointerId;
      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId === pointerId) endPress(true);
      };
      const onCancel = (ev: PointerEvent) => {
        if (ev.pointerId === pointerId) endPress(false);
      };
      const onBlur = () => endPress(false);
      document.addEventListener("pointerup", onUp, true);
      document.addEventListener("pointercancel", onCancel, true);
      window.addEventListener("blur", onBlur);
      const cleanup = () => {
        document.removeEventListener("pointerup", onUp, true);
        document.removeEventListener("pointercancel", onCancel, true);
        window.removeEventListener("blur", onBlur);
      };

      pressRef.current = {
        seat,
        held: false,
        cleanup,
        timer: setTimeout(() => {
          const p = pressRef.current;
          if (p) {
            p.held = true;
            openPov(p.seat, true);
          }
        }, HOLD_MS),
      };
    },
    [endPress, openPov]
  );

  useEffect(() => () => pressRef.current?.cleanup(), []);

  return { povSeat, held, closePov, onPointerDown };
}
