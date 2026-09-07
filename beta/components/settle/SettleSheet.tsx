"use client";

import { useState } from "react";
import { AppButton } from "@/components/design-system/Button";
import { ConfirmDialog, Sheet } from "@/components/design-system/Sheet";
import { settle } from "@/lib/mahjong/scoring";
import { useGame } from "@/state/game-context";

export function SettleSheet({ onClose }: { onClose: () => void }) {
  const { state, restart } = useGame();
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  const rows = settle(state);
  const fc = state.settings.finalCalc;
  const title = state.ended ? (fc ? "최종 정산" : "최종 순위") : "현재 순위";

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
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        state.ended ? (
          <>
            <AppButton variant="ghost" className="flex-1" onClick={() => setConfirmingRestart(true)}>
              재시작
            </AppButton>
            <AppButton className="flex-1" onClick={onClose}>
              닫기
            </AppButton>
          </>
        ) : undefined
      }
    >
      <div className="overflow-hidden rounded-2xl border border-line">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-xs tracking-wide text-muted">
              <th className="px-3 py-2 text-left font-medium">순위</th>
              <th className="px-3 py-2 text-right font-medium">점수</th>
              {fc && <th className="px-3 py-2 text-right font-medium">정산</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.seat} className="border-b border-line last:border-0">
                <td className="px-3 py-3 text-left">
                  <span
                    className={`mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                      r.rank === 1 ? "border-amber bg-amber text-[#1a1408]" : "border-line-2 bg-panel-2 text-ink-2"
                    }`}
                  >
                    {r.rank}
                  </span>
                  <span className="font-semibold">{state.players[r.seat].name}</span>
                </td>
                <td className="px-3 py-3 text-right font-num text-lg font-semibold tabular-nums">{r.score}</td>
                {fc && (
                  <td
                    className={`px-3 py-3 text-right font-num font-semibold tabular-nums ${
                      r.pts > 0 ? "text-green" : r.pts < 0 ? "text-red" : ""
                    }`}
                  >
                    {r.pts > 0 ? "+" : ""}
                    {r.pts.toFixed(1)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs leading-relaxed text-muted">
        {fc
          ? `반환점 ${state.settings.oka} · 우마 ${state.settings.uma === "none" ? "없음" : state.settings.uma} · 소수점 처리 없음.`
          : "최종 정산 점수는 계산하지 않도록 설정되어 있습니다."}
        {state.kyotaku ? ` 공탁 ${state.kyotaku * 1000}점은 포함되지 않았습니다.` : ""}
      </p>
    </Sheet>
  );
}
