"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/chrome/ConfirmDialog";
import { Full } from "@/components/chrome/Full";
import { useEscapeKey } from "@/components/chrome/useEscapeKey";
import { settle } from "@/lib/mahjong/scoring";
import { useGame } from "@/state/game-context";

export function SettleSheet({ onClose }: { onClose: () => void }) {
  const { state, restart } = useGame();
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  const rows = settle(state);
  const fc = state.settings.finalCalc;
  const title = state.ended ? (fc ? "최종 정산" : "최종 순위") : "현재 순위";

  useEscapeKey(onClose, !confirmingRestart);

  if (confirmingRestart) {
    return (
      <ConfirmDialog
        title="재시작"
        text="같은 이름과 규칙으로 모두 25000점, 東1局부터 다시 시작합니다. 현재 기록은 사라집니다."
        okLabel="재시작"
        danger
        onCancel={() => setConfirmingRestart(false)}
        onOk={() => {
          restart();
          onClose();
        }}
      />
    );
  }

  return (
    <Full
      title={title}
      onClose={onClose}
      footer={
        state.ended ? (
          <>
            <button type="button" className="ghost" onClick={() => setConfirmingRestart(true)}>
              재시작
            </button>
            <button type="button" className="primary" onClick={onClose}>
              닫기
            </button>
          </>
        ) : undefined
      }
    >
      <table className="tbl">
        <thead>
          <tr>
            <th>순위</th>
            <th>점수</th>
            {fc && <th>정산</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.seat}>
              <td>
                <span className={`rank ${r.rank === 1 ? "top" : ""}`}>{r.rank}</span>
                {state.players[r.seat].name}
              </td>
              <td>{r.score}</td>
              {fc && <td className={r.pts > 0 ? "up" : r.pts < 0 ? "down" : ""}>{r.pts > 0 ? "+" : ""}{r.pts.toFixed(1)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="note">
        {fc
          ? `반환점 ${state.settings.oka} · 우마 ${state.settings.uma === "none" ? "없음" : state.settings.uma} · 소수점 처리 없음.`
          : "최종 정산 점수는 계산하지 않도록 설정되어 있습니다."}
        {state.kyotaku ? ` 공탁 ${state.kyotaku * 1000}점은 포함되지 않았습니다.` : ""}
      </div>
    </Full>
  );
}
