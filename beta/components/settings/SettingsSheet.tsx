"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/chrome/ConfirmDialog";
import { Full } from "@/components/chrome/Full";
import { useEscapeKey } from "@/components/chrome/useEscapeKey";
import { ManualStateFields, type ManualRow } from "@/components/setup/ManualStateFields";
import { PlayerOrderList } from "@/components/setup/PlayerOrderList";
import { RuleFields } from "@/components/setup/RuleFields";
import { useManualScores } from "@/components/setup/useManualScores";
import { sgn } from "@/lib/format";
import { DEFAULT_NAMES } from "@/lib/mahjong/constants";
import type { ManualState, SettingsUpdate } from "@/lib/mahjong/game";
import type { GameSettings, SeatIndex } from "@/lib/mahjong/types";
import { useGame } from "@/state/game-context";

type Tab = "game" | "state";

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { state, saveSettings, restart, showToast } = useGame();
  const [tab, setTab] = useState<Tab>("game");
  const [names, setNames] = useState<string[]>(state.players.map((p) => p.name));
  const [order, setOrder] = useState<SeatIndex[]>([0, 1, 2, 3]);
  const [settings, setSettings] = useState<GameSettings>(state.settings);
  const [manual, setManual] = useState<ManualState>({
    roundWind: state.roundWind,
    kyoku: state.kyoku,
    honba: state.honba,
    kyotaku: state.kyotaku,
    scores: state.players.map((p) => p.score),
  });
  const [reopenIfEnded, setReopenIfEnded] = useState(false);
  const [confirmingRestart, setConfirmingRestart] = useState(false);

  const { setScore, setKyotaku, isAuto, total, expect, balanced } = useManualScores(manual, setManual, settings.start);
  const rows: ManualRow[] = order.map((originalSeat, pos) => ({
    seat: originalSeat,
    pos,
    name: names[originalSeat]?.trim() || DEFAULT_NAMES[originalSeat],
  }));

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

  return (
    <Full title="설정" onClose={onClose} footer={
      <button type="button" className={`primary ${balanced ? "" : "warn"}`} onClick={handleSave}>
        {balanced ? "저장" : `합계 ${sgn(total - expect)} · 그래도 저장`}
      </button>
    }>
      <div className="seg tabs">
        <button type="button" className={tab === "game" ? "on" : ""} onClick={() => setTab("game")}>
          게임 설정
        </button>
        <button type="button" className={tab === "state" ? "on" : ""} onClick={() => setTab("state")}>
          현재 상태
        </button>
      </div>

      <div data-pane="game" hidden={tab !== "game"}>
        <PlayerOrderList order={order} setOrder={setOrder} names={names} setNames={setNames} />
        <RuleFields settings={settings} onChange={setSettings} />
        <div className="f-foot" style={{ padding: "16px 0 0" }}>
          <button type="button" className="ghost" onClick={() => setConfirmingRestart(true)}>
            재시작
          </button>
        </div>
      </div>

      <div data-pane="state" hidden={tab !== "state"}>
        <ManualStateFields
          manual={manual}
          setManual={setManual}
          setScore={setScore}
          setKyotaku={setKyotaku}
          isAuto={isAuto}
          total={total}
          expect={expect}
          balanced={balanced}
          rows={rows}
        />
        <div className="note">붉은 배지가 선택한 국의 親입니다. 자리 순서는 게임 설정 탭의 순서를 따릅니다.</div>
        <div className="note">한 명의 점수를 고치면 아직 손대지 않은 칸이 합계에 맞게 자동으로 채워집니다.</div>
        {state.ended && (
          <label className="check">
            <input type="checkbox" checked={reopenIfEnded} onChange={(e) => setReopenIfEnded(e.target.checked)} /> 종료
            상태를 해제하고 계속 진행
          </label>
        )}
        <div className="note">규칙 계산 없이 입력한 값 그대로 반영됩니다.</div>
      </div>
    </Full>
  );
}
