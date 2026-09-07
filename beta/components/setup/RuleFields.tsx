"use client";

import { SegmentedControl } from "@/components/design-system/Button";
import type { GameLength, GameSettings, UmaKey } from "@/lib/mahjong/types";

export function RuleFields({
  settings,
  onChange,
}: {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
}) {
  return (
    <>
      <p className="text-xs tracking-wide text-muted">길이</p>
      <SegmentedControl<GameLength>
        value={settings.length}
        onChange={(length) => onChange({ ...settings, length })}
        options={[
          { value: "han", label: "반장 (東·南)" },
          { value: "ton", label: "동풍전" },
        ]}
      />

      <label className="mt-1 flex items-center gap-3 rounded-2xl border border-line bg-panel p-3.5 text-sm">
        <input
          type="checkbox"
          checked={settings.finalCalc}
          onChange={(e) => onChange({ ...settings, finalCalc: e.target.checked })}
          className="h-5 w-5 accent-amber"
        />
        최종 정산 점수 계산 (우마 · 오카)
      </label>

      {settings.finalCalc && (
        <>
          <p className="text-xs tracking-wide text-muted">우마</p>
          <SegmentedControl<UmaKey>
            value={settings.uma}
            onChange={(uma) => onChange({ ...settings, uma })}
            options={[
              { value: "none", label: "없음" },
              { value: "5-10", label: "5-10" },
              { value: "10-20", label: "10-20" },
              { value: "10-30", label: "10-30" },
            ]}
          />
          <p className="text-xs tracking-wide text-muted">반환점</p>
          <div className="flex overflow-hidden rounded-xl border border-line">
            {[30000, 25000].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onChange({ ...settings, oka: v })}
                className={`flex-1 px-2 py-3 text-sm font-medium ${
                  settings.oka === v ? "bg-ink font-semibold text-[#10161a]" : "bg-panel text-ink-2"
                }`}
              >
                {v === 30000 ? "30000" : "25000 (오카 없음)"}
              </button>
            ))}
          </div>
        </>
      )}

      <label className="mt-1 flex items-center gap-3 rounded-2xl border border-line bg-panel p-3.5 text-sm">
        <input
          type="checkbox"
          checked={settings.tobi}
          onChange={(e) => onChange({ ...settings, tobi: e.target.checked })}
          className="h-5 w-5 accent-amber"
        />
        토비 (0점 미만이면 종료)
      </label>
    </>
  );
}
