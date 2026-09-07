import { UMA } from "./constants";
import type {
  GameState,
  HandResult,
  SeatIndex,
  SettleRow,
  WinInput,
  WinResult,
} from "./types";

const ALL_SEATS: SeatIndex[] = [0, 1, 2, 3];
export const others = (seat: SeatIndex): SeatIndex[] =>
  ALL_SEATS.filter((i) => i !== seat);

export interface WinContext {
  dealer: SeatIndex;
  honba: number;
}

/**
 * 화료 한 건의 점수 이동을 계산한다. 공탁(리치봉)은 포함하지 않는다 —
 * 더블/트리플론에서 공탁은 대표 화료자 한 명에게만 한 번 더해지므로
 * computeHand에서 별도로 처리한다.
 */
export function computeWin(win: WinInput, ctx: WinContext): WinResult {
  const deltas: [number, number, number, number] = [0, 0, 0, 0];
  const { dealer, honba } = ctx;

  if (win.type === "ron") {
    if (win.loser == null || win.loser === win.winner) return { ok: false, deltas };
    const base = +win.base || 0;
    if (base <= 0) return { ok: false, deltas };
    const amt = base + honba * 300;
    deltas[win.winner] += amt;
    deltas[win.loser] -= amt;
    return { ok: true, deltas, honba: honba * 300, base: String(base) };
  }

  const a = +win.a || 0;
  const b = +win.b || 0;
  if (a <= 0 || (win.winner !== dealer && b <= 0)) return { ok: false, deltas };
  let total = 0;
  others(win.winner).forEach((o) => {
    const pay = (win.winner === dealer ? a : o === dealer ? b : a) + honba * 100;
    deltas[o] -= pay;
    total += pay;
  });
  deltas[win.winner] += total;
  return {
    ok: true,
    deltas,
    honba: honba * 100 * 3,
    base: win.winner === dealer ? `${a} 올` : `${a} / ${b}`,
  };
}

export interface HandContext extends WinContext {
  kyotaku: number;
}

/** 더블론/트리플론을 포함해 한 번의 화료 판정 전체의 점수 이동을 계산한다. */
export function computeHand(wins: WinInput[], ctx: HandContext): HandResult {
  const deltas: [number, number, number, number] = [0, 0, 0, 0];
  let ok = true;
  const parts: WinResult[] = [];
  wins.forEach((w) => {
    const r = computeWin(w, ctx);
    if (!r.ok) {
      ok = false;
      return;
    }
    r.deltas.forEach((v, i) => {
      deltas[i] += v;
    });
    parts.push(r);
  });
  if (!ok || wins.length === 0) return { ok: false, deltas };

  // 대표 화료자: 쏘인 사람 기준으로 가장 가까운(상가) 화료자가 리치봉을 가져간다.
  let rec: SeatIndex = wins[0].winner;
  if (wins.length > 1) {
    const loser = wins[0].loser as SeatIndex;
    rec = [...wins]
      .map((w) => w.winner)
      .sort((a, b) => ((a - loser + 4) % 4) - ((b - loser + 4) % 4))[0];
  }
  deltas[rec] += ctx.kyotaku * 1000;
  return { ok: true, deltas, rec, kyotaku: ctx.kyotaku * 1000, parts };
}

/** 판수·부수로 기본 점수(子 론 기준)를 구한다. 5판 이상은 만관 이상 고정 점수. */
export function basePoints(han: number, fu: number): number {
  if (han >= 52) return 32000;
  if (han >= 39) return 24000;
  if (han >= 26) return 16000;
  if (han >= 13) return 8000;
  if (han >= 11) return 6000;
  if (han >= 8) return 4000;
  if (han >= 6) return 3000;
  if (han >= 5) return 2000;
  return Math.min(fu * Math.pow(2, han + 2), 2000);
}

export const roundUp100 = (x: number) => Math.ceil(x / 100) * 100;

export function settle(state: GameState): SettleRow[] {
  const { start, oka, uma } = state.settings;
  const u = UMA[uma] ?? UMA.none;
  const idx = [...ALL_SEATS].sort(
    (a, b) => state.players[b].score - state.players[a].score || a - b
  );
  return idx.map((seat, r) => {
    let pts = (state.players[seat].score - oka) / 1000 + u[r];
    if (r === 0) pts += ((oka - start) * 4) / 1000;
    return { seat, rank: r + 1, score: state.players[seat].score, pts };
  });
}
