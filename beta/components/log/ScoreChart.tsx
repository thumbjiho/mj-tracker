"use client";

import { useEffect, useRef, useState } from "react";
import { chartSeries, paintChart } from "@/lib/chart";
import { SERIES } from "@/lib/mahjong/constants";
import type { GameState } from "@/lib/mahjong/types";

export function ScoreChart({ state }: { state: GameState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const pts = chartSeries(state);
  const names = state.players.map((p) => p.name);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    function draw() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv!.clientWidth || 600;
      const h = Math.round(Math.min(320, Math.max(200, w * 0.5)));
      cv!.width = Math.round(w * dpr);
      cv!.height = Math.round(h * dpr);
      cv!.style.height = `${h}px`;
      const ctx = cv!.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintChart(ctx, w, h, pts, names, state.settings.start, hover);
    }
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pts.length, names.join(","), state.settings.start, hover]);

  function pick(clientX: number) {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const padL = 44;
    const padR = 64;
    const rel = (clientX - rect.left - padL) / (rect.width - padL - padR);
    const i = Math.max(0, Math.min(pts.length - 1, Math.round(rel * (pts.length - 1))));
    setHover(i);
  }

  return (
    <div className="chart-wrap">
      <canvas
        ref={canvasRef}
        id="chart"
        onPointerDown={(e) => pick(e.clientX)}
        onPointerMove={(e) => {
          if (e.buttons) pick(e.clientX);
        }}
        onPointerLeave={() => setHover(null)}
      />
      <div className="lg">
        {names.map((nm, k) => (
          <span key={k}>
            <i style={{ background: SERIES[k] }} />
            {nm}
          </span>
        ))}
      </div>
    </div>
  );
}
