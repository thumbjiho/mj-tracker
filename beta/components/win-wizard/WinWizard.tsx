"use client";

import { useState } from "react";
import { Chip, SeatOptionButton, SegmentedControl } from "@/components/design-system/Button";
import { Sheet, WizardNav } from "@/components/design-system/Sheet";
import {
  FUS,
  LIMITS,
  RON_KO,
  RON_OYA,
  TSUMO_KO,
  TSUMO_OYA,
} from "@/lib/mahjong/constants";
import { dealer, roundLabel, seatWind } from "@/lib/mahjong/game";
import { basePoints, computeHand, computeWin, others, roundUp100 } from "@/lib/mahjong/scoring";
import type { SeatIndex, WinInput, WinType } from "@/lib/mahjong/types";
import { useGame } from "@/state/game-context";

type WizardStep = "winner" | "type" | "loser" | "points" | "confirm";

interface WinDraft {
  step: WizardStep;
  winner: SeatIndex | null;
  type: WinType | null;
  loser: SeatIndex | null;
  han: number;
  fu: number;
  limit: string | null;
  base: number | "";
  a: number | "";
  b: number | "";
  tab: "quick" | "hanfu";
  pending: WinInput[];
}

function freshDraft(): WinDraft {
  return {
    step: "winner",
    winner: null,
    type: null,
    loser: null,
    han: 0,
    fu: 30,
    limit: null,
    base: "",
    a: "",
    b: "",
    tab: "quick",
    pending: [],
  };
}

function stepsFor(d: WinDraft): WizardStep[] {
  if (d.pending.length) return ["winner", "points", "confirm"];
  return d.type === "tsumo"
    ? ["winner", "type", "points", "confirm"]
    : ["winner", "type", "loser", "points", "confirm"];
}

function winLabel(d: WinDraft): string {
  return d.han ? d.limit || `${d.han}판 ${d.fu}부` : "";
}

function entryOf(d: WinDraft): WinInput {
  return {
    winner: d.winner as SeatIndex,
    type: d.type as WinType,
    loser: d.loser,
    base: d.base,
    a: d.a,
    b: d.b,
    label: winLabel(d),
  };
}

function applyAutofill(d: WinDraft, isDealerWinner: boolean): WinDraft {
  if (!d.han) return d;
  const base = basePoints(d.han, d.fu);
  if (d.type === "ron") return { ...d, base: isDealerWinner ? roundUp100(base * 6) : roundUp100(base * 4) };
  if (isDealerWinner) return { ...d, a: roundUp100(base * 2), b: "" };
  return { ...d, a: roundUp100(base), b: roundUp100(base * 2) };
}

interface PayRow {
  from: SeatIndex[] | null;
  to: SeatIndex;
  amt: number;
  label: string;
}

function buildPays(
  wins: WinInput[],
  honba: number,
  dealerSeat: SeatIndex,
  kyotaku: number,
  rec: SeatIndex | undefined
): PayRow[] {
  const pays: PayRow[] = [];
  wins.forEach((w) => {
    if (w.type === "ron") {
      pays.push({
        from: [w.loser as SeatIndex],
        to: w.winner,
        amt: (+w.base || 0) + honba * 300,
        label: honba ? `본장 +${honba * 300}` : "",
      });
    } else {
      const groups = new Map<number, SeatIndex[]>();
      others(w.winner).forEach((o) => {
        const pay = (w.winner === dealerSeat ? +w.a || 0 : o === dealerSeat ? +w.b || 0 : +w.a || 0) + honba * 100;
        groups.set(pay, [...(groups.get(pay) || []), o]);
      });
      [...groups.keys()]
        .sort((a, b) => b - a)
        .forEach((pay) => {
          const seats = groups.get(pay) as SeatIndex[];
          pays.push({
            from: seats,
            to: w.winner,
            amt: pay,
            label: [seats.length > 1 ? "각자" : "", honba ? `본장 +${honba * 100}` : ""].filter(Boolean).join(" · "),
          });
        });
    }
  });
  if (kyotaku && rec != null) {
    pays.push({ from: null, to: rec, amt: kyotaku * 1000, label: `리치봉 ${kyotaku}개` });
  }
  return pays;
}

export function WinWizard({
  initialWinner,
  onDone,
}: {
  initialWinner?: SeatIndex;
  onDone: (ended: boolean) => void;
}) {
  const { state, confirmHand } = useGame();
  const [draft, setDraft] = useState<WinDraft>(() =>
    initialWinner != null ? { ...freshDraft(), winner: initialWinner, step: "type" } : freshDraft()
  );

  const d = dealer(state);
  const steps = stepsFor(draft);
  const stepIndex = steps.indexOf(draft.step);
  const prevStep = steps[stepIndex - 1];
  const isAdding = draft.pending.length > 0;
  const isDealerWinner = draft.winner === d;

  function selectWinner(seat: SeatIndex) {
    setDraft((prev) => {
      const next: WinDraft = { ...prev, winner: seat };
      if (prev.pending.length) {
        next.type = "ron";
        next.loser = prev.pending[0].loser;
      } else if (prev.loser === seat) {
        next.loser = null;
      }
      const s = stepsFor(next);
      return { ...next, step: s[s.indexOf(prev.step) + 1] };
    });
  }

  function selectType(type: WinType) {
    setDraft((prev) => {
      const next = applyAutofill({ ...prev, type }, prev.winner === d);
      const s = stepsFor(next);
      return { ...next, step: s[s.indexOf(prev.step) + 1] };
    });
  }

  function selectLoser(seat: SeatIndex) {
    setDraft((prev) => {
      const next = { ...prev, loser: seat };
      const s = stepsFor(next);
      return { ...next, step: s[s.indexOf(prev.step) + 1] };
    });
  }

  function goNext() {
    setDraft((prev) => {
      const s = stepsFor(prev);
      return { ...prev, step: s[s.indexOf(prev.step) + 1] };
    });
  }

  function goBack() {
    if (prevStep) {
      setDraft((prev) => ({ ...prev, step: prevStep }));
      return;
    }
    if (isAdding) {
      const last = draft.pending[draft.pending.length - 1];
      setDraft({ ...freshDraft(), ...last, han: 0, limit: null, pending: draft.pending.slice(0, -1), step: "confirm" });
      return;
    }
    onDone(false);
  }

  function addAnotherWinner() {
    setDraft((prev) => {
      const pending = [...prev.pending, entryOf(prev)];
      const taken = pending.map((w) => w.winner).concat([pending[0].loser as SeatIndex]);
      const rest = ([0, 1, 2, 3] as SeatIndex[]).filter((i) => !taken.includes(i));
      const base: WinDraft = { ...freshDraft(), pending, type: "ron", loser: pending[0].loser };
      return rest.length === 1 ? { ...base, winner: rest[0], step: "points" } : base;
    });
  }

  function handleConfirm() {
    const wins = [...draft.pending, entryOf(draft)];
    const r = confirmHand(wins);
    if (r.ok) onDone(!!r.ended);
  }

  const currentOk = computeWin(entryOf(draft), { dealer: d, honba: state.honba }).ok;

  return (
    <Sheet title={isAdding ? "화료 추가" : "화료"} onClose={() => onDone(false)} steps={{ n: steps.length, i: stepIndex + 1 }}>
      {draft.step === "winner" && (
        <WinnerStep draft={draft} dealer={d} state={state} isAdding={isAdding} onSelect={selectWinner} />
      )}
      {draft.step === "type" && (
        <TypeStep name={state.players[draft.winner as SeatIndex].name} type={draft.type} onSelect={selectType} />
      )}
      {draft.step === "loser" && (
        <LoserStep draft={draft} state={state} onSelect={selectLoser} />
      )}
      {draft.step === "points" && (
        <PointsStep draft={draft} setDraft={setDraft} state={state} isDealerWinner={isDealerWinner} d={d} />
      )}
      {draft.step === "confirm" && (
        <ConfirmStep draft={draft} state={state} d={d} onAddAnother={addAnotherWinner} />
      )}

      <div className="pt-1">
        {draft.step === "confirm" ? (
          <WizardNav
            onPrev={goBack}
            prevDisabled={false}
            onNext={handleConfirm}
            nextDisabled={!computeHand([...draft.pending, entryOf(draft)], { dealer: d, honba: state.honba, kyotaku: state.kyotaku }).ok}
            nextLabel="확정"
          />
        ) : (
          <WizardNav
            onPrev={goBack}
            prevDisabled={!prevStep && !isAdding}
            onNext={goNext}
            nextDisabled={
              draft.step === "winner"
                ? draft.winner == null
                : draft.step === "type"
                  ? draft.type == null
                  : draft.step === "loser"
                    ? draft.loser == null
                    : !currentOk
            }
          />
        )}
      </div>
    </Sheet>
  );
}

function WinnerStep({
  draft,
  dealer: d,
  state,
  isAdding,
  onSelect,
}: {
  draft: WinDraft;
  dealer: SeatIndex;
  state: ReturnType<typeof useGame>["state"];
  isAdding: boolean;
  onSelect: (seat: SeatIndex) => void;
}) {
  const taken = draft.pending.map((w) => w.winner).concat(isAdding ? [draft.pending[0].loser as SeatIndex] : []);
  return (
    <>
      <p className="text-sm text-ink-2">
        {isAdding ? `${state.players[draft.pending[0].loser as SeatIndex].name}에게서 추가로 화료한 사람은?` : "누가 화료했나요?"}
      </p>
      {([0, 1, 2, 3] as SeatIndex[]).map((i) => (
        <SeatOptionButton
          key={i}
          wind={seatWind(state, i)}
          name={state.players[i].name}
          sub={state.players[i].score}
          dealer={i === d}
          active={draft.winner === i}
          disabled={taken.includes(i)}
          onClick={() => onSelect(i)}
        />
      ))}
    </>
  );
}

function TypeStep({ name, type, onSelect }: { name: string; type: WinType | null; onSelect: (t: WinType) => void }) {
  return (
    <>
      <p className="text-base font-bold text-ink">
        {name}의 화료 <small className="mt-0.5 block text-sm font-medium text-muted">어떻게 났나요?</small>
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onSelect("ron")}
          className={`flex min-h-32 flex-col items-center justify-center gap-1.5 rounded-2xl border px-3 py-4 text-2xl font-bold ${
            type === "ron" ? "border-ink bg-ink text-[#10161a]" : "border-line bg-panel text-ink"
          }`}
        >
          론
          <small className="text-sm font-medium opacity-70">다른 사람의 버림패로</small>
        </button>
        <button
          type="button"
          onClick={() => onSelect("tsumo")}
          className={`flex min-h-32 flex-col items-center justify-center gap-1.5 rounded-2xl border px-3 py-4 text-2xl font-bold ${
            type === "tsumo" ? "border-ink bg-ink text-[#10161a]" : "border-line bg-panel text-ink"
          }`}
        >
          쯔모
          <small className="text-sm font-medium opacity-70">직접 뽑아서</small>
        </button>
      </div>
    </>
  );
}

function LoserStep({
  draft,
  state,
  onSelect,
}: {
  draft: WinDraft;
  state: ReturnType<typeof useGame>["state"];
  onSelect: (seat: SeatIndex) => void;
}) {
  return (
    <>
      <p className="text-sm text-ink-2">누가 쏘였나요?</p>
      {others(draft.winner as SeatIndex).map((i) => (
        <SeatOptionButton
          key={i}
          wind={seatWind(state, i)}
          name={state.players[i].name}
          sub={state.players[i].score}
          active={draft.loser === i}
          onClick={() => onSelect(i)}
        />
      ))}
    </>
  );
}

function PointsStep({
  draft,
  setDraft,
  state,
  isDealerWinner,
  d,
}: {
  draft: WinDraft;
  setDraft: React.Dispatch<React.SetStateAction<WinDraft>>;
  state: ReturnType<typeof useGame>["state"];
  isDealerWinner: boolean;
  d: SeatIndex;
}) {
  const winnerName = state.players[draft.winner as SeatIndex].name;
  const preview = computeWin(entryOf(draft), { dealer: d, honba: state.honba });

  return (
    <>
      <p className="text-base font-bold text-ink">
        {draft.type === "ron" ? (
          <>
            {state.players[draft.loser as SeatIndex]?.name}
            <i className="not-italic text-amber"> → </i>
            {winnerName} 론
          </>
        ) : (
          <>
            모두<i className="not-italic text-amber"> → </i>
            {winnerName} 쯔모
          </>
        )}
        <small className="mt-0.5 block text-sm font-medium text-muted">
          {isDealerWinner ? "親 화료 · " : "子 화료 · "}기본 점수를 고르세요
        </small>
      </p>

      <SegmentedControl
        value={draft.tab}
        onChange={(tab) => setDraft((p) => ({ ...p, tab }))}
        options={[
          { value: "quick", label: "빠른 선택" },
          { value: "hanfu", label: "판 · 부" },
        ]}
      />

      {draft.tab === "quick" ? (
        <>
          {draft.type === "ron" ? (
            <div className="grid grid-cols-4 gap-2">
              {(isDealerWinner ? RON_OYA : RON_KO).map((v) => (
                <Chip
                  key={v}
                  active={!draft.han && +draft.base === v}
                  onClick={() => setDraft((p) => ({ ...p, han: 0, limit: null, base: v }))}
                >
                  {v}
                </Chip>
              ))}
            </div>
          ) : isDealerWinner ? (
            <>
              <p className="text-xs tracking-wide text-muted">각자 지불</p>
              <div className="grid grid-cols-4 gap-2">
                {TSUMO_OYA.map((v) => (
                  <Chip
                    key={v}
                    active={!draft.han && +draft.a === v}
                    onClick={() => setDraft((p) => ({ ...p, han: 0, limit: null, a: v, b: "" }))}
                  >
                    {v}
                  </Chip>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs tracking-wide text-muted">子 / 親 지불</p>
              <div className="grid grid-cols-3 gap-2">
                {TSUMO_KO.map(([a, b]) => (
                  <Chip
                    key={a}
                    active={!draft.han && +draft.a === a && +draft.b === b}
                    onClick={() => setDraft((p) => ({ ...p, han: 0, limit: null, a, b }))}
                  >
                    {a}
                    <small className="mx-0.5 opacity-60"> / </small>
                    {b}
                  </Chip>
                ))}
              </div>
            </>
          )}
          <p className="text-xs leading-relaxed text-muted">
            본장 {state.honba}개와 공탁 {state.kyotaku}개는 다음 화면에서 자동으로 더해집니다.
          </p>
        </>
      ) : (
        <>
          <p className="text-xs tracking-wide text-muted">판</p>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((h) => (
              <Chip
                key={h}
                className="min-h-11 text-sm"
                active={draft.han === h && !draft.limit}
                onClick={() => setDraft((p) => applyAutofill({ ...p, han: h, limit: null }, isDealerWinner))}
              >
                {h}판
              </Chip>
            ))}
            {LIMITS.map(([label, h]) => (
              <Chip
                key={label}
                className="min-h-11 font-ui text-sm font-semibold"
                active={draft.limit === label}
                onClick={() => setDraft((p) => applyAutofill({ ...p, han: h, limit: label }, isDealerWinner))}
              >
                {label}
              </Chip>
            ))}
          </div>
          <p className="flex justify-between text-xs tracking-wide text-muted">
            <span>부</span>
            <span>{draft.han > 0 && draft.han < 5 ? "" : "1~4판일 때만 고릅니다"}</span>
          </p>
          <div className={`grid grid-cols-4 gap-2 ${draft.han > 0 && draft.han < 5 ? "" : "opacity-35"}`}>
            {FUS.map((f) => (
              <Chip
                key={f}
                className="min-h-11 text-sm"
                disabled={!(draft.han > 0 && draft.han < 5)}
                active={draft.han > 0 && draft.han < 5 && draft.fu === f}
                onClick={() => setDraft((p) => applyAutofill({ ...p, fu: f, limit: null }, isDealerWinner))}
              >
                {f}부
              </Chip>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-line bg-panel px-3.5 py-2.5">
            <span className="text-sm text-muted">{winLabel(draft) || "판과 부를 고르세요"}</span>
            <span className="font-num text-2xl font-semibold text-amber tabular-nums">
              {preview.ok ? preview.base : "—"}
            </span>
          </div>
        </>
      )}
    </>
  );
}

function ConfirmStep({
  draft,
  state,
  d,
  onAddAnother,
}: {
  draft: WinDraft;
  state: ReturnType<typeof useGame>["state"];
  d: SeatIndex;
  onAddAnother: () => void;
}) {
  const wins = [...draft.pending, entryOf(draft)];
  const r = computeHand(wins, { dealer: d, honba: state.honba, kyotaku: state.kyotaku });
  const canAdd = draft.type === "ron" && wins.length < 3;
  const pays = r.ok ? buildPays(wins, state.honba, d, state.kyotaku, r.rec) : [];

  return (
    <>
      <p className="text-base font-bold text-ink">
        {wins.map((w) => state.players[w.winner].name).join(" · ")}의 화료
        <small className="mt-0.5 block text-sm font-medium text-muted">누가 누구에게 얼마를 주는지 확인하세요</small>
      </p>

      <div className="flex flex-col gap-2">
        {pays.map((p, i) => (
          <div
            key={i}
            className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border px-3 py-2.5 ${
              p.from === null ? "border-dashed border-line bg-panel" : "border-line bg-panel-2"
            }`}
          >
            <span className={`truncate text-right font-semibold ${p.from === null ? "text-sm text-muted" : "text-ink-2"}`}>
              {p.from === null ? "공탁" : p.from.map((s) => state.players[s].name).join(" · ")}
            </span>
            <span className="flex flex-col items-center gap-0.5 leading-none">
              <span className="flex items-center gap-1.5">
                <b className="font-num text-2xl text-ink tabular-nums">{p.amt}</b>
                <i className="not-italic text-amber">→</i>
              </span>
              {p.label && <small className="text-[11px] text-muted">{p.label}</small>}
            </span>
            <span className="truncate text-left font-semibold text-amber">{state.players[p.to].name}</span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-panel px-3.5">
        <Row
          k="국"
          v={`${roundLabel(state)}${wins.length === 2 ? " · 더블론" : wins.length === 3 ? " · 트리플론" : ""}`}
        />
        {wins.map((w, k) => (
          <Row
            key={k}
            k={`${state.players[w.winner].name} · ${w.type === "ron" ? `론 ← ${state.players[w.loser as SeatIndex].name}` : "쯔모"}${w.label ? ` · ${w.label}` : ""}`}
            v={r.ok ? (r.parts?.[k]?.base ?? "—") : "—"}
            numeric
          />
        ))}
      </div>
      <div className="rounded-2xl border border-line bg-panel px-3.5">
        {([0, 1, 2, 3] as SeatIndex[]).map((i) => (
          <Row
            key={i}
            k={`${seatWind(state, i)} ${state.players[i].name}`}
            v={r.deltas[i] ? (r.deltas[i] > 0 ? `+${r.deltas[i]}` : `${r.deltas[i]}`) : "-"}
            numeric
            tone={r.deltas[i] > 0 ? "up" : r.deltas[i] < 0 ? "down" : undefined}
          />
        ))}
      </div>

      {canAdd && (
        <button
          type="button"
          onClick={onAddAnother}
          className="rounded-2xl border border-line-2 bg-panel px-4 py-3 text-sm font-semibold text-ink"
        >
          {wins.length === 1 ? "더블론" : "트리플론"} 추가
        </button>
      )}
    </>
  );
}

function Row({ k, v, numeric, tone }: { k: string; v: string | number; numeric?: boolean; tone?: "up" | "down" }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
      <span className="text-sm text-muted">{k}</span>
      <span
        className={`font-semibold ${numeric ? "font-num tabular-nums" : ""} ${
          tone === "up" ? "text-green" : tone === "down" ? "text-red" : "text-ink"
        }`}
      >
        {v}
      </span>
    </div>
  );
}
