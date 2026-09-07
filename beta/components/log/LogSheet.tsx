"use client";

import { useState } from "react";
import { Full } from "@/components/chrome/Full";
import { useEscapeKey } from "@/components/chrome/useEscapeKey";
import { chartSeries, paintChart } from "@/lib/chart";
import { sgn } from "@/lib/format";
import { SERIES } from "@/lib/mahjong/constants";
import { roundLabel } from "@/lib/mahjong/game";
import { settle } from "@/lib/mahjong/scoring";
import { useGame } from "@/state/game-context";
import { ScoreChart } from "./ScoreChart";

/** Ports exportImage(): renders a shareable PNG summary (chart + standings). */
async function renderSummaryPng(state: ReturnType<typeof useGame>["state"]): Promise<string> {
  const pts = chartSeries(state);
  const names = state.players.map((p) => p.name);
  const W = 1200;
  const H = 760;
  const dpr = 2;
  const cv = document.createElement("canvas");
  cv.width = W * dpr;
  cv.height = H * dpr;
  const ctx = cv.getContext("2d") as CanvasRenderingContext2D;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#0F1513";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#ECE6D6";
  ctx.font = '600 26px "IBM Plex Sans KR",system-ui,sans-serif';
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const dt = new Date(state.started || Date.now());
  const ds = `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
  ctx.fillText("리치 점봉판 · 점수 변동", 40, 40);
  ctx.fillStyle = "#7F908A";
  ctx.font = '16px "IBM Plex Sans KR",system-ui,sans-serif';
  ctx.textAlign = "right";
  ctx.fillText(
    `${ds} · ${state.settings.length === "ton" ? "동풍전" : "반장"} · ${state.ended ? "종료" : roundLabel(state)}`,
    W - 40,
    40
  );
  ctx.save();
  ctx.translate(40, 70);
  paintChart(ctx, W - 80, 420, pts, names, state.settings.start, null, "#182220");
  ctx.restore();

  const rows = settle(state);
  const fc = state.settings.finalCalc;
  const y0 = 520;
  ctx.textAlign = "left";
  ctx.font = '13px "IBM Plex Sans KR",system-ui,sans-serif';
  ctx.fillStyle = "#7F908A";
  ctx.fillText("순위", 40, y0);
  ctx.textAlign = "right";
  ctx.fillText("점수", fc ? W - 260 : W - 40, y0);
  if (fc) ctx.fillText("정산", W - 40, y0);
  rows.forEach((r, i) => {
    const yy = y0 + 34 + i * 46;
    ctx.strokeStyle = "rgba(185,194,187,.15)";
    ctx.beginPath();
    ctx.moveTo(40, yy + 22);
    ctx.lineTo(W - 40, yy + 22);
    ctx.stroke();
    ctx.fillStyle = SERIES[r.seat];
    ctx.beginPath();
    ctx.arc(52, yy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ECE6D6";
    ctx.textAlign = "left";
    ctx.font = '600 20px "IBM Plex Sans KR",system-ui,sans-serif';
    ctx.fillText(`${r.rank}위  ${names[r.seat]}`, 72, yy);
    ctx.font = '700 26px Rajdhani,"IBM Plex Sans KR",sans-serif';
    ctx.textAlign = "right";
    ctx.fillStyle = "#F5B342";
    ctx.fillText(String(r.score), fc ? W - 260 : W - 40, yy);
    if (fc) {
      ctx.fillStyle = r.pts > 0 ? "#4CB98A" : r.pts < 0 ? "#E8553F" : "#7F908A";
      ctx.fillText((r.pts > 0 ? "+" : "") + r.pts.toFixed(1), W - 40, yy);
    }
  });
  return cv.toDataURL("image/png");
}

export function LogSheet({ onClose }: { onClose: () => void }) {
  const game = useGame();
  const { state } = game;
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const rows = [...state.log].reverse();

  useEscapeKey(onClose);

  async function exportImage() {
    const url = await renderSummaryPng(state);
    try {
      if (navigator.canShare) {
        const blob = await (await fetch(url)).blob();
        const file = new File([blob], "riichi-score.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "리치 점봉판" });
          return;
        }
      }
    } catch {
      // fall through to the in-page preview
    }
    setImageUrl(url);
  }

  if (imageUrl) {
    return (
      <Full
        title="이미지로 저장"
        footer={
          <button type="button" className="primary" onClick={() => setImageUrl(null)}>
            기록으로 돌아가기
          </button>
        }
      >
        <div className="imgview">
          {/* eslint-disable-next-line @next/next/no-img-element -- locally generated data: URL, next/image can't optimize it */}
          <img src={imageUrl} alt="점수 변동 그래프와 순위" />
          <div className="note">이미지를 길게 눌러 저장하거나 복사하세요.</div>
        </div>
      </Full>
    );
  }

  return (
    <Full title="기록" onClose={onClose}>
      <ScoreChart state={state} />
      <div className="f-foot" style={{ padding: 0 }}>
        <button type="button" className="ghost" onClick={exportImage}>
          이미지로 저장
        </button>
      </div>
      <div>
        {rows.length === 0 ? (
          <div className="note">아직 기록이 없습니다.</div>
        ) : (
          rows.map((e, i) => (
            <div className="lrow" key={i}>
              <span className="r">{e.round}</span>
              <span>{e.text}</span>
              {e.deltas && (
                <span className="d">
                  {e.deltas.map((v, k) => (
                    <span key={k} className={v > 0 ? "up" : v < 0 ? "down" : ""}>
                      {v ? sgn(v) : "-"}
                    </span>
                  ))}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </Full>
  );
}
