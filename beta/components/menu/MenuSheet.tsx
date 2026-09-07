"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/chrome/ConfirmDialog";
import { useEscapeKey } from "@/components/chrome/useEscapeKey";
import { useGame } from "@/state/game-context";

export function MenuSheet({
  onClose,
  onOpenSettle,
  onOpenLog,
  onOpenSettings,
  onExit,
}: {
  onClose: () => void;
  onOpenSettle: () => void;
  onOpenLog: () => void;
  onOpenSettings: () => void;
  onExit: () => void;
}) {
  const { state, goToSetup } = useGame();
  const [confirmingExit, setConfirmingExit] = useState(false);

  useEscapeKey(onClose, !confirmingExit);

  if (confirmingExit) {
    return (
      <ConfirmDialog
        title="나가기"
        text="게임을 끝내고 시작 화면으로 돌아갑니다. 현재 진행 상황과 기록은 사라집니다."
        okLabel="나가기"
        danger
        onCancel={() => setConfirmingExit(false)}
        onOk={() => {
          goToSetup();
          onExit();
        }}
      />
    );
  }

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="menu">
        <button type="button" className="mi" onClick={onOpenSettle}>
          <span className="ic">順</span>
          <span className="t">{state.settings.finalCalc ? "순위 · 최종 정산" : "순위"}</span>
        </button>
        <button type="button" className="mi" onClick={onOpenLog}>
          <span className="ic">記</span>
          <span className="t">
            기록 · 점수 그래프
            <span className="d">{state.log.length}건</span>
          </span>
        </button>
        <button type="button" className="mi" onClick={onOpenSettings}>
          <span className="ic">設</span>
          <span className="t">
            설정
            <span className="d">이름 · 규칙 · 현재 상황 수동 조정</span>
          </span>
        </button>
        <button type="button" className="mi sep" onClick={() => setConfirmingExit(true)}>
          <span className="ic">出</span>
          <span className="t">
            나가기
            <span className="d">게임을 끝내고 시작 화면으로</span>
          </span>
        </button>
      </div>
    </div>
  );
}
