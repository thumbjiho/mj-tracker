"use client";

import { useEffect, useRef } from "react";
import { posOf } from "@/lib/mahjong/game";
import type { GameState, SeatIndex, WinType } from "@/lib/mahjong/types";

const POS_CLASS = ["bottom", "right", "top", "left"];
const SEAT_ROT = [0, -90, 180, 90];

export interface WinDragResolution {
  winner: SeatIndex;
  type?: WinType;
  loser?: SeatIndex;
  step: "type" | "points";
}

interface DragState {
  seat: SeatIndex;
  x0: number;
  y0: number;
  active: boolean;
  hov: HTMLElement | null;
  timer: ReturnType<typeof setTimeout>;
  over?: HTMLElement;
  ghost?: HTMLElement;
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

/**
 * Ports the alpha's drag-to-assign gesture almost verbatim: hold or drag a
 * seat's 화료 wedge onto another seat (ron), onto itself (tsumo), or onto the
 * center (manual step-by-step). A quick tap (no drag past the threshold)
 * falls through to opening the wizard at the "type" step, same as before.
 * Kept imperative/DOM-direct like the source — this gesture is inherently
 * about raw pointer coordinates and one-off overlay elements, not state.
 */
export function useWinDrag(state: GameState, onResolve: (r: WinDragResolution) => void, disabled: boolean) {
  const stateRef = useRef(state);
  const resolveRef = useRef(onResolve);
  const disabledRef = useRef(disabled);
  useEffect(() => {
    stateRef.current = state;
    resolveRef.current = onResolve;
    disabledRef.current = disabled;
  });
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    function wdragTarget(x: number, y: number): { kind: string; seat?: SeatIndex; el: HTMLElement } | null {
      const el = document.elementFromPoint(x, y);
      if (!el) return null;
      const z = (el as HTMLElement).closest(".wzone") as HTMLElement | null;
      if (!z) return null;
      const kind = z.dataset.kind as string;
      return kind === "ron" ? { kind, seat: Number(z.dataset.seat) as SeatIndex, el: z } : { kind, el: z };
    }

    function moveGhost(x: number, y: number) {
      const ghost = dragRef.current?.ghost;
      if (ghost) {
        ghost.style.left = `${x}px`;
        ghost.style.top = `${y}px`;
      }
    }

    function startWdrag() {
      const w = dragRef.current;
      if (!w || w.active) return;
      w.active = true;
      const s = stateRef.current;
      const rot = SEAT_ROT[posOf(s, w.seat)];
      const boardEl = document.querySelector(".board");
      if (!boardEl) return;
      const B = boardEl.getBoundingClientRect();
      const cell = B.width / 3;
      const IN = Math.max(5, Math.round(cell * 0.035));
      const cellRect = (cx: number, cy: number, cw = 1, ch = 1) => ({
        left: B.left + cx * cell,
        top: B.top + cy * cell,
        width: cell * cw,
        height: cell * ch,
      });
      const CELL: Record<string, [number, number, number, number]> = {
        top: [0, 0, 2, 1],
        right: [2, 0, 1, 2],
        bottom: [1, 2, 2, 1],
        left: [0, 1, 1, 2],
      };

      const ov = document.createElement("div");
      ov.className = "wover";
      const zone = (
        rect: { left: number; top: number; width: number; height: number },
        cls: string,
        kind: string,
        seat: number | null,
        html: string
      ) => {
        const z = document.createElement("div");
        z.className = `wzone ${cls}`;
        z.dataset.kind = kind;
        if (seat != null) z.dataset.seat = String(seat);
        z.style.left = `${rect.left + IN}px`;
        z.style.top = `${rect.top + IN}px`;
        z.style.width = `${rect.width - IN * 2}px`;
        z.style.height = `${rect.height - IN * 2}px`;
        z.innerHTML = `<div class="zl" style="transform:rotate(${rot}deg)">${html}</div>`;
        ov.appendChild(z);
      };

      s.players.forEach((p, i) => {
        const seat = i as SeatIndex;
        const pc = POS_CLASS[posOf(s, seat)];
        const r = cellRect(...CELL[pc]);
        if (seat === w.seat) zone(r, `me ${pc}`, "tsumo", seat, `<b>쯔모</b><span>${esc(p.name)} 본인</span>`);
        else zone(r, pc, "ron", seat, `<b>론</b><span>${esc(p.name)} 방총</span>`);
      });
      zone(cellRect(1, 1), "center", "manual", null, `<b>직접 설정</b><span>단계별 입력</span>`);

      document.body.appendChild(ov);
      w.over = ov;

      const g = document.createElement("div");
      g.className = "dghost";
      g.textContent = `${s.players[w.seat].name} 화료`;
      g.style.transform = `translate(-50%,-50%) rotate(${rot}deg) translateY(-160%)`;
      document.body.appendChild(g);
      w.ghost = g;
      moveGhost(w.x0, w.y0);
      if (navigator.vibrate) navigator.vibrate(10);
    }

    function endWdrag(type: string, clientX?: number, clientY?: number) {
      const w = dragRef.current;
      if (!w) return;
      clearTimeout(w.timer);
      dragRef.current = null;
      const t = w.active && type === "pointerup" ? wdragTarget(clientX ?? 0, clientY ?? 0) : null;
      w.ghost?.remove();
      w.over?.remove();
      if (type !== "pointerup") return;
      if (!w.active) {
        resolveRef.current({ winner: w.seat, step: "type" });
        return;
      }
      if (!t) return;
      if (t.kind === "manual") {
        resolveRef.current({ winner: w.seat, step: "type" });
      } else if (t.kind === "ron") {
        resolveRef.current({ winner: w.seat, type: "ron", loser: t.seat, step: "points" });
      } else {
        resolveRef.current({ winner: w.seat, type: "tsumo", step: "points" });
      }
    }

    function onPointerDown(e: PointerEvent) {
      if (disabledRef.current || stateRef.current.ended) return;
      const bar = (e.target as HTMLElement).closest(".pwb") as HTMLButtonElement | null;
      if (!bar || bar.disabled) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      const seat = Number(bar.dataset.seat) as SeatIndex;
      dragRef.current = { seat, x0: e.clientX, y0: e.clientY, active: false, hov: null, timer: setTimeout(startWdrag, 260) };
    }

    function onPointerMove(e: PointerEvent) {
      const w = dragRef.current;
      if (!w) return;
      if (!w.active && Math.hypot(e.clientX - w.x0, e.clientY - w.y0) > 10) {
        clearTimeout(w.timer);
        startWdrag();
      }
      if (!w.active) return;
      moveGhost(e.clientX, e.clientY);
      const t = wdragTarget(e.clientX, e.clientY);
      const el = t ? t.el : null;
      if (el !== w.hov) {
        w.hov?.classList.remove("hov");
        if (el) {
          el.classList.add("hov");
          if (navigator.vibrate) navigator.vibrate(6);
        }
        w.hov = el;
      }
    }

    const onPointerUp = (e: PointerEvent) => endWdrag("pointerup", e.clientX, e.clientY);
    const onPointerCancel = () => endWdrag("cancel");
    const onBlur = () => endWdrag("blur");
    const onVisibility = () => {
      if (document.hidden) endWdrag("hide");
    };
    const onContextMenu = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(".pwb")) e.preventDefault();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerCancel);
    document.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerCancel);
      document.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      const w = dragRef.current;
      if (w) {
        clearTimeout(w.timer);
        w.ghost?.remove();
        w.over?.remove();
      }
    };
  }, []);
}
