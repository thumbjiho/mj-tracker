"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { SeatIndex } from "@/lib/mahjong/types";

const HOLD_MS = 320;

interface PressState {
  seat: SeatIndex;
  held: boolean;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Ports the alpha's seat-card press handling: a short tap toggles the POV
 * overlay open/closed, holding past HOLD_MS opens it immediately and keeps
 * it open until release.
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
      if (pressRef.current) clearTimeout(pressRef.current.timer);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Safari sometimes throws for capture on a non-primary pointer; harmless to skip.
      }
      pressRef.current = {
        seat,
        held: false,
        timer: setTimeout(() => {
          const p = pressRef.current;
          if (p) {
            p.held = true;
            openPov(p.seat, true);
          }
        }, HOLD_MS),
      };
    },
    [openPov]
  );

  const onPointerUp = useCallback(() => endPress(true), [endPress]);
  const onPointerCancel = useCallback(() => endPress(false), [endPress]);

  return { povSeat, held, closePov, onPointerDown, onPointerUp, onPointerCancel };
}
