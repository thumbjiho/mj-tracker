"use client";

import { useState } from "react";
import { Full } from "@/components/chrome/Full";
import { sgn } from "@/lib/format";
import { DEFAULT_NAMES, WINDS } from "@/lib/mahjong/constants";
import type { ManualState } from "@/lib/mahjong/game";
import type { GameSettings, SeatIndex } from "@/lib/mahjong/types";
import { useGame } from "@/state/game-context";
import { PlayerOrderList } from "./PlayerOrderList";
import { RuleFields } from "./RuleFields";
import { useManualScores } from "./useManualScores";

export function SetupWizard() {
  const { state, startNewGame, startGameFromState } = useGame();
  const [names, setNames] = useState<string[]>(() =>
    state.players.map((p, i) => (p.name === DEFAULT_NAMES[i] ? "" : p.name))
  );
  const [order, setOrder] = useState<SeatIndex[]>([0, 1, 2, 3]);
  const [settings, setSettings] = useState<GameSettings>(state.settings);
  const [manual, setManual] = useState<ManualState | null>(null);

  const resolvedNames = order.map((pi) => names[pi]?.trim() || DEFAULT_NAMES[pi]);

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
    <Full
      title="새 게임"
      noClose
      footer={
        <>
          <button type="button" className="ghost" onClick={openContinue}>
            진행 중인 게임 이어서
          </button>
          <button type="button" className="primary" onClick={() => startNewGame(resolvedNames, settings)}>
            시작
          </button>
        </>
      }
    >
      <PlayerOrderList order={order} setOrder={setOrder} names={names} setNames={setNames} />
      <RuleFields settings={settings} onChange={setSettings} />
      <div className="note">
        모두 25000점으로 東1局부터 시작합니다. 이미 진행 중인 게임이면 현재 국·본장·점수를 직접 입력해 이어서 시작할 수
        있습니다.
      </div>
    </Full>
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
  const { setScore, setKyotaku, isAuto, total, expect, balanced } = useManualScores(manual, onChange, settings.start);
  const dealerPos = (manual.kyoku - 1) % 4;

  return (
    <Full
      title="진행 중인 게임 이어서"
      onBack={onBack}
      footer={
        <button type="button" className={`primary ${balanced ? "" : "warn"}`} onClick={() => onStart(manual)}>
          {balanced ? "이 상황으로 시작" : `합계 ${sgn(total - expect)} · 그래도 이 상황으로 시작`}
        </button>
      }
    >
      <div className="lbl">
        <span>장풍</span>
      </div>
      <div className="seg">
        {[0, 1, 2].map((v) => (
          <button key={v} type="button" className={manual.roundWind === v ? "on" : ""} onClick={() => onChange({ ...manual, roundWind: v })}>
            {WINDS[v]}장
          </button>
        ))}
      </div>
      <div className="lbl">
        <span>국</span>
      </div>
      <div className="seg">
        {[1, 2, 3, 4].map((v) => (
          <button key={v} type="button" className={manual.kyoku === v ? "on" : ""} onClick={() => onChange({ ...manual, kyoku: v })}>
            {v}국
          </button>
        ))}
      </div>
      <div className="row2">
        <div>
          <div className="lbl">
            <span>본장</span>
          </div>
          <div className="stp">
            <button type="button" className="stp-b" onClick={() => onChange({ ...manual, honba: Math.max(0, manual.honba - 1) })}>
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={manual.honba}
              onChange={(e) => onChange({ ...manual, honba: Math.max(0, Number(e.target.value) || 0) })}
            />
            <button type="button" className="stp-b" onClick={() => onChange({ ...manual, honba: manual.honba + 1 })}>
              +
            </button>
          </div>
        </div>
        <div>
          <div className="lbl">
            <span>공탁 리치봉</span>
          </div>
          <div className="stp">
            <button type="button" className="stp-b" onClick={() => setKyotaku(manual.kyotaku - 1)}>
              −
            </button>
            <input type="number" inputMode="numeric" min={0} value={manual.kyotaku} onChange={(e) => setKyotaku(Number(e.target.value) || 0)} />
            <button type="button" className="stp-b" onClick={() => setKyotaku(manual.kyotaku + 1)}>
              +
            </button>
          </div>
        </div>
      </div>
      <div className="lbl">
        <span>각자 점수</span>
        <span>{balanced ? `합계 ${total} ✓` : <span style={{ color: "var(--red)" }}>{`합계 ${total} (기준 ${expect}, 차이 ${sgn(total - expect)})`}</span>}</span>
      </div>
      <div className="mrows">
        {names.map((nm, i) => (
          <div className="mrow" key={i}>
            <span className={`wind ${dealerPos === i ? "dl" : ""}`}>{WINDS[i]}</span>
            <span className="mname">{nm}</span>
            <input
              type="number"
              inputMode="numeric"
              step={100}
              className={isAuto(i) ? "auto" : ""}
              value={manual.scores[i]}
              onChange={(e) => setScore(i, Number(e.target.value) || 0)}
            />
          </div>
        ))}
      </div>
      <div className="note">붉은 배지가 선택한 국의 親입니다. 자리 순서는 게임 설정 탭의 순서를 따릅니다.</div>
      <div className="note">한 명의 점수를 고치면 아직 손대지 않은 칸이 합계에 맞게 자동으로 채워집니다.</div>
      <div className="note">입력한 상황 그대로 게임을 시작합니다. 합계가 맞지 않아도 시작할 수 있습니다.</div>
    </Full>
  );
}
