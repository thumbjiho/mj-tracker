"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/chrome/ConfirmDialog";
import { Full } from "@/components/chrome/Full";
import { useEscapeKey } from "@/components/chrome/useEscapeKey";
import {
  FUS,
  LIMITS,
  RON_KO,
  RON_OYA,
  TSUMO_KO,
  TSUMO_OYA,
  YAKU_BY_ID,
  YAKU_GROUPS,
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
  tab: "quick" | "hanfu" | "yaku";
  /** 역 일람 탭: 체크한 역 id, 도라 개수, 멘젠 여부 */
  yaku: string[];
  dora: number;
  menzen: boolean;
  pending: WinInput[];
}

export interface WinDraftPreset {
  winner: SeatIndex;
  type?: WinType;
  loser?: SeatIndex;
  step: "type" | "points";
}

function freshDraft(preset?: WinDraftPreset): WinDraft {
  return {
    step: preset?.step ?? "winner",
    winner: preset?.winner ?? null,
    type: preset?.type ?? null,
    loser: preset?.loser ?? null,
    han: 0,
    fu: 30,
    limit: null,
    base: "",
    a: "",
    b: "",
    tab: "quick",
    yaku: [],
    dora: 0,
    menzen: true,
    pending: [],
  };
}

/** 역 일람 체크 상태로부터 판수·표시 이름을 계산한다. */
function yakuTotal(d: WinDraft): { han: number; limit: string | null; names: string[] } {
  const defs = d.yaku.map((id) => YAKU_BY_ID[id]).filter(Boolean);
  const names: string[] = [];
  let yakumanX = 0;
  let han = 0;
  defs.forEach((y) => {
    const h = d.menzen ? y.han : y.open;
    if (h == null) return; // 멘젠 한정 역이 후로 상태면 무시
    names.push(y.name);
    if (y.yakuman) yakumanX += y.yakuman;
    else han += h;
  });
  if (yakumanX > 0) {
    const label = yakumanX >= 4 ? "4배역만" : yakumanX === 3 ? "트리플역만" : yakumanX === 2 ? "더블역만" : "역만";
    return { han: yakumanX * 13, limit: label, names };
  }
  if (han === 0) return { han: 0, limit: null, names };
  if (d.dora > 0) names.push(`도라${d.dora}`);
  han += d.dora;
  const lim = [...LIMITS].reverse().find(([, h]) => han >= h && h >= 5);
  return { han, limit: lim ? lim[0] : null, names };
}

/** 역 체크 변경을 draft에 반영하고 판·부 자동 계산을 돌린다. */
function applyYaku(d: WinDraft, isDealerWinner: boolean): WinDraft {
  const t = yakuTotal(d);
  let fu = d.fu;
  const has = (id: string) => d.yaku.includes(id);
  if (has("chiitoi")) fu = 25;
  else if (has("pinfu")) fu = d.type === "tsumo" ? 20 : 30;
  const next: WinDraft = { ...d, han: t.han, limit: t.limit, fu };
  if (!t.han) return { ...next, base: "", a: "", b: "" };
  return applyAutofill(next, isDealerWinner);
}

function stepsFor(d: WinDraft): WizardStep[] {
  if (d.pending.length) return ["winner", "points", "confirm"];
  return d.type === "tsumo"
    ? ["winner", "type", "points", "confirm"]
    : ["winner", "type", "loser", "points", "confirm"];
}

function winLabel(d: WinDraft): string {
  if (!d.han) return "";
  const core = d.limit || `${d.han}판 ${d.fu}부`;
  if (d.tab === "yaku") {
    const names = yakuTotal(d).names;
    if (names.length) return `${core} (${names.join(" ")})`;
  }
  return core;
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

function Bopt({
  active,
  disabled,
  dealer: isDealer,
  wind,
  name,
  sub,
  onClick,
}: {
  active?: boolean;
  disabled?: boolean;
  dealer?: boolean;
  wind: string;
  name: string;
  sub?: string | number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`bopt ${active ? "on" : ""} ${isDealer ? "dealer" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="wind">{wind}</span>
      <span>{name}</span>
      {sub !== undefined && <span className="sub2">{sub}</span>}
    </button>
  );
}

export function WinWizard({ preset, onDone }: { preset?: WinDraftPreset; onDone: (ended: boolean) => void }) {
  const { state, confirmHand } = useGame();
  const [draft, setDraft] = useState<WinDraft>(() => freshDraft(preset));
  const [confirmingClose, setConfirmingClose] = useState(false);

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

  function requestClose() {
    const dirty = draft.winner != null || draft.pending.length > 0;
    if (!dirty) {
      onDone(false);
      return;
    }
    setConfirmingClose(true);
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
    requestClose();
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

  useEscapeKey(requestClose, !confirmingClose);

  if (confirmingClose) {
    return (
      <ConfirmDialog
        title="화료 입력 취소"
        text="지금까지 입력한 화료 내용이 사라집니다. 나갈까요?"
        okLabel="나가기"
        danger
        onCancel={() => setConfirmingClose(false)}
        onOk={() => onDone(false)}
      />
    );
  }

  const title = draft.step === "confirm" ? "확인" : isAdding ? "화료 추가" : "화료";
  const navBase = { prevDisabled: !prevStep && !isAdding, onPrev: goBack };

  if (draft.step === "winner") {
    const taken = draft.pending.map((w) => w.winner).concat(isAdding ? [draft.pending[0].loser as SeatIndex] : []);
    return (
      <Full
        title={title}
        dialog
        center
        steps={{ n: steps.length, i: stepIndex + 1 }}
        onClose={requestClose}
        q={isAdding ? `${state.players[draft.pending[0].loser as SeatIndex].name}에게서 추가로 화료한 사람은?` : "누가 화료했나요?"}
        nav={{ ...navBase, onNext: goNext, nextDisabled: draft.winner == null }}
      >
        <div className="big c1">
          {([0, 1, 2, 3] as SeatIndex[]).map((i) => (
            <Bopt
              key={i}
              wind={seatWind(state, i)}
              name={state.players[i].name}
              sub={state.players[i].score}
              dealer={i === d}
              active={draft.winner === i}
              disabled={taken.includes(i)}
              onClick={() => selectWinner(i)}
            />
          ))}
        </div>
      </Full>
    );
  }

  if (draft.step === "type") {
    const winnerName = state.players[draft.winner as SeatIndex].name;
    return (
      <Full
        title={title}
        dialog
        center
        steps={{ n: steps.length, i: stepIndex + 1 }}
        onClose={requestClose}
        q={
          <b className="qbig">
            {winnerName}의 화료
            <small>어떻게 났나요?</small>
          </b>
        }
        nav={{ ...navBase, onNext: goNext, nextDisabled: !draft.type }}
      >
        <div className="big c1" style={{ flex: 1 }}>
          <button type="button" className={`bopt tall ${draft.type === "ron" ? "on" : ""}`} onClick={() => selectType("ron")}>
            론
            <small>다른 사람의 버림패로</small>
          </button>
          <button
            type="button"
            className={`bopt tall ${draft.type === "tsumo" ? "on" : ""}`}
            onClick={() => selectType("tsumo")}
          >
            쯔모
            <small>직접 뽑아서</small>
          </button>
        </div>
      </Full>
    );
  }

  if (draft.step === "loser") {
    return (
      <Full
        title={title}
        dialog
        center
        steps={{ n: steps.length, i: stepIndex + 1 }}
        onClose={requestClose}
        q="누가 쏘였나요?"
        nav={{ ...navBase, onNext: goNext, nextDisabled: draft.loser == null }}
      >
        <div className="big c1">
          {others(draft.winner as SeatIndex).map((i) => (
            <Bopt
              key={i}
              wind={seatWind(state, i)}
              name={state.players[i].name}
              sub={state.players[i].score}
              dealer={i === d}
              active={draft.loser === i}
              onClick={() => selectLoser(i)}
            />
          ))}
        </div>
      </Full>
    );
  }

  if (draft.step === "points") {
    const winnerName = state.players[draft.winner as SeatIndex].name;
    const preview = computeWin(entryOf(draft), { dealer: d, honba: state.honba });
    const ok = preview.ok;
    const fuOn = draft.han > 0 && draft.han < 5;

    return (
      <Full
        title={title}
        dialog
        center
        steps={{ n: steps.length, i: stepIndex + 1 }}
        onClose={requestClose}
        q={
          <b className="qbig">
            {draft.type === "ron" ? (
              <>
                {state.players[draft.loser as SeatIndex].name}
                <i>→</i>
                {winnerName} 론
              </>
            ) : (
              <>
                모두<i>→</i>
                {winnerName} 쯔모
              </>
            )}
            <small>{isDealerWinner ? "親 화료 · " : "子 화료 · "}기본 점수를 고르세요</small>
          </b>
        }
        nav={{ ...navBase, onNext: goNext, nextDisabled: !ok }}
      >
        <div className="seg">
          <button type="button" className={draft.tab === "quick" ? "on" : ""} onClick={() => setDraft((p) => ({ ...p, tab: "quick" }))}>
            빠른 선택
          </button>
          <button type="button" className={draft.tab === "hanfu" ? "on" : ""} onClick={() => setDraft((p) => ({ ...p, tab: "hanfu" }))}>
            판 · 부
          </button>
          <button
            type="button"
            className={draft.tab === "yaku" ? "on" : ""}
            onClick={() => setDraft((p) => applyYaku({ ...p, tab: "yaku" }, isDealerWinner))}
          >
            역 일람
          </button>
        </div>

        {draft.tab === "yaku" ? (
          <>
            <div
              className={`switch ${draft.menzen ? "on" : ""}`}
              role="switch"
              aria-checked={draft.menzen}
              tabIndex={0}
              onClick={() => setDraft((p) => applyYaku({ ...p, menzen: !p.menzen }, isDealerWinner))}
            >
              <span>
                멘젠
                <small>{draft.menzen ? "울지 않은 손 · 멘젠 한정 역 가능" : "울은 손 · 쿠이사가리 적용"}</small>
              </span>
              <span className="knob" />
            </div>
            {YAKU_GROUPS.map((g) => (
              <div className="yaku-grp" key={g.title}>
                <div className="lbl">
                  <span>{g.title}</span>
                </div>
                <div className="yaku-list">
                  {g.items.map((y) => {
                    const h = draft.menzen ? y.han : y.open;
                    const on = draft.yaku.includes(y.id);
                    return (
                      <button
                        key={y.id}
                        type="button"
                        className={`ychip ${on ? "on" : ""}`}
                        disabled={h == null}
                        onClick={() =>
                          setDraft((p) =>
                            applyYaku(
                              { ...p, yaku: on ? p.yaku.filter((id) => id !== y.id) : [...p.yaku, y.id] },
                              isDealerWinner
                            )
                          )
                        }
                      >
                        <span>{y.name}</span>
                        <b>{h == null ? "멘젠" : y.yakuman ? (y.yakuman === 2 ? "더블" : "역만") : `${h}판`}</b>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="lbl">
              <span>도라</span>
              <span className="hint">적도라 · 뒷도라 · 깡도라 포함</span>
            </div>
            <div className="stepper">
              <button type="button" onClick={() => setDraft((p) => applyYaku({ ...p, dora: Math.max(0, p.dora - 1) }, isDealerWinner))}>
                −
              </button>
              <b>{draft.dora}</b>
              <button type="button" onClick={() => setDraft((p) => applyYaku({ ...p, dora: p.dora + 1 }, isDealerWinner))}>
                +
              </button>
            </div>
            <div className="lbl">
              <span>부</span>
              <span className="hint">{fuOn ? "" : "1~4판일 때만 고릅니다"}</span>
            </div>
            <div className={`chips hf fu-static ${fuOn ? "" : "dimmed"}`}>
              {FUS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`chip sm ${fuOn && draft.fu === f ? "on" : ""}`}
                  disabled={!fuOn}
                  onClick={() => setDraft((p) => applyAutofill({ ...p, fu: f }, isDealerWinner))}
                >
                  {f}부
                </button>
              ))}
            </div>
            <div className="sum">
              <div className="li">
                <span className="k">{winLabel(draft) || "역을 체크하세요"}</span>
                <span className="v amber">{preview.ok ? preview.base : "—"}</span>
              </div>
            </div>
          </>
        ) : draft.tab === "quick" ? (
          <>
            {draft.type === "ron" ? (
              <div className="chips">
                {(isDealerWinner ? RON_OYA : RON_KO).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`chip ${!draft.han && +draft.base === v ? "on" : ""}`}
                    onClick={() => setDraft((p) => ({ ...p, han: 0, limit: null, base: v }))}
                  >
                    {v}
                  </button>
                ))}
              </div>
            ) : isDealerWinner ? (
              <>
                <div className="lbl">
                  <span>각자 지불</span>
                </div>
                <div className="chips">
                  {TSUMO_OYA.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`chip ${!draft.han && +draft.a === v ? "on" : ""}`}
                      onClick={() => setDraft((p) => ({ ...p, han: 0, limit: null, a: v, b: "" }))}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="lbl">
                  <span>子 / 親 지불</span>
                </div>
                <div className="chips" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                  {TSUMO_KO.map(([a, b]) => (
                    <button
                      key={a}
                      type="button"
                      className={`chip ${!draft.han && +draft.a === a && +draft.b === b ? "on" : ""}`}
                      onClick={() => setDraft((p) => ({ ...p, han: 0, limit: null, a, b }))}
                    >
                      {a}
                      <small> / </small>
                      {b}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="note">
              본장 {state.honba}개와 공탁 {state.kyotaku}개는 다음 화면에서 자동으로 더해집니다.
            </div>
          </>
        ) : (
          <>
            <div className="lbl">
              <span>판</span>
            </div>
            <div className="chips hf">
              {[1, 2, 3, 4].map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`chip sm ${draft.han === h && !draft.limit ? "on" : ""}`}
                  onClick={() => setDraft((p) => applyAutofill({ ...p, han: h, limit: null }, isDealerWinner))}
                >
                  {h}판
                </button>
              ))}
              {LIMITS.map(([label, h]) => (
                <button
                  key={label}
                  type="button"
                  className={`chip sm ${draft.limit === label ? "on" : ""}`}
                  style={{ fontFamily: "var(--ui)", fontWeight: 600 }}
                  onClick={() => setDraft((p) => applyAutofill({ ...p, han: h, limit: label }, isDealerWinner))}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="lbl">
              <span>부</span>
              <span className="hint">{fuOn ? "" : "1~4판일 때만 고릅니다"}</span>
            </div>
            <div className={`chips hf ${fuOn ? "" : "dimmed"}`}>
              {FUS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`chip sm ${fuOn && draft.fu === f ? "on" : ""}`}
                  disabled={!fuOn}
                  onClick={() => setDraft((p) => applyAutofill({ ...p, fu: f, limit: null }, isDealerWinner))}
                >
                  {f}부
                </button>
              ))}
            </div>
            <div className="sum">
              <div className="li">
                <span className="k">{winLabel(draft) || "판과 부를 고르세요"}</span>
                <span className="v amber">{preview.ok ? preview.base : "—"}</span>
              </div>
            </div>
          </>
        )}
      </Full>
    );
  }

  // confirm
  const wins = [...draft.pending, entryOf(draft)];
  const r = computeHand(wins, { dealer: d, honba: state.honba, kyotaku: state.kyotaku });
  const canAdd = draft.type === "ron" && wins.length < 3;
  const pays = r.ok ? buildPays(wins, state.honba, d, state.kyotaku, r.rec) : [];

  return (
    <Full
      title={title}
      dialog
      center
      steps={{ n: steps.length, i: stepIndex + 1 }}
      onClose={requestClose}
      q={
        <b className="qbig">
          {wins.map((w) => state.players[w.winner].name).join(" · ")}의 화료
          <small>누가 누구에게 얼마를 주는지 확인하세요</small>
        </b>
      }
      nav={{
        ...navBase,
        onNext: handleConfirm,
        nextDisabled: !r.ok,
        nextLabel: "확정",
        middle: canAdd ? (
          <button type="button" className="ghost nowrap" onClick={addAnotherWinner}>
            {wins.length === 1 ? "더블론" : "트리플론"} 추가
          </button>
        ) : undefined,
      }}
    >
      <div className="pays">
        {pays.map((p, i) => (
          <div key={i} className={`pay ${p.from == null ? "k" : ""}`}>
            <span className={`from ${p.from && p.from.length > 1 ? "multi" : ""}`}>
              {p.from == null
                ? "공탁"
                : p.from.map((s, idx) => (
                    <span key={s}>
                      {idx > 0 && <span className="dot">·</span>}
                      {state.players[s].name}
                    </span>
                  ))}
            </span>
            <span className="mid">
              <span className="amt">
                <b>{p.amt}</b>
                <i>→</i>
              </span>
              {p.label && <small>{p.label}</small>}
            </span>
            <span className="to">{state.players[p.to].name}</span>
          </div>
        ))}
      </div>
      <div className="sum">
        <div className="li">
          <span className="k">국</span>
          <span className="v">
            {roundLabel(state)}
            {wins.length === 2 ? " · 더블론" : wins.length === 3 ? " · 트리플론" : ""}
          </span>
        </div>
        {wins.map((w, k) => (
          <div className="li" key={k}>
            <span className="k">
              {state.players[w.winner].name} ·{" "}
              {w.type === "ron" ? `론 ← ${state.players[w.loser as SeatIndex].name}` : "쯔모"}
              {w.label ? ` · ${w.label}` : ""}
            </span>
            <span className="v n">{r.ok ? r.parts?.[k]?.base : "—"}</span>
          </div>
        ))}
      </div>
      <div className="sum">
        {([0, 1, 2, 3] as SeatIndex[]).map((i) => (
          <div className="li" key={i}>
            <span className="k">
              {seatWind(state, i)} {state.players[i].name}
            </span>
            <span className={`v n ${r.deltas[i] > 0 ? "up" : r.deltas[i] < 0 ? "down" : ""}`}>
              {r.deltas[i] ? (r.deltas[i] > 0 ? `+${r.deltas[i]}` : r.deltas[i]) : "-"}
            </span>
          </div>
        ))}
      </div>
    </Full>
  );
}
