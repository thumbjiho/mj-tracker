"use client";

import { useState } from "react";
import { ConfirmDialog, Sheet } from "@/components/design-system/Sheet";
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
    <Sheet title="메뉴" onClose={onClose} small>
      <MenuItem icon="順" title={state.settings.finalCalc ? "순위 · 최종 정산" : "순위"} onClick={onOpenSettle} />
      <MenuItem icon="記" title="기록 · 점수 그래프" desc={`${state.log.length}건`} onClick={onOpenLog} />
      <MenuItem icon="設" title="설정" desc="이름 · 규칙 · 현재 상황 수동 조정" onClick={onOpenSettings} />
      <MenuItem icon="出" title="나가기" desc="게임을 끝내고 시작 화면으로" onClick={() => setConfirmingExit(true)} danger />
    </Sheet>
  );
}

function MenuItem({
  icon,
  title,
  desc,
  onClick,
  danger,
}: {
  icon: string;
  title: string;
  desc?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3.5 rounded-2xl border bg-panel px-3 py-3 text-left ${
        danger ? "border-red/40" : "border-line"
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-panel-2 font-cjk text-sm text-ink-2">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-medium ${danger ? "text-red" : "text-ink"}`}>{title}</span>
        {desc && <span className="block truncate text-xs text-muted">{desc}</span>}
      </span>
    </button>
  );
}
