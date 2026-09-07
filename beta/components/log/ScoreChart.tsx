"use client";

import { useEffect, useRef, useState } from "react";
import { SERIES } from "@/lib/mahjong/constants";
import type { GameState } from "@/lib/mahjong/types";

interface ChartPoint {
  label: string;
  scores: number[];
}

function chartSeries(state: GameState): ChartPoint[] {
  const pts: ChartPoint[] = [];
  const first = state.log[0];
  if (first && first.kind === "start") pts.push({ label: "시작", scores: first.scores });
  else pts.push({ label: "시작", scores: state.players.map(() => state.settings.start) });
  state.log.forEach((e) => {
    if (e.kind === "hand" || e.kind === "manual") pts.push({ label: e.sr, scores: e.scores });
  });
  return pts;
}

function paintChart(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pts: ChartPoint[],
  names: string[],
  startScore: number,
  hover: number | null
) {
  const padL = 44;
  const padR = 64;
  const padT = 14;
  const padB = 28;
  const all = pts.flatMap((p) => p.scores);
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  const step = hi - lo > 40000 ? 10000 : 5000;
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  if (hi === lo) hi = lo + step;
  const n = pts.length;
  const x = (i: number) => padL + (n > 1 ? ((w - padL - padR) * i) / (n - 1) : (w - padL - padR) / 2);
  const y = (v: number) => padT + (h - padT - padB) * (1 - (v - lo) / (hi - lo));

  ctx.clearRect(0, 0, w, h);
  ctx.font = '12px "IBM Plex Sans KR",system-ui,sans-serif';
  ctx.textBaseline = "middle";
  for (let v = lo; v <= hi; v += step) {
    ctx.strokeStyle = "rgba(185,194,187,.14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, y(v));
    ctx.lineTo(w - padR, y(v));
    ctx.stroke();
    ctx.fillStyle = "#7F908A";
    ctx.textAlign = "right";
    ctx.fillText(`${v / 1000}k`, padL - 8, y(v));
  }
  if (startScore > lo && startScore < hi) {
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = "rgba(236,230,214,.35)";
    ctx.beginPath();
    ctx.moveTo(padL, y(startScore));
    ctx.lineTo(w - padR, y(startScore));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.textAlign = "center";
  ctx.fillStyle = "#7F908A";
  const every = Math.max(1, Math.ceil(n / 8));
  pts.forEach((p, i) => {
    if (i % every === 0 || i === n - 1) ctx.fillText(p.label, x(i), h - padB / 2);
  });
  if (hover != null) {
    ctx.strokeStyle = "rgba(236,230,214,.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x(hover), padT);
    ctx.lineTo(x(hover), h - padB);
    ctx.stroke();
  }
  names.forEach((_, k) => {
    ctx.strokeStyle = SERIES[k];
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    pts.forEach((pt, i) => (i ? ctx.lineTo(x(i), y(pt.scores[k])) : ctx.moveTo(x(i), y(pt.scores[k]))));
    ctx.stroke();
    const li = n - 1;
    ctx.fillStyle = SERIES[k];
    ctx.beginPath();
    ctx.arc(x(li), y(pts[li].scores[k]), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#182220";
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  const ends = names
    .map((_, k) => ({ k, y: y(pts[n - 1].scores[k]) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
  ctx.textAlign = "left";
  ctx.font = '600 12px "IBM Plex Sans KR",system-ui,sans-serif';
  ends.forEach((e) => {
    ctx.fillStyle = "#ECE6D6";
    ctx.fillText(names[e.k].slice(0, 6), w - padR + 10, e.y);
  });
  if (hover != null) {
    const pt = pts[hover];
    const bw = 132;
    const bh = 18 * 4 + 26;
    let bx = x(hover) + 10;
    if (bx + bw > w - padR) bx = x(hover) - bw - 10;
    const by = padT + 4;
    ctx.fillStyle = "rgba(15,21,19,.94)";
    ctx.strokeStyle = "rgba(59,82,76,1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 8);
    else ctx.rect(bx, by, bw, bh);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#7F908A";
    ctx.font = '12px "IBM Plex Sans KR",system-ui,sans-serif';
    ctx.textAlign = "left";
    ctx.fillText(pt.label, bx + 10, by + 13);
    names.forEach((nm, k) => {
      const yy = by + 30 + k * 18;
      ctx.fillStyle = SERIES[k];
      ctx.beginPath();
      ctx.arc(bx + 13, yy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ECE6D6";
      ctx.textAlign = "left";
      ctx.fillText(nm.slice(0, 5), bx + 22, yy);
      ctx.textAlign = "right";
      ctx.font = '600 12px Rajdhani,"IBM Plex Sans KR",sans-serif';
      ctx.fillText(String(pt.scores[k]), bx + bw - 10, yy);
      ctx.font = '12px "IBM Plex Sans KR",system-ui,sans-serif';
    });
  }
}

export function ScoreChart({ state }: { state: GameState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const pts = chartSeries(state);
  const names = state.players.map((p) => p.name);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth || 320;
    const h = Math.round(Math.min(320, Math.max(200, w * 0.5)));
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    cv.style.height = `${h}px`;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintChart(ctx, w, h, pts, names, state.settings.start, hover);
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
    <div className="rounded-2xl border border-line bg-panel p-3">
      <canvas
        ref={canvasRef}
        className="block w-full touch-pan-y"
        onPointerDown={(e) => pick(e.clientX)}
        onPointerMove={(e) => {
          if (e.buttons) pick(e.clientX);
        }}
        onPointerLeave={() => setHover(null)}
      />
      <div className="mt-2 flex flex-wrap gap-3.5 text-xs text-ink-2">
        {names.map((nm, k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: SERIES[k] }} />
            {nm}
          </span>
        ))}
      </div>
    </div>
  );
}
