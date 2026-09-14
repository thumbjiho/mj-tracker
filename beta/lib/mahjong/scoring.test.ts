import { describe, expect, it } from "vitest";
import { basePoints, computeHand, computeWin, others, roundUp100, settle } from "./scoring";
import { defaultSettings, newGame } from "./game";
import type { GameState, SeatIndex, WinInput } from "./types";

describe("others", () => {
  it("returns every seat except the given one", () => {
    expect(others(0)).toEqual([1, 2, 3]);
    expect(others(2)).toEqual([0, 1, 3]);
  });
});

describe("roundUp100", () => {
  it("rounds up to the nearest 100", () => {
    expect(roundUp100(1)).toBe(100);
    expect(roundUp100(100)).toBe(100);
    expect(roundUp100(101)).toBe(200);
  });
});

describe("basePoints", () => {
  it("uses fu*2^(han+2) below 5 han", () => {
    expect(basePoints(1, 30)).toBe(30 * 2 ** 3);
    expect(basePoints(3, 30)).toBe(30 * 2 ** 5);
  });
  it("caps the fu formula at 2000 (mangan territory)", () => {
    expect(basePoints(4, 40)).toBe(2000); // 40*2^6=2560, capped
  });
  it("uses the fixed limit table at 5+ han", () => {
    expect(basePoints(5, 30)).toBe(2000); // mangan
    expect(basePoints(6, 30)).toBe(3000); // haneman
    expect(basePoints(8, 30)).toBe(4000); // baiman
    expect(basePoints(11, 30)).toBe(6000); // sanbaiman
    expect(basePoints(13, 30)).toBe(8000); // yakuman
    expect(basePoints(26, 30)).toBe(16000); // double yakuman
    expect(basePoints(39, 30)).toBe(24000); // triple yakuman
    expect(basePoints(52, 30)).toBe(32000); // quadruple yakuman
  });
});

const ctx = (dealer: SeatIndex, honba = 0) => ({ dealer, honba });

describe("computeWin", () => {
  it("computes a non-dealer ron with no honba", () => {
    const win: WinInput = { winner: 0, type: "ron", loser: 1, base: 8000, a: "", b: "", label: "" };
    const r = computeWin(win, ctx(2));
    expect(r.ok).toBe(true);
    expect(r.deltas).toEqual([8000, -8000, 0, 0]);
    expect(r.base).toBe("8000");
  });

  it("adds 300/honba to a ron", () => {
    const win: WinInput = { winner: 0, type: "ron", loser: 1, base: 1000, a: "", b: "", label: "" };
    const r = computeWin(win, ctx(2, 2));
    expect(r.deltas).toEqual([1600, -1600, 0, 0]);
    expect(r.honba).toBe(600);
  });

  it("rejects a ron where the loser is the winner", () => {
    const win: WinInput = { winner: 0, type: "ron", loser: 0, base: 1000, a: "", b: "", label: "" };
    expect(computeWin(win, ctx(1)).ok).toBe(false);
  });

  it("rejects a ron with no positive base", () => {
    const win: WinInput = { winner: 0, type: "ron", loser: 1, base: 0, a: "", b: "", label: "" };
    expect(computeWin(win, ctx(1)).ok).toBe(false);
  });

  it("computes a dealer tsumo: everyone pays the same, plus honba*100 each", () => {
    const win: WinInput = { winner: 0, type: "tsumo", loser: null, base: "", a: 2000, b: "", label: "" };
    const r = computeWin(win, ctx(0, 1));
    // dealer (seat 0) collects 2100 from each of the other three
    expect(r.deltas).toEqual([6300, -2100, -2100, -2100]);
  });

  it("computes a non-dealer tsumo: dealer pays double (b), others pay a, plus honba/100 each", () => {
    const win: WinInput = { winner: 1, type: "tsumo", loser: null, base: "", a: 1000, b: 2000, label: "" };
    const r = computeWin(win, ctx(0, 1));
    // seat 0 is dealer -> pays b(2000)+100, seats 2/3 pay a(1000)+100
    expect(r.deltas[0]).toBe(-2100);
    expect(r.deltas[2]).toBe(-1100);
    expect(r.deltas[3]).toBe(-1100);
    expect(r.deltas[1]).toBe(2100 + 1100 + 1100);
  });

  it("rejects a non-dealer tsumo missing the dealer payment (b)", () => {
    const win: WinInput = { winner: 1, type: "tsumo", loser: null, base: "", a: 1000, b: "", label: "" };
    expect(computeWin(win, ctx(0)).ok).toBe(false);
  });
});

describe("computeHand", () => {
  it("adds the kyotaku bonus once, to the sole winner", () => {
    const wins: WinInput[] = [{ winner: 0, type: "ron", loser: 1, base: 1000, a: "", b: "", label: "" }];
    const r = computeHand(wins, { dealer: 2, honba: 0, kyotaku: 2 });
    expect(r.ok).toBe(true);
    expect(r.deltas[0]).toBe(1000 + 2000);
    expect(r.rec).toBe(0);
  });

  it("gives a double ron's kyotaku to whichever winner sits closest to the loser", () => {
    // loser is seat 1; winners are seat 3 (2 seats away) and seat 2 (1 seat away, closer)
    const wins: WinInput[] = [
      { winner: 3, type: "ron", loser: 1, base: 1000, a: "", b: "", label: "" },
      { winner: 2, type: "ron", loser: 1, base: 1000, a: "", b: "", label: "" },
    ];
    const r = computeHand(wins, { dealer: 0, honba: 0, kyotaku: 1 });
    expect(r.ok).toBe(true);
    expect(r.rec).toBe(2);
    expect(r.deltas[2]).toBe(1000 + 1000);
    expect(r.deltas[3]).toBe(1000);
    expect(r.deltas[1]).toBe(-2000);
  });

  it("fails the whole hand if any single win is invalid", () => {
    const wins: WinInput[] = [
      { winner: 0, type: "ron", loser: 1, base: 1000, a: "", b: "", label: "" },
      { winner: 2, type: "ron", loser: 1, base: 0, a: "", b: "", label: "" },
    ];
    expect(computeHand(wins, { dealer: 3, honba: 0, kyotaku: 0 }).ok).toBe(false);
  });

  it("fails on an empty hand", () => {
    expect(computeHand([], { dealer: 0, honba: 0, kyotaku: 0 }).ok).toBe(false);
  });
});

function stateWith(scores: [number, number, number, number], overrides: Partial<GameState> = {}): GameState {
  const state = newGame(["A", "B", "C", "D"], defaultSettings());
  state.players.forEach((p, i) => {
    p.score = scores[i];
  });
  return { ...state, ...overrides };
}

describe("settle", () => {
  it("ranks by score descending, ties broken by seat index", () => {
    const state = stateWith([25000, 25000, 30000, 20000]);
    const rows = settle(state);
    expect(rows.map((r) => r.seat)).toEqual([2, 0, 1, 3]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });

  it("applies uma to each rank and folds the oka bonus into first place", () => {
    // start 25000, oka 30000, uma 10-20 => uma [20,10,-10,-20] per rank (in *1000 units after /1000)
    const state = stateWith([35000, 27000, 24000, 14000], {
      settings: { ...defaultSettings(), oka: 30000, uma: "10-20" },
    });
    const rows = settle(state);
    // 1st (35000): (35000-30000)/1000 + 20 + (30000-25000)*4/1000 = 5+20+20 = 45
    expect(rows[0].pts).toBeCloseTo(45);
    // 2nd (27000): (27000-30000)/1000 + 10 = -3+10 = 7
    expect(rows[1].pts).toBeCloseTo(7);
    // 3rd (24000): (24000-30000)/1000 - 10 = -6-10 = -16
    expect(rows[2].pts).toBeCloseTo(-16);
    // 4th (14000): (14000-30000)/1000 - 20 = -16-20 = -36
    expect(rows[3].pts).toBeCloseTo(-36);
  });
});
