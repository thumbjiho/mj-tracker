"use client";

import { useState } from "react";
import { AppButton } from "@/components/design-system/Button";
import { Sheet } from "@/components/design-system/Sheet";
import { sgn } from "@/lib/format";
import { DEFAULT_NAMES, WINDS } from "@/lib/mahjong/constants";
import type { ManualState } from "@/lib/mahjong/game";
import type { GameSettings } from "@/lib/mahjong/types";
import { useGame } from "@/state/game-context";
import { RuleFields } from "./RuleFields";

export function SetupWizard() {
  const { state, startNewGame, startGameFromState } = useGame();
  const [names, setNames] = useState<string[]>(() =>
    state.players.map((p, i) => (p.name === DEFAULT_NAMES[i] ? "" : p.name))
  );
  const [settings, setSettings] = useState<GameSettings>(state.settings);
  const [manual, setManual] = useState<ManualState | null>(null);

  const resolvedNames = names.map((n, i) => n.trim() || DEFAULT_NAMES[i]);

  function openContinue() {
    setManual({
      roundWind: state.roundWind,
      kyoku: state.kyoku,
      honba: state.honba,
      kyotaku: state.kyotaku,
      scores: resolvedNames.map(() => settings.start),
    });
  }

  if (manual) {
    return (
      <ContinueScreen
        names={resolvedNames}
        settings={settings}
        manual={manual}
        onChange={setManual}
        onBack={() => setManual(null)}
        onStart={(m) => startGameFromState(resolvedNames, settings, m)}
      />
    );
  }

  return (
    <Sheet
      title="새 게임"
      footer={
        <>
          <AppButton variant="ghost" className="flex-1" onClick={openContinue}>
            진행 중인 게임 이어서
          </AppButton>
          <AppButton className="flex-1" onClick={() => startNewGame(resolvedNames, settings)}>
            시작
          </AppButton>
        </>
      }
    >
      <p className="text-xs tracking-wide text-muted">플레이어</p>
      {([0, 1, 2, 3] as const).map((i) => (
        <div key={i} className="flex h-14 items-center gap-2 rounded-2xl border border-line bg-panel px-3">
          <span className="rounded-md border border-line px-2 py-1 font-cjk text-lg leading-none text-ink-2">
            {WINDS[i]}
          </span>
          <input
            type="text"
            value={names[i]}
            placeholder={DEFAULT_NAMES[i]}
            maxLength={12}
            onChange={(e) => setNames((prev) => prev.map((n, k) => (k === i ? e.target.value : n)))}
            className="w-full flex-1 bg-transparent text-base font-semibold text-ink placeholder:font-normal placeholder:text-muted focus:outline-none"
          />
        </div>
      ))}

      <RuleFields settings={settings} onChange={setSettings} />

      <p className="text-xs leading-relaxed text-muted">
        모두 {settings.start}점으로 東1局부터 시작합니다. 이미 진행 중인 게임이면 현재 국·본장·점수를 직접 입력해
        이어서 시작할 수 있습니다.
      </p>
    </Sheet>
  );
}

function ContinueScreen({
  names,
  settings,
  manual,
  onChange,
  onBack,
  onStart,
}: {
  names: string[];
  settings: GameSettings;
  manual: ManualState;
  onChange: (m: ManualState) => void;
  onBack: () => void;
  onStart: (m: ManualState) => void;
}) {
  const total = manual.scores.reduce((a, b) => a + (b || 0), 0) + manual.kyotaku * 1000;
  const expected = settings.start * 4;
  const balanced = total === expected;
  const dealerPos = (manual.kyoku - 1) % 4;

  return (
    <Sheet
      title="진행 중인 게임 이어서"
      onBack={onBack}
      footer={
        <AppButton variant={balanced ? "primary" : "warn"} onClick={() => onStart(manual)}>
          {balanced ? "이 상황으로 시작" : `합계 ${sgn(total - expected)} · 그래도 시작`}
        </AppButton>
      }
    >
      <p className="text-xs tracking-wide text-muted">장풍</p>
      <div className="flex overflow-hidden rounded-xl border border-line">
        {[0, 1, 2].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange({ ...manual, roundWind: v })}
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
            onClick={() => onChange({ ...manual, kyoku: v })}
            className={`flex-1 px-2 py-3 text-sm font-medium ${
              manual.kyoku === v ? "bg-ink font-semibold text-[#10161a]" : "bg-panel text-ink-2"
            }`}
          >
            {v}국
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberStepper label="본장" value={manual.honba} onChange={(v) => onChange({ ...manual, honba: Math.max(0, v) })} />
        <NumberStepper
          label="공탁 리치봉"
          value={manual.kyotaku}
          onChange={(v) => onChange({ ...manual, kyotaku: Math.max(0, v) })}
        />
      </div>

      <p className="flex items-center justify-between text-xs tracking-wide text-muted">
        <span>각자 점수</span>
        <span className={balanced ? "text-ink-2" : "text-red"}>
          {balanced ? `합계 ${total} ✓` : `합계 ${total} (기준 ${expected}, 차이 ${sgn(total - expected)})`}
        </span>
      </p>
      {names.map((nm, i) => (
        <div
          key={i}
          className="grid grid-cols-[auto_1fr_110px] items-center gap-2 rounded-2xl border border-line bg-panel px-3 py-2"
        >
          <span
            className={`rounded-md border px-2 py-1 font-cjk text-sm leading-none ${
              dealerPos === i ? "border-red bg-red text-white" : "border-line text-ink-2"
            }`}
          >
            {WINDS[i]}
          </span>
          <span className="truncate font-semibold">{nm}</span>
          <input
            type="number"
            inputMode="numeric"
            step={100}
            value={manual.scores[i]}
            onChange={(e) =>
              onChange({ ...manual, scores: manual.scores.map((s, k) => (k === i ? Number(e.target.value) : s)) })
            }
            className="rounded-lg bg-ground px-2 py-1.5 text-right font-num text-lg font-bold text-ink focus:outline-none"
          />
        </div>
      ))}
      <p className="text-xs leading-relaxed text-muted">
        입력한 상황 그대로 게임을 시작합니다. 합계가 맞지 않아도 시작할 수 있습니다.
      </p>
    </Sheet>
  );
}

function NumberStepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <p className="mb-1 text-xs tracking-wide text-muted">{label}</p>
      <div className="flex items-stretch gap-1.5">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          className="w-12 shrink-0 rounded-xl border border-line-2 bg-panel text-xl font-semibold text-ink-2"
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full rounded-xl border border-line-2 bg-panel px-2 text-center font-num text-lg font-bold text-ink focus:outline-none"
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-12 shrink-0 rounded-xl border border-line-2 bg-panel text-xl font-semibold text-ink-2"
        >
          +
        </button>
      </div>
    </div>
  );
}
