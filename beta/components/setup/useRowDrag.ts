"use client";

import { useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

/** Ports the alpha's .grip/.orow pointer-drag reordering (see the `drag`/`endDrag` code near the bottom of the source). */
export function useRowDrag<T>(order: T[], setOrder: (next: T[]) => void) {
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [moved, setMoved] = useState(0);

  function startDrag(idx: number, e: ReactPointerEvent<HTMLElement>) {
    const row = (e.currentTarget as HTMLElement).closest(".orow") as HTMLElement | null;
    if (!row) return;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore capture failures
    }
    e.preventDefault();

    // Scoped to this one drag gesture — no ref needed, since these listeners
    // are torn down before the next gesture (and thus the next closure) starts.
    let cur = order;
    let curIdx = idx;
    let startY = e.clientY;
    const rowH = row.getBoundingClientRect().height + 6;

    setDraggingIdx(idx);
    setMoved(0);

    function onPointerMove(ev: PointerEvent) {
      const dy = ev.clientY - startY;
      let nextMoved = dy;
      if (dy > rowH * 0.6 && curIdx < cur.length - 1) {
        const next = [...cur];
        [next[curIdx], next[curIdx + 1]] = [next[curIdx + 1], next[curIdx]];
        cur = next;
        setOrder(next);
        startY += rowH;
        curIdx += 1;
        nextMoved = dy - rowH;
      } else if (dy < -rowH * 0.6 && curIdx > 0) {
        const next = [...cur];
        [next[curIdx], next[curIdx - 1]] = [next[curIdx - 1], next[curIdx]];
        cur = next;
        setOrder(next);
        startY -= rowH;
        curIdx -= 1;
        nextMoved = dy + rowH;
      }
      setMoved(nextMoved);
      setDraggingIdx(curIdx);
    }

    function endDrag() {
      setDraggingIdx(null);
      setMoved(0);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", endDrag);
      document.removeEventListener("pointercancel", endDrag);
    }

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", endDrag);
    document.addEventListener("pointercancel", endDrag);
  }

  const rowProps = (idx: number) => ({
    className: `orow${draggingIdx === idx ? " drag" : ""}`,
    style: draggingIdx === idx ? { transform: `translateY(${moved}px)` } : undefined,
  });
  const gripProps = (idx: number) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => startDrag(idx, e),
  });

  return { rowProps, gripProps };
}
