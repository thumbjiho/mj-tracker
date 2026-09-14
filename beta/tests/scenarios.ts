/**
 * 시나리오 검증: 반장/동풍전 게임을 이벤트 시퀀스로 기술하고, lib/mahjong 의 결과가
 * 규칙에서 독립적으로 계산한 기대값(oracle)과 일치하는지 확인한다.
 *
 *   npx tsx tests/scenarios.ts            # 실행 + tests/SCENARIO_REPORT.md 갱신
 *
 * oracle 은 lib/mahjong 코드를 참조하지 않고 규칙만으로 다시 쓴 단순 모델이다.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyChombo,
  applyDraw,
  applyHand,
  dealer,
  newGame,
  posOf,
  riichiWord,
  toggleRiichi,
  defaultSettings,
} from "../lib/mahjong/game";
import { basePoints, roundUp100 } from "../lib/mahjong/scoring";
import type { GameSettings, GameState, SeatIndex, WinInput } from "../lib/mahjong/types";

// ---------------------------------------------------------------- 이벤트 정의
type Ev =
  | { t: "riichi"; seat: SeatIndex }
  | { t: "cancel"; seat: SeatIndex }
  | { t: "ron"; winner: SeatIndex; loser: SeatIndex; han: number; fu: number }
  | { t: "tsumo"; winner: SeatIndex; han: number; fu: number }
  | { t: "dron"; wins: Array<{ winner: SeatIndex; han: number; fu: number }>; loser: SeatIndex }
  | { t: "draw"; tenpai: [boolean, boolean, boolean, boolean] }
  | { t: "abortive" }
  | { t: "chombo"; culprit: SeatIndex; pay: "flat" | "split" };

interface Scenario {
  name: string;
  settings: Partial<GameSettings>;
  names?: string[];
  events: Ev[];
  /** 추가 단언 (oracle 비교 외) */
  extra?: (s: GameState, o: Oracle) => string | null;
}

// ---------------------------------------------------------------- Oracle (규칙 기반 독립 모델)
interface Oracle {
  scores: number[];
  riichi: boolean[];
  honba: number;
  kyotaku: number;
  wind: number; // 0 東 1 南
  kyoku: number; // 1..4
  ended: boolean;
  logCount: number;
  riichiLogCount: number;
  lastWind: number;
  tobi: boolean;
}

function oracleNew(settings: GameSettings): Oracle {
  return {
    scores: [settings.start, settings.start, settings.start, settings.start],
    riichi: [false, false, false, false],
    honba: 0,
    kyotaku: 0,
    wind: 0,
    kyoku: 1,
    ended: false,
    logCount: 0,
    riichiLogCount: 0,
    lastWind: settings.length === "ton" ? 0 : 1,
    tobi: settings.tobi,
  };
}
const oDealer = (o: Oracle): SeatIndex => ((o.kyoku - 1) % 4) as SeatIndex;

function oFinalize(o: Oracle) {
  if (o.wind > o.lastWind) {
    o.wind = o.lastWind;
    o.kyoku = 4;
    o.ended = true;
    o.logCount++; // "반장 종료"
    return;
  }
  if (o.tobi && o.scores.some((x) => x < 0)) {
    o.ended = true;
    o.logCount++; // "토비 종료"
  }
}
function oAdvance(o: Oracle) {
  o.kyoku++;
  if (o.kyoku > 4) {
    o.kyoku = 1;
    o.wind++;
  }
}
/** 子 론 기준 기본점 → 지불액 계산 (규칙표) */
function ronAmount(han: number, fu: number, dealerWin: boolean) {
  const bp = basePoints(han, fu);
  return roundUp100(bp * (dealerWin ? 6 : 4));
}
function tsumoPays(han: number, fu: number, dealerWin: boolean): { ko: number; oya: number } {
  const bp = basePoints(han, fu);
  return dealerWin ? { ko: roundUp100(bp * 2), oya: 0 } : { ko: roundUp100(bp), oya: roundUp100(bp * 2) };
}

function oracleApply(o: Oracle, ev: Ev): string | null {
  if (o.ended) return "ended";
  const d = oDealer(o);
  switch (ev.t) {
    case "riichi": {
      if (o.riichi[ev.seat]) return "already riichi";
      if (o.scores[ev.seat] < 1000) return "refused";
      o.riichi[ev.seat] = true;
      o.scores[ev.seat] -= 1000;
      o.kyotaku++;
      o.logCount++;
      o.riichiLogCount++;
      return null;
    }
    case "cancel": {
      if (!o.riichi[ev.seat]) return "not riichi";
      o.riichi[ev.seat] = false;
      o.scores[ev.seat] += 1000;
      o.kyotaku--;
      o.logCount--; // 기록에서 리치 항목이 사라짐
      o.riichiLogCount--;
      return null;
    }
    case "ron": {
      const amt = ronAmount(ev.han, ev.fu, ev.winner === d) + o.honba * 300;
      o.scores[ev.winner] += amt + o.kyotaku * 1000;
      o.scores[ev.loser] -= amt;
      o.kyotaku = 0;
      o.riichi = [false, false, false, false];
      o.logCount++;
      if (ev.winner === d) o.honba++;
      else {
        o.honba = 0;
        oAdvance(o);
      }
      oFinalize(o);
      return null;
    }
    case "tsumo": {
      const p = tsumoPays(ev.han, ev.fu, ev.winner === d);
      let total = 0;
      for (let i = 0; i < 4; i++) {
        if (i === ev.winner) continue;
        const pay = (ev.winner === d ? p.ko : i === d ? p.oya : p.ko) + o.honba * 100;
        o.scores[i] -= pay;
        total += pay;
      }
      o.scores[ev.winner] += total + o.kyotaku * 1000;
      o.kyotaku = 0;
      o.riichi = [false, false, false, false];
      o.logCount++;
      if (ev.winner === d) o.honba++;
      else {
        o.honba = 0;
        oAdvance(o);
      }
      oFinalize(o);
      return null;
    }
    case "dron": {
      // 더블/트리플론: 각자 본장 포함 지불, 리치봉은 방총자의 하가(가장 가까운) 화료자
      ev.wins.forEach((w) => {
        const amt = ronAmount(w.han, w.fu, w.winner === d) + o.honba * 300;
        o.scores[w.winner] += amt;
        o.scores[ev.loser] -= amt;
      });
      const rec = [...ev.wins.map((w) => w.winner)].sort(
        (a, b) => ((a - ev.loser + 4) % 4) - ((b - ev.loser + 4) % 4)
      )[0];
      o.scores[rec] += o.kyotaku * 1000;
      o.kyotaku = 0;
      o.riichi = [false, false, false, false];
      o.logCount++;
      if (ev.wins.some((w) => w.winner === d)) o.honba++;
      else {
        o.honba = 0;
        oAdvance(o);
      }
      oFinalize(o);
      return null;
    }
    case "draw": {
      const n = ev.tenpai.filter(Boolean).length;
      if (n > 0 && n < 4) {
        for (let i = 0; i < 4; i++) o.scores[i] += ev.tenpai[i] ? 3000 / n : -3000 / (4 - n);
      }
      o.riichi = [false, false, false, false]; // 리치봉은 공탁으로 남는다
      o.logCount++;
      o.honba++;
      if (!ev.tenpai[d]) oAdvance(o);
      oFinalize(o);
      return null;
    }
    case "abortive": {
      o.riichi = [false, false, false, false];
      o.logCount++;
      o.honba++; // 도중 유국도 본장 +1, 親 유지
      oFinalize(o);
      return null;
    }
    case "chombo": {
      const split = ev.pay === "split" && ev.culprit !== d;
      for (let i = 0; i < 4; i++) {
        if (i === ev.culprit) continue;
        const amt = split ? (i === d ? 4000 : 2000) : 3000;
        o.scores[i] += amt;
        o.scores[ev.culprit] -= amt;
      }
      // 이 국의 리치봉 반환
      for (let i = 0; i < 4; i++) {
        if (o.riichi[i]) {
          o.scores[i] += 1000;
          o.kyotaku--;
          o.riichi[i] = false;
        }
      }
      o.logCount++;
      // 본장·親·국 유지
      oFinalize(o);
      return null;
    }
  }
}

// ---------------------------------------------------------------- 앱 로직 적용
function win(winner: SeatIndex, type: "ron" | "tsumo", loser: SeatIndex | null, han: number, fu: number, d: SeatIndex): WinInput {
  const bp = basePoints(han, fu);
  const dealerWin = winner === d;
  if (type === "ron") return { winner, type, loser, base: roundUp100(bp * (dealerWin ? 6 : 4)), a: "", b: "", label: `${han}판 ${fu}부` };
  if (dealerWin) return { winner, type, loser: null, base: "", a: roundUp100(bp * 2), b: "", label: `${han}판 ${fu}부` };
  return { winner, type, loser: null, base: "", a: roundUp100(bp), b: roundUp100(bp * 2), label: `${han}판 ${fu}부` };
}

function appApply(s: GameState, ev: Ev): GameState {
  const d = dealer(s);
  switch (ev.t) {
    case "riichi":
    case "cancel":
      return toggleRiichi(s, ev.seat).state;
    case "ron":
      return applyHand(s, [win(ev.winner, "ron", ev.loser, ev.han, ev.fu, d)]).state;
    case "tsumo":
      return applyHand(s, [win(ev.winner, "tsumo", null, ev.han, ev.fu, d)]).state;
    case "dron":
      return applyHand(s, ev.wins.map((w) => win(w.winner, "ron", ev.loser, w.han, w.fu, d))).state;
    case "draw":
      return applyDraw(s, { tenpai: ev.tenpai, abortive: false }).state;
    case "abortive":
      return applyDraw(s, { tenpai: [false, false, false, false], abortive: true }).state;
    case "chombo":
      return applyChombo(s, ev).state;
  }
}

// ---------------------------------------------------------------- 비교
function compare(s: GameState, o: Oracle): string[] {
  const errs: string[] = [];
  const sc = s.players.map((p) => p.score);
  if (sc.join() !== o.scores.join()) errs.push(`scores app=${sc.join("/")} exp=${o.scores.join("/")}`);
  const rc = s.players.map((p) => p.riichi);
  if (rc.join() !== o.riichi.join()) errs.push(`riichi app=${rc.join()} exp=${o.riichi.join()}`);
  if (s.honba !== o.honba) errs.push(`honba app=${s.honba} exp=${o.honba}`);
  if (s.kyotaku !== o.kyotaku) errs.push(`kyotaku app=${s.kyotaku} exp=${o.kyotaku}`);
  if (s.roundWind !== o.wind) errs.push(`wind app=${s.roundWind} exp=${o.wind}`);
  if (s.kyoku !== o.kyoku) errs.push(`kyoku app=${s.kyoku} exp=${o.kyoku}`);
  if (s.ended !== o.ended) errs.push(`ended app=${s.ended} exp=${o.ended}`);
  if (s.log.length !== o.logCount) errs.push(`log.length app=${s.log.length} exp=${o.logCount}`);
  const rl = s.log.filter((e) => e.kind === "riichi").length;
  if (rl !== o.riichiLogCount) errs.push(`riichi log entries app=${rl} exp=${o.riichiLogCount}`);
  if (s.log.some((e) => e.text.includes("취소"))) errs.push(`log contains "취소" entry`);
  const sum = sc.reduce((a, b) => a + b, 0) + s.kyotaku * 1000;
  const expectSum = s.settings.start * 4;
  if (sum !== expectSum) errs.push(`point conservation: scores+kyotaku=${sum} exp=${expectSum}`);
  return errs;
}

// ---------------------------------------------------------------- 시나리오 생성
const T: [boolean, boolean, boolean, boolean][] = [];
for (let m = 0; m < 16; m++) T.push([!!(m & 1), !!(m & 2), !!(m & 4), !!(m & 8)]);

const hand: Scenario[] = [
  {
    name: "동1국 子 론 3판30부 → 親 이동",
    settings: {},
    events: [{ t: "ron", winner: 1, loser: 0, han: 3, fu: 30 }],
    extra: (s) => (dealer(s) === 1 && s.kyoku === 2 ? null : "dealer should be seat 1 / kyoku 2"),
  },
  {
    name: "親 쯔모 연장 → 본장 +1, 親 유지",
    settings: {},
    events: [{ t: "tsumo", winner: 0, han: 2, fu: 40 }],
    extra: (s) => (s.honba === 1 && dealer(s) === 0 ? null : "renchan failed"),
  },
  {
    name: "리치 후 취소 → 기록에 리치 항목 없음",
    settings: {},
    events: [{ t: "riichi", seat: 2 }, { t: "cancel", seat: 2 }],
    extra: (s) => (s.log.length === 0 && s.kyotaku === 0 ? null : "cancel left trace"),
  },
  {
    name: "리치 A, 리치 B, A 취소 → B 기록만 남음",
    settings: {},
    events: [{ t: "riichi", seat: 0 }, { t: "riichi", seat: 3 }, { t: "cancel", seat: 0 }],
    extra: (s) => (s.log.length === 1 && s.log[0].deltas?.[3] === -1000 ? null : "wrong entry removed"),
  },
  {
    name: "리치 → 취소 → 다시 리치 → 취소 (반복)",
    settings: {},
    events: [
      { t: "riichi", seat: 1 }, { t: "cancel", seat: 1 },
      { t: "riichi", seat: 1 }, { t: "cancel", seat: 1 },
      { t: "riichi", seat: 1 },
    ],
    extra: (s) => (s.log.length === 1 ? null : `expected 1 log, got ${s.log.length}`),
  },
  {
    name: "이스터에그: 이름 '리지'의 리치 기록은 '리지 리지'",
    settings: {},
    names: ["조조", "리지", "쟝쟝", "후후"],
    events: [{ t: "riichi", seat: 1 }, { t: "riichi", seat: 0 }],
    extra: (s) =>
      s.log[0].text === "리지 리지" && s.log[1].text === "조조 리치" && riichiWord("리지") === "리지" && riichiWord("조조") === "리치"
        ? null
        : `texts: ${s.log.map((e) => e.text).join(" | ")}`,
  },
  {
    name: "리치 후 유국(전원 노텐) → 리치봉 공탁으로 이월",
    settings: {},
    events: [{ t: "riichi", seat: 1 }, { t: "draw", tenpai: [false, false, false, false] }],
    extra: (s) => (s.kyotaku === 1 && s.honba === 1 && dealer(s) === 1 ? null : "carryover failed"),
  },
  {
    name: "공탁 1 + 본장 1 상태에서 子 론 → 공탁·본장 모두 화료자에게",
    settings: {},
    events: [
      { t: "riichi", seat: 1 },
      { t: "draw", tenpai: [false, false, false, false] },
      { t: "ron", winner: 2, loser: 3, han: 1, fu: 30 },
    ],
    extra: (s) => (s.players[2].score === 25000 + 1000 + 300 + 1000 ? null : `score ${s.players[2].score}`),
  },
  {
    name: "사풍연타(도중 유국) → 본장 +1, 親 유지, 점수 이동 없음",
    settings: {},
    events: [{ t: "abortive" }],
    extra: (s) => (s.honba === 1 && s.kyoku === 1 && s.players.every((p) => p.score === 25000) ? null : "abortive wrong"),
  },
  {
    name: "리치 중 사풍연타 → 리치봉 공탁 유지, 본장 +1",
    settings: {},
    events: [{ t: "riichi", seat: 0 }, { t: "riichi", seat: 2 }, { t: "abortive" }],
    extra: (s) => (s.honba === 1 && s.kyotaku === 2 && s.players[0].score === 24000 ? null : "abortive+riichi wrong"),
  },
  {
    name: "도중 유국 두 번 연속 → 본장 2",
    settings: {},
    events: [{ t: "abortive" }, { t: "abortive" }],
    extra: (s) => (s.honba === 2 ? null : `honba ${s.honba}`),
  },
  {
    name: "도중 유국 후 親 론 → 본장 2 (300점 가산 확인)",
    settings: {},
    events: [{ t: "abortive" }, { t: "ron", winner: 0, loser: 1, han: 1, fu: 30 }],
    extra: (s) => (s.players[0].score === 25000 + 1500 + 300 && s.honba === 2 ? null : `score ${s.players[0].score} honba ${s.honba}`),
  },
  {
    name: "쵼보(子, 각 3000) → 9000 지불, 국·본장 유지",
    settings: {},
    events: [{ t: "chombo", culprit: 2, pay: "flat" }],
    extra: (s) => (s.players[2].score === 16000 && s.honba === 0 && s.kyoku === 1 ? null : "chombo flat wrong"),
  },
  {
    name: "쵼보(子, 親4000·子2000) → 8000 지불",
    settings: {},
    events: [{ t: "chombo", culprit: 2, pay: "split" }],
    extra: (s) => (s.players[2].score === 17000 && s.players[0].score === 29000 ? null : "chombo split wrong"),
  },
  {
    name: "쵼보(親, split 선택) → 親은 각 3000으로 처리",
    settings: {},
    events: [{ t: "chombo", culprit: 0, pay: "split" }],
    extra: (s) => (s.players[0].score === 16000 && s.players.slice(1).every((p) => p.score === 28000) ? null : "dealer chombo wrong"),
  },
  {
    name: "리치 두 명 후 쵼보 → 리치봉 반환, 공탁 0",
    settings: {},
    events: [{ t: "riichi", seat: 1 }, { t: "riichi", seat: 3 }, { t: "chombo", culprit: 2, pay: "flat" }],
    extra: (s) => (s.kyotaku === 0 && s.players[1].score === 28000 && s.players[3].score === 28000 ? null : "riichi return wrong"),
  },
  {
    name: "이월 공탁 1 + 이번 국 리치 1 후 쵼보 → 이번 국 것만 반환, 공탁 1 유지",
    settings: {},
    events: [
      { t: "riichi", seat: 1 },
      { t: "draw", tenpai: [false, false, false, false] },
      { t: "riichi", seat: 3 },
      { t: "chombo", culprit: 0, pay: "flat" },
    ],
    extra: (s) => (s.kyotaku === 1 && s.honba === 1 ? null : `kyotaku ${s.kyotaku} honba ${s.honba}`),
  },
  {
    name: "쵼보로 토비 → 종료",
    settings: {},
    events: [
      { t: "ron", winner: 1, loser: 2, han: 13, fu: 30 }, // 2: 25000-32000 = -7000 → tobi 즉시
    ],
    extra: (s) => (s.ended ? null : "tobi not ended"),
  },
  {
    name: "토비 옵션 끔 → 마이너스여도 계속",
    settings: { tobi: false },
    events: [{ t: "ron", winner: 1, loser: 2, han: 13, fu: 30 }, { t: "tsumo", winner: 3, han: 1, fu: 30 }],
    extra: (s) => (!s.ended ? null : "should continue"),
  },
  {
    name: "동풍전: 동4국 子 화료 → 종료",
    settings: { length: "ton" },
    events: [
      { t: "ron", winner: 1, loser: 0, han: 1, fu: 30 },
      { t: "ron", winner: 2, loser: 1, han: 1, fu: 30 },
      { t: "ron", winner: 3, loser: 2, han: 1, fu: 30 },
      { t: "ron", winner: 0, loser: 3, han: 1, fu: 30 },
    ],
    extra: (s) => (s.ended && s.roundWind === 0 && s.kyoku === 4 ? null : "ton end wrong"),
  },
  {
    name: "동풍전: 동4국 親 연장 → 계속 (오라스 유지)",
    settings: { length: "ton" },
    events: [
      { t: "ron", winner: 1, loser: 0, han: 1, fu: 30 },
      { t: "ron", winner: 2, loser: 1, han: 1, fu: 30 },
      { t: "ron", winner: 3, loser: 2, han: 1, fu: 30 },
      { t: "tsumo", winner: 3, han: 1, fu: 30 },
    ],
    extra: (s) => (!s.ended && s.honba === 1 ? null : "oorasu renchan wrong"),
  },
  {
    name: "반장: 남4국 子 화료 → 종료",
    settings: {},
    events: Array.from({ length: 8 }, (_, i) => ({ t: "ron" as const, winner: ((i + 1) % 4) as SeatIndex, loser: (i % 4) as SeatIndex, han: 1, fu: 30 })),
    extra: (s) => (s.ended && s.roundWind === 1 && s.kyoku === 4 ? null : "hanchan end wrong"),
  },
  {
    name: "반장: 남4국 노텐 親 유국 → 종료",
    settings: {},
    events: [
      ...Array.from({ length: 7 }, (_, i) => ({ t: "ron" as const, winner: ((i + 1) % 4) as SeatIndex, loser: (i % 4) as SeatIndex, han: 1, fu: 30 })),
      { t: "draw", tenpai: [true, false, false, false] },
    ],
    extra: (s) => (s.ended ? null : "should end"),
  },
  {
    name: "반장: 남4국 텐파이 親 유국 → 계속",
    settings: {},
    events: [
      ...Array.from({ length: 7 }, (_, i) => ({ t: "ron" as const, winner: ((i + 1) % 4) as SeatIndex, loser: (i % 4) as SeatIndex, han: 1, fu: 30 })),
      { t: "draw", tenpai: [false, false, false, true] },
    ],
    extra: (s) => (!s.ended && s.honba === 1 ? null : "should continue"),
  },
  {
    name: "더블론: 방총자 하가가 리치봉 획득",
    settings: {},
    events: [
      { t: "riichi", seat: 2 },
      { t: "dron", wins: [{ winner: 1, han: 1, fu: 30 }, { winner: 3, han: 2, fu: 30 }], loser: 0 },
    ],
    extra: (s) => (s.players[1].score === 25000 + 1000 + 1000 ? null : `seat1 ${s.players[1].score}`),
  },
  {
    name: "트리플론: 親 포함 → 본장 +1",
    settings: {},
    events: [
      { t: "dron", wins: [{ winner: 0, han: 1, fu: 30 }, { winner: 1, han: 1, fu: 30 }, { winner: 2, han: 1, fu: 30 }], loser: 3 },
    ],
    extra: (s) => (s.honba === 1 && dealer(s) === 0 ? null : "triple ron dealer renchan wrong"),
  },
  {
    name: "화면 방향 고정: posOf 는 국과 무관하게 좌석 = 위치",
    settings: {},
    events: [{ t: "ron", winner: 1, loser: 0, han: 1, fu: 30 }, { t: "ron", winner: 2, loser: 1, han: 1, fu: 30 }],
    extra: (s) => ([0, 1, 2, 3].every((i) => posOf(s, i as SeatIndex) === i) ? null : "posOf rotated"),
  },
  {
    name: "1000점 미만은 리치 불가",
    settings: { tobi: false },
    events: [{ t: "ron", winner: 1, loser: 0, han: 13, fu: 30 }, { t: "riichi", seat: 0 }],
    extra: (s) => (s.players[0].score === 25000 - 32000 && !s.players[0].riichi && s.log.length === 1 ? null : "riichi should be refused"),
  },
  ...T.map<Scenario>((tp) => ({
    name: `유국 텐파이 조합 ${tp.map((x) => (x ? "T" : "·")).join("")}`,
    settings: {},
    events: [{ t: "draw", tenpai: tp }],
  })),
];

// 랜덤 시나리오 (시드 고정)
function rng(seed: number) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    return x / 0xffffffff;
  };
}
function randomScenario(idx: number): Scenario {
  const r = rng(1000 + idx * 7919);
  const pick = <X>(a: X[]) => a[Math.floor(r() * a.length)];
  const seat = () => Math.floor(r() * 4) as SeatIndex;
  const length = r() < 0.4 ? "ton" : "han";
  const tobi = r() < 0.8;
  const start = pick([25000, 30000]);
  const events: Ev[] = [];
  const riichiOn = [false, false, false, false];
  const nHands = 4 + Math.floor(r() * 12);
  for (let h = 0; h < nHands; h++) {
    // 리치 단계
    const nr = Math.floor(r() * 3);
    for (let k = 0; k < nr; k++) {
      const s = seat();
      if (!riichiOn[s]) {
        events.push({ t: "riichi", seat: s });
        riichiOn[s] = true;
        if (r() < 0.25) {
          events.push({ t: "cancel", seat: s });
          riichiOn[s] = false;
        }
      }
    }
    const kind = r();
    const han = pick([1, 1, 2, 2, 3, 3, 4, 5, 6, 8, 11, 13]);
    const fu = han >= 5 ? 30 : pick([20, 25, 30, 40, 50, 70]);
    if (kind < 0.4) {
      const w = seat();
      let l = seat();
      while (l === w) l = seat();
      events.push({ t: "ron", winner: w, loser: l, han, fu: fu === 20 ? 30 : fu });
    } else if (kind < 0.7) {
      events.push({ t: "tsumo", winner: seat(), han, fu: fu === 25 ? 30 : fu });
    } else if (kind < 0.85) {
      events.push({ t: "draw", tenpai: pick(T) });
    } else if (kind < 0.93) {
      events.push({ t: "abortive" });
    } else if (kind < 0.97) {
      events.push({ t: "chombo", culprit: seat(), pay: r() < 0.5 ? "flat" : "split" });
    } else {
      const l = seat();
      const ws = ([0, 1, 2, 3] as SeatIndex[]).filter((x) => x !== l).filter(() => r() < 0.7).slice(0, 2);
      if (ws.length >= 2) events.push({ t: "dron", wins: ws.map((w) => ({ winner: w, han: pick([1, 2, 3]), fu: 30 })), loser: l });
      else events.push({ t: "ron", winner: ws[0] ?? ((l + 1) % 4) as SeatIndex, loser: l, han: 1, fu: 30 });
    }
    riichiOn.fill(false);
  }
  return { name: `랜덤 #${idx + 1} (${length === "ton" ? "동풍전" : "반장"} · ${start} · tobi=${tobi})`, settings: { length, tobi, start }, events };
}

const scenarios: Scenario[] = [...hand, ...Array.from({ length: 70 }, (_, i) => randomScenario(i))];

// ---------------------------------------------------------------- 실행
interface Row { name: string; events: number; applied: number; ok: boolean; detail: string; final: string }
const rows: Row[] = [];
for (const sc of scenarios) {
  const settings: GameSettings = { ...defaultSettings(), ...sc.settings };
  let s = newGame(sc.names ?? ["A", "B", "C", "D"], settings);
  const o = oracleNew(settings);
  const errs: string[] = [];
  let applied = 0;
  for (const ev of sc.events) {
    // 게임이 끝나면 UI 가 모든 입력 버튼을 잠그므로 이후 이벤트는 오지 않는다.
    if (o.ended) break;
    const skip = oracleApply(o, ev);
    const before = s;
    s = appApply(s, ev);
    if (skip) {
      // oracle 이 거부한 이벤트는 앱도 상태를 바꾸지 않아야 한다 (ended/refused)
      if (skip === "ended" && s !== before && JSON.stringify(s) !== JSON.stringify(before)) errs.push(`event after end changed state: ${ev.t}`);
      if (skip === "refused" && s.players.some((p, i) => p.riichi !== before.players[i].riichi)) errs.push(`refused riichi applied`);
      continue;
    }
    applied++;
    const e = compare(s, o);
    if (e.length) {
      errs.push(`after #${applied} ${ev.t}: ${e.join("; ")}`);
      break;
    }
  }
  if (!errs.length && sc.extra) {
    const x = sc.extra(s, o);
    if (x) errs.push(`extra: ${x}`);
  }
  rows.push({
    name: sc.name,
    events: sc.events.length,
    applied,
    ok: errs.length === 0,
    detail: errs.join(" | "),
    final: `${["東", "南"][s.roundWind]}${s.kyoku}局 ${s.honba}본장 공탁${s.kyotaku} ${s.ended ? "종료" : "진행"} · ${s.players.map((p) => p.score).join("/")}`,
  });
}

const pass = rows.filter((r) => r.ok).length;
const here = dirname(fileURLToPath(import.meta.url));
const md = [
  `# 시나리오 검증 결과`,
  ``,
  `- 실행: ${new Date().toISOString()}`,
  `- 시나리오 ${rows.length}개 · 통과 ${pass} · 실패 ${rows.length - pass}`,
  `- 검증 항목: 점수, 리치 상태, 본장, 공탁, 장풍/국, 종료 여부, 기록 개수(리치 취소 항목 없음), 점수 보존(합계 + 공탁 = 시작점 × 4)`,
  ``,
  `| # | 시나리오 | 이벤트 | 결과 | 최종 상태 | 비고 |`,
  `|---|---|---|---|---|---|`,
  ...rows.map((r, i) => `| ${i + 1} | ${r.name} | ${r.applied}/${r.events} | ${r.ok ? "✅" : "❌"} | ${r.final} | ${r.detail} |`),
  ``,
].join("\n");
writeFileSync(join(here, "SCENARIO_REPORT.md"), md);
console.log(`${pass}/${rows.length} passed`);
rows.filter((r) => !r.ok).forEach((r) => console.log(`FAIL ${r.name}: ${r.detail}`));
process.exit(pass === rows.length ? 0 : 1);
