"use client";

import { useState } from "react";
import { AppButton, SegmentedControl } from "@/components/design-system/Button";
import { ConfirmDialog, Sheet } from "@/components/design-system/Sheet";
import { RuleFields } from "@/components/setup/RuleFields";
import { WINDS } from "@/lib/mahjong/constants";
import type { ManualState, SettingsUpdate } from "@/lib/mahjong/game";
import type { GameSettings, SeatIndex } from "@/lib/mahjong/types";
import { useGame } from "@/state/game-context";

type Tab = "game" | "state";

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { state, saveSettings, restart, showToast } = useGame();
  const [tab, setTab] = useState<Tab>("game");
  const [names, setNames] = useState<string[]>(state.players.map((p) => p.name));
  const [settings, setSettings] = useState<GameSettings>(state.settings);
  const [order, setOrder] = useState<SeatIndex[]>([0, 1, 2, 3]);
  const [manual, setManual] = useState<ManualState>({
    roundWind: state.roundWind,
    kyoku: state.kyoku,
    honba: state.honba,
    kyotaku: state.kyotaku,
    scores: state.players.map((p) => p.score),
  });
  const [reopenIfEnded, setReopenIfEnded] = useState(false);
  const [confirmingRestart, setConfirmingRestart] = useState(false);

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

  function moveOrder(pos: number, dir: -1 | 1) {
    setOrder((prev) => {
      const next = [...prev];
      const target = pos + dir;
      if (target < 0 || target > 3) return prev;
      [next[pos], next[target]] = [next[target], next[pos]];
      return next;
    });
  }

  function handleSave() {
    const update: SettingsUpdate = {
      names: names.map((n) => n.trim() || null),
      settings,
      order,
      manual: { ...manual, reopenIfEnded },
    };
    saveSettings(update);
    showToast("저장했습니다");
    onClose();
  }

  const dealerPos = (manual.kyoku - 1) % 4;

  return (
    <Sheet
      title="설정"
      onClose={onClose}
      footer={
        <AppButton onClick={handleSave}>저장</AppButton>
      }
    >
      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "game", label: "게임 설정" },
          { value: "state", label: "현재 상태" },
        ]}
      />

      {tab === "game" ? (
        <>
          <p className="text-xs tracking-wide text-muted">플레이어</p>
          {([0, 1, 2, 3] as const).map((i) => (
            <div key={i} className="flex h-14 items-center gap-2 rounded-2xl border border-line bg-panel px-3">
              <span className="rounded-md border border-line px-2 py-1 font-cjk text-lg leading-none text-ink-2">
                {WINDS[i]}
              </span>
              <input
                type="text"
                value={names[i]}
                maxLength={12}
                onChange={(e) => setNames((prev) => prev.map((n, k) => (k === i ? e.target.value : n)))}
                className="w-full flex-1 bg-transparent text-base font-semibold text-ink focus:outline-none"
              />
            </div>
          ))}
          <RuleFields settings={settings} onChange={setSettings} />
          <button
            type="button"
            onClick={() => setConfirmingRestart(true)}
            className="mt-2 rounded-2xl border border-line-2 bg-panel px-4 py-3.5 text-sm font-semibold text-ink"
          >
            재시작
          </button>
        </>
      ) : (
        <>
          <p className="text-xs tracking-wide text-muted">장풍</p>
          <div className="flex overflow-hidden rounded-xl border border-line">
            {[0, 1, 2].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setManual((m) => ({ ...m, roundWind: v }))}
                className={`flex-1 px-2 py-3 text-sm font-medium ${
                  manual.roundWind === v ? "bg-ink font-semibold text-[#10161a]" : "bg-panel text-ink-2"
                }`}
              >
                {WINDS[v]}장
              </button>
            ))}
          </div>
          <p className="text-xs tracking-wide text-muted">국</p>
          <div className="flex overflow-hidden rounded-xl border border-line">
            {[1, 2, 3, 4].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setManual((m) => ({ ...m, kyoku: v }))}
                className={`flex-1 px-2 py-3 text-sm font-medium ${
                  manual.kyoku === v ? "bg-ink font-semibold text-[#10161a]" : "bg-panel text-ink-2"
                }`}
              >
                {v}국
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="mb-1 text-xs tracking-wide text-muted">본장</p>
              <input
                type="number"
                inputMode="numeric"
                value={manual.honba}
                onChange={(e) => setManual((m) => ({ ...m, honba: Math.max(0, Number(e.target.value) || 0) }))}
                className="w-full rounded-xl border border-line-2 bg-panel px-3 py-2 text-center font-num text-lg font-bold text-ink focus:outline-none"
              />
            </div>
            <div>
              <p className="mb-1 text-xs tracking-wide text-muted">공탁 리치봉</p>
              <input
                type="number"
                inputMode="numeric"
                value={manual.kyotaku}
                onChange={(e) => setManual((m) => ({ ...m, kyotaku: Math.max(0, Number(e.target.value) || 0) }))}
                className="w-full rounded-xl border border-line-2 bg-panel px-3 py-2 text-center font-num text-lg font-bold text-ink focus:outline-none"
              />
            </div>
          </div>

          <p className="text-xs tracking-wide text-muted">각자 점수 · ▲▼로 자리 순서 변경</p>
          {order.map((originalSeat, pos) => (
            <div
              key={originalSeat}
              className="grid grid-cols-[28px_auto_1fr_100px] items-center gap-2 rounded-2xl border border-line bg-panel px-2 py-2"
            >
              <span className="flex flex-col text-[10px] text-ink-2">
                <button type="button" disabled={pos === 0} onClick={() => moveOrder(pos, -1)} className="disabled:opacity-20">
                  ▲
                </button>
                <button type="button" disabled={pos === 3} onClick={() => moveOrder(pos, 1)} className="disabled:opacity-20">
                  ▼
                </button>
              </span>
              <span
                className={`rounded-md border px-2 py-1 font-cjk text-sm leading-none ${
                  dealerPos === pos ? "border-red bg-red text-white" : "border-line text-ink-2"
                }`}
              >
                {WINDS[pos]}
              </span>
              <input
                type="text"
                value={names[originalSeat]}
                onChange={(e) => setNames((prev) => prev.map((n, k) => (k === originalSeat ? e.target.value : n)))}
                className="truncate bg-transparent font-semibold text-ink focus:outline-none"
              />
              <input
                type="number"
                inputMode="numeric"
                step={100}
                value={manual.scores[originalSeat]}
                onChange={(e) =>
                  setManual((m) => ({
                    ...m,
                    scores: m.scores.map((s, k) => (k === originalSeat ? Number(e.target.value) : s)),
                  }))
                }
                className="rounded-lg bg-ground px-2 py-1.5 text-right font-num text-base font-bold text-ink focus:outline-none"
              />
            </div>
          ))}
          <p className="text-xs leading-relaxed text-muted">
            붉은 배지가 선택한 국의 親입니다. 규칙 계산 없이 입력한 값 그대로 반영됩니다.
          </p>
          {state.ended && (
            <label className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-3.5 text-sm">
              <input
                type="checkbox"
                checked={reopenIfEnded}
                onChange={(e) => setReopenIfEnded(e.target.checked)}
                className="h-5 w-5 accent-amber"
              />
              종료 상태를 해제하고 계속 진행
            </label>
          )}
        </>
      )}
    </Sheet>
  );
}
