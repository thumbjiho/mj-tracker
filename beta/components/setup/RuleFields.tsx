"use client";

import type { GameSettings, UmaKey } from "@/lib/mahjong/types";

export function RuleFields({
  settings,
  onChange,
}: {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
}) {
  const on = (v: unknown, c: unknown) => (v === c ? "on" : "");

  return (
    <>
      <div className="lbl">
        <span>길이</span>
      </div>
      <div className="seg">
        <button type="button" className={on(settings.length, "han")} onClick={() => onChange({ ...settings, length: "han" })}>
          반장 (東·南)
        </button>
        <button type="button" className={on(settings.length, "ton")} onClick={() => onChange({ ...settings, length: "ton" })}>
          동풍전
        </button>
      </div>

      <label className="check" style={{ marginTop: 10 }}>
        <input
          type="checkbox"
          checked={settings.finalCalc}
          onChange={(e) => onChange({ ...settings, finalCalc: e.target.checked })}
        />{" "}
        최종 정산 점수 계산 (우마 · 오카)
      </label>

      <div hidden={!settings.finalCalc}>
        <div className="lbl">
          <span>우마</span>
        </div>
        <div className="seg">
          {(["none", "5-10", "10-20", "10-30"] as UmaKey[]).map((u) => (
            <button key={u} type="button" className={on(settings.uma, u)} onClick={() => onChange({ ...settings, uma: u })}>
              {u === "none" ? "없음" : u}
            </button>
          ))}
        </div>
        <div className="lbl">
          <span>반환점</span>
        </div>
        <div className="seg">
          <button type="button" className={on(settings.oka, 30000)} onClick={() => onChange({ ...settings, oka: 30000 })}>
            30000
          </button>
          <button type="button" className={on(settings.oka, 25000)} onClick={() => onChange({ ...settings, oka: 25000 })}>
            25000 (오카 없음)
          </button>
        </div>
      </div>

      <label className="check" style={{ marginTop: 10 }}>
        <input type="checkbox" checked={settings.tobi} onChange={(e) => onChange({ ...settings, tobi: e.target.checked })} />{" "}
        토비 (0점 미만이면 종료)
      </label>
    </>
  );
}
