"use client";

import { Sheet } from "@/components/design-system/Sheet";
import { sgn } from "@/lib/format";
import { useGame } from "@/state/game-context";
import { ScoreChart } from "./ScoreChart";

export function LogSheet({ onClose }: { onClose: () => void }) {
  const { state } = useGame();
  const rows = [...state.log].reverse();

  return (
    <Sheet title="기록" onClose={onClose}>
      <ScoreChart state={state} />
      {rows.length === 0 ? (
        <p className="text-sm text-muted">아직 기록이 없습니다.</p>
      ) : (
        rows.map((e, i) => (
          <div
            key={i}
            className="grid grid-cols-[96px_1fr] gap-x-2.5 gap-y-0.5 border-b border-line py-2.5 text-sm last:border-0"
          >
            <span className="font-cjk text-xs text-muted">{e.round}</span>
            <span>{e.text}</span>
            {e.deltas && (
              <div className="col-span-2 flex justify-end gap-1.5 font-num font-semibold tabular-nums">
                {e.deltas.map((v, k) => (
                  <span
                    key={k}
                    className={`min-w-14 text-right ${v > 0 ? "text-green" : v < 0 ? "text-red" : "text-muted"}`}
                  >
                    {v ? sgn(v) : "-"}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </Sheet>
  );
}
