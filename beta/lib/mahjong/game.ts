import { WINDS } from "./constants";
import { computeHand, others } from "./scoring";
import type {
  ChomboInput,
  DrawInput,
  GameSettings,
  GameState,
  LogEntry,
  LogKind,
  Players,
  SeatIndex,
  WinInput,
} from "./types";

export function defaultSettings(): GameSettings {
  return {
    length: "han",
    start: 25000,
    oka: 30000,
    uma: "10-20",
    tobi: true,
    finalCalc: true,
  };
}

export function newGame(names: string[], settings: GameSettings): GameState {
  const players = names.map((n) => ({
    name: n,
    score: settings.start,
    riichi: false,
  })) as Players;
  return {
    players,
    roundWind: 0,
    kyoku: 1,
    honba: 0,
    kyotaku: 0,
    log: [],
    settings,
    ended: false,
    setup: false,
    started: Date.now(),
  };
}

export const dealer = (s: GameState): SeatIndex => (((s.kyoku - 1) % 4) as SeatIndex);
export const lastWind = (s: GameState) => (s.settings.length === "ton" ? 0 : 1);
export const isOorasu = (s: GameState) =>
  !s.ended && s.roundWind === lastWind(s) && s.kyoku === 4;
export const roundLabel = (s: GameState) =>
  `${WINDS[s.roundWind]}${s.kyoku}局${s.honba ? ` ${s.honba}본장` : ""}`;
export const shortRound = (s: GameState) => `${WINDS[s.roundWind]}${s.kyoku}`;
export const seatWind = (s: GameState, seat: SeatIndex) =>
  WINDS[(seat - dealer(s) + 4) % 4];
/**
 * 좌석을 화면 위치로 매핑한다. 화면 방향은 고정이다: 좌석 0 = bottom, 1 = right,
 * 2 = top, 3 = left. (예전에는 親이 항상 아래로 오도록 매 국 회전했지만, 아이패드를
 * 탁자에 두고 쓸 때 방향이 계속 바뀌는 문제가 있어 고정으로 바꿨다.)
 */
export const posOf = (_s: GameState, seat: SeatIndex): SeatIndex => seat;

/** 이스터에그: 이름이 "리지"인 사람의 "리치"는 "리지"로 표시한다. */
export const riichiWord = (name: string) => (name.trim() === "리지" ? "리지" : "리치");

function advanceRound(s: GameState): { kyoku: number; roundWind: number } {
  let { kyoku, roundWind } = s;
  kyoku += 1;
  if (kyoku > 4) {
    kyoku = 1;
    roundWind += 1;
  }
  return { kyoku, roundWind };
}

function makeLogEntry(
  state: GameState,
  text: string,
  deltas: number[] | null,
  kind: LogKind
): LogEntry {
  return {
    round: roundLabel(state),
    sr: shortRound(state),
    text,
    kind,
    deltas: deltas ? [...deltas] : null,
    scores: state.players.map((p) => p.score),
  };
}

/** 반장 종료(오라스 초과) / 토비 종료 여부를 판정하고 필요하면 로그를 남긴다. */
function finalizeAfterHand(state: GameState): GameState {
  if (state.roundWind > lastWind(state)) {
    const corrected = { ...state, roundWind: lastWind(state), kyoku: 4 };
    return {
      ...corrected,
      ended: true,
      log: [...state.log, makeLogEntry(corrected, "반장 종료", null, "info")],
    };
  }
  if (state.settings.tobi && state.players.some((p) => p.score < 0)) {
    return {
      ...state,
      ended: true,
      log: [...state.log, makeLogEntry(state, "토비 종료", null, "info")],
    };
  }
  return state;
}

export interface RiichiResult {
  state: GameState;
  ok: boolean;
  message?: string;
}

export function toggleRiichi(state: GameState, seat: SeatIndex): RiichiResult {
  if (state.ended) return { state, ok: false };
  const player = state.players[seat];
  if (!player.riichi && player.score < 1000) {
    return { state, ok: false, message: "1000점 미만이라 리치를 걸 수 없습니다" };
  }
  const wasRiichi = player.riichi;
  const players = state.players.map((p, i) =>
    i === seat ? { ...p, riichi: !wasRiichi, score: p.score + (wasRiichi ? 1000 : -1000) } : p
  ) as Players;
  const kyotaku = state.kyotaku + (wasRiichi ? -1 : 1);
  const midState: GameState = { ...state, players, kyotaku };

  if (wasRiichi) {
    // 취소는 기록에 남기지 않는다: 이 좌석의 마지막 "리치" 항목을 지우고 점수만 원복한다.
    const log = [...state.log];
    for (let i = log.length - 1; i >= 0; i--) {
      const e = log[i];
      if (e.kind === "riichi" && e.deltas && e.deltas[seat] === -1000) {
        log.splice(i, 1);
        break;
      }
    }
    return { state: { ...midState, log }, ok: true };
  }

  const deltas = [0, 0, 0, 0];
  deltas[seat] = -1000;
  const entry = makeLogEntry(midState, `${player.name} ${riichiWord(player.name)}`, deltas, "riichi");
  return { state: { ...midState, log: [...state.log, entry] }, ok: true };
}

export interface HandApplyResult {
  state: GameState;
  ok: boolean;
  deltas: number[];
}

export function applyHand(state: GameState, wins: WinInput[]): HandApplyResult {
  const d = dealer(state);
  const result = computeHand(wins, { dealer: d, honba: state.honba, kyotaku: state.kyotaku });
  if (!result.ok) return { state, ok: false, deltas: [0, 0, 0, 0] };

  const players = state.players.map((p, i) => ({
    ...p,
    score: p.score + result.deltas[i],
    riichi: false,
  })) as Players;
  const prefix = wins.length === 2 ? "더블론 · " : wins.length === 3 ? "트리플론 · " : "";
  const desc = wins
    .map((w) => {
      const who = state.players[w.winner].name;
      const how = w.type === "ron" ? `론 ← ${state.players[w.loser as SeatIndex].name}` : "쯔모";
      return `${who} ${how}${w.label ? ` · ${w.label}` : ""}`;
    })
    .join(" + ");

  const midState: GameState = { ...state, players, kyotaku: 0 };
  const entry = makeLogEntry(midState, prefix + desc, result.deltas, "hand");

  let { kyoku, roundWind, honba } = state;
  if (wins.some((w) => w.winner === d)) {
    honba += 1;
  } else {
    honba = 0;
    ({ kyoku, roundWind } = advanceRound(state));
  }

  const next: GameState = { ...midState, kyoku, roundWind, honba, log: [...state.log, entry] };
  return { state: finalizeAfterHand(next), ok: true, deltas: result.deltas };
}

export interface DrawApplyResult {
  state: GameState;
  deltas: number[];
}

export function applyDraw(state: GameState, draw: DrawInput): DrawApplyResult {
  const d = dealer(state);
  let deltas = [0, 0, 0, 0];
  let players = state.players;
  let text: string;

  if (!draw.abortive) {
    const n = draw.tenpai.filter(Boolean).length;
    if (n > 0 && n < 4) {
      const gain = 3000 / n;
      const loss = 3000 / (4 - n);
      deltas = draw.tenpai.map((t) => (t ? gain : -loss));
    }
    players = state.players.map((p, i) => ({ ...p, score: p.score + deltas[i], riichi: false })) as Players;
    const tenpaiNames = state.players.filter((_, i) => draw.tenpai[i]).map((p) => p.name);
    text = `유국 · ${tenpaiNames.length ? "텐파이 " + tenpaiNames.join(", ") : "전원 노텐"}`;
  } else {
    players = state.players.map((p) => ({ ...p, riichi: false })) as Players;
    text = "도중 유국";
  }

  const midState: GameState = { ...state, players };
  const entry = makeLogEntry(midState, text, draw.abortive ? null : deltas, "hand");

  const honba = state.honba + 1;
  let { kyoku, roundWind } = state;
  if (!draw.abortive && !draw.tenpai[d]) {
    ({ kyoku, roundWind } = advanceRound(state));
  }

  const next: GameState = { ...midState, kyoku, roundWind, honba, log: [...state.log, entry] };
  return { state: finalizeAfterHand(next), deltas };
}

/**
 * 쵼보: 그 국은 무효. 벌점을 지불하고, 이 국에 걸린 리치봉은 각자에게 돌려준다.
 * 본장·親·국은 그대로 두고 같은 국을 다시 친다.
 */
export function applyChombo(state: GameState, input: ChomboInput): DrawApplyResult {
  const d = dealer(state);
  const { culprit, pay } = input;
  const deltas = [0, 0, 0, 0];
  const splitMode = pay === "split" && culprit !== d;
  others(culprit).forEach((o) => {
    const amt = splitMode ? (o === d ? 4000 : 2000) : 3000;
    deltas[o] += amt;
    deltas[culprit] -= amt;
  });
  // 리치봉 반환
  let returned = 0;
  state.players.forEach((p, i) => {
    if (p.riichi) {
      deltas[i] += 1000;
      returned += 1;
    }
  });
  const players = state.players.map((p, i) => ({ ...p, score: p.score + deltas[i], riichi: false })) as Players;
  const kyotaku = Math.max(0, state.kyotaku - returned);
  const midState: GameState = { ...state, players, kyotaku };
  const how = splitMode ? "親 4000 · 子 2000" : "각 3000";
  const text = `쵼보 · ${state.players[culprit].name} · ${how}${returned ? ` · 리치봉 ${returned}개 반환` : ""}`;
  const entry = makeLogEntry(midState, text, deltas, "hand");
  const next: GameState = { ...midState, log: [...state.log, entry] };
  return { state: finalizeAfterHand(next), deltas };
}

export function startGame(names: string[], settings: GameSettings): GameState {
  return newGame(names, settings);
}

export interface ManualState {
  roundWind: number;
  kyoku: number;
  honba: number;
  kyotaku: number;
  scores: number[];
}

export function startGameWithManualState(
  names: string[],
  settings: GameSettings,
  manual: ManualState
): GameState {
  const base = newGame(names, settings);
  const players = base.players.map((p, i) => ({
    ...p,
    score: Math.round((manual.scores[i] || 0) / 100) * 100,
  })) as Players;
  const state: GameState = {
    ...base,
    players,
    roundWind: manual.roundWind,
    kyoku: manual.kyoku,
    honba: Math.max(0, manual.honba || 0),
    kyotaku: Math.max(0, manual.kyotaku || 0),
  };
  const entry = makeLogEntry(
    state,
    `진행 중인 게임에서 시작 · ${players.map((p) => p.score).join(" / ")}`,
    null,
    "start"
  );
  return { ...state, log: [entry] };
}

export function restartGame(state: GameState): GameState {
  return newGame(
    state.players.map((p) => p.name),
    { ...state.settings }
  );
}

export function exitToSetup(state: GameState): GameState {
  const fresh = newGame(
    state.players.map((p) => p.name),
    { ...state.settings }
  );
  return { ...fresh, setup: true };
}

export interface SettingsUpdate {
  /** 좌석별 새 이름. 빈 문자열/null이면 그대로 둔다(기본값 유지). */
  names: Array<string | null>;
  settings: Partial<GameSettings>;
  /** order[화면 위치] = 그 자리에 앉을 원래 좌석 인덱스 */
  order: SeatIndex[];
  manual: ManualState & { reopenIfEnded: boolean };
}

export interface SettingsUpdateResult {
  state: GameState;
  changed: boolean;
}

export function applySettingsUpdate(
  state: GameState,
  update: SettingsUpdate
): SettingsUpdateResult {
  let players = state.players.map((p, i) =>
    update.names[i] ? { ...p, name: update.names[i] as string } : p
  ) as Players;
  const settings = { ...state.settings, ...update.settings };

  const before = players.map((p) => p.score);
  const beforeKey = JSON.stringify([state.roundWind, state.kyoku, state.honba, state.kyotaku, before]);

  players = players.map((p, i) => ({
    ...p,
    score: Math.round((update.manual.scores[i] || 0) / 100) * 100,
  })) as Players;
  const roundWind = update.manual.roundWind;
  const kyoku = update.manual.kyoku;
  const honba = Math.max(0, update.manual.honba || 0);
  const kyotaku = Math.max(0, update.manual.kyotaku || 0);
  const ended = state.ended && update.manual.reopenIfEnded ? false : state.ended;

  const afterKey = JSON.stringify([roundWind, kyoku, honba, kyotaku, players.map((p) => p.score)]);
  const manualChanged = beforeKey !== afterKey;
  const manualDeltas = players.map((p, i) => p.score - before[i]);

  const reordered = update.order.some((pi, pos) => pi !== pos);
  const finalPlayers = reordered ? (update.order.map((pi) => players[pi]) as Players) : players;

  const midState: GameState = { ...state, players: finalPlayers, settings, roundWind, kyoku, honba, kyotaku, ended };
  let log = state.log;
  if (reordered) {
    const text = `자리 변경 · ${finalPlayers.map((p, i) => `${WINDS[i]} ${p.name}`).join(" · ")}`;
    log = [...log, makeLogEntry(midState, text, null, "manual")];
  }
  if (manualChanged) {
    const text = `수동 조정 · ${finalPlayers.map((p) => p.score).join(" / ")}`;
    log = [...log, makeLogEntry(midState, text, manualDeltas.some((x) => x) ? manualDeltas : null, "manual")];
  }

  return { state: { ...midState, log }, changed: manualChanged || reordered };
}

export { others };
