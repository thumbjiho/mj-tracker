import { describe, expect, it } from "vitest";
import {
  applyDraw,
  applyHand,
  applySettingsUpdate,
  dealer,
  defaultSettings,
  isOorasu,
  newGame,
  posOf,
  restartGame,
  seatWind,
  toggleRiichi,
} from "./game";
import type { GameState, SeatIndex, WinInput } from "./types";

const NAMES = ["A", "B", "C", "D"];

function freshGame(overrides: Partial<GameState> = {}): GameState {
  return { ...newGame(NAMES, defaultSettings()), ...overrides };
}

describe("dealer / seatWind / posOf", () => {
  it("dealer rotates with kyoku", () => {
    expect(dealer(freshGame({ kyoku: 1 }))).toBe(0);
    expect(dealer(freshGame({ kyoku: 2 }))).toBe(1);
    expect(dealer(freshGame({ kyoku: 4 }))).toBe(3);
  });

  it("the dealer's own wind is always 東, others rotate relative to them", () => {
    const state = freshGame({ kyoku: 2 }); // dealer = seat 1
    expect(seatWind(state, 1)).toBe("東");
    expect(seatWind(state, 2)).toBe("南");
    expect(seatWind(state, 3)).toBe("西");
    expect(seatWind(state, 0)).toBe("北");
  });

  it("posOf always puts the dealer at position 0 (bottom)", () => {
    const state = freshGame({ kyoku: 3 }); // dealer = seat 2
    expect(posOf(state, 2)).toBe(0);
    expect(posOf(state, 3)).toBe(1);
    expect(posOf(state, 0)).toBe(2);
    expect(posOf(state, 1)).toBe(3);
  });
});

describe("isOorasu", () => {
  it("is true only on the last kyoku of the last round wind", () => {
    expect(isOorasu(freshGame({ roundWind: 1, kyoku: 4 }))).toBe(true); // 南4局 in a 반장 game
    expect(isOorasu(freshGame({ roundWind: 0, kyoku: 4 }))).toBe(false); // 東4局
    expect(isOorasu(freshGame({ roundWind: 1, kyoku: 4, ended: true }))).toBe(false);
  });

  it("respects 동풍전 (last wind is East, not South)", () => {
    const settings = { ...defaultSettings(), length: "ton" as const };
    expect(isOorasu(freshGame({ settings, roundWind: 0, kyoku: 4 }))).toBe(true);
  });
});

describe("toggleRiichi", () => {
  it("declines under 1000 points", () => {
    const state = freshGame();
    state.players[0].score = 500;
    const r = toggleRiichi(state, 0);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/1000/);
  });

  it("deducts 1000 and adds a kyotaku stick", () => {
    const state = freshGame();
    const r = toggleRiichi(state, 0);
    expect(r.ok).toBe(true);
    expect(r.state.players[0].score).toBe(24000);
    expect(r.state.players[0].riichi).toBe(true);
    expect(r.state.kyotaku).toBe(1);
  });

  it("refunds the stick when toggled back off", () => {
    const state = freshGame();
    const after = toggleRiichi(state, 0).state;
    const back = toggleRiichi(after, 0);
    expect(back.state.players[0].score).toBe(25000);
    expect(back.state.players[0].riichi).toBe(false);
    expect(back.state.kyotaku).toBe(0);
  });
});

describe("applyHand", () => {
  it("keeps the same dealer and increments honba when the dealer wins", () => {
    const state = freshGame(); // dealer = seat 0
    const wins: WinInput[] = [{ winner: 0, type: "ron", loser: 1, base: 1000, a: "", b: "", label: "" }];
    const r = applyHand(state, wins);
    expect(r.ok).toBe(true);
    expect(r.state.kyoku).toBe(1);
    expect(r.state.honba).toBe(1);
  });

  it("advances the kyoku and resets honba when a non-dealer wins", () => {
    const state = freshGame({ honba: 3 });
    const wins: WinInput[] = [{ winner: 1, type: "ron", loser: 0, base: 1000, a: "", b: "", label: "" }];
    const r = applyHand(state, wins);
    expect(r.state.kyoku).toBe(2);
    expect(r.state.honba).toBe(0);
  });

  it("clears riichi sticks and kyotaku after a hand", () => {
    const withRiichi = toggleRiichi(freshGame(), 2).state;
    const wins: WinInput[] = [{ winner: 0, type: "ron", loser: 1, base: 1000, a: "", b: "", label: "" }];
    const r = applyHand(withRiichi, wins);
    expect(r.state.players.every((p) => !p.riichi)).toBe(true);
    expect(r.state.kyotaku).toBe(0);
  });

  it("ends the game when 반장 finishes past the last round", () => {
    const state = freshGame({ roundWind: 1, kyoku: 4 }); // 南4局, dealer = seat 3
    const wins: WinInput[] = [{ winner: 0, type: "ron", loser: 3, base: 1000, a: "", b: "", label: "" }];
    const r = applyHand(state, wins);
    expect(r.state.ended).toBe(true);
    expect(r.state.roundWind).toBe(1);
    expect(r.state.kyoku).toBe(4);
  });

  it("ends the game on tobi (a negative score) when enabled", () => {
    const state = freshGame({ settings: { ...defaultSettings(), tobi: true } });
    state.players[1].score = 500;
    const wins: WinInput[] = [{ winner: 0, type: "ron", loser: 1, base: 8000, a: "", b: "", label: "" }];
    const r = applyHand(state, wins);
    expect(r.state.players[1].score).toBeLessThan(0);
    expect(r.state.ended).toBe(true);
  });

  it("rejects an invalid hand and returns the state unchanged", () => {
    const state = freshGame();
    const r = applyHand(state, [{ winner: 0, type: "ron", loser: 0, base: 1000, a: "", b: "", label: "" }]);
    expect(r.ok).toBe(false);
    expect(r.state).toBe(state);
  });
});

describe("applyDraw", () => {
  it("splits 3000 between tenpai and noten players", () => {
    const state = freshGame();
    const r = applyDraw(state, { tenpai: [true, true, false, false], abortive: false });
    expect(r.state.players[0].score).toBe(25000 + 1500);
    expect(r.state.players[1].score).toBe(25000 + 1500);
    expect(r.state.players[2].score).toBe(25000 - 1500);
    expect(r.state.players[3].score).toBe(25000 - 1500);
  });

  it("moves no points when everyone or no one is tenpai", () => {
    const allTenpai = applyDraw(freshGame(), { tenpai: [true, true, true, true], abortive: false });
    expect(allTenpai.state.players.every((p) => p.score === 25000)).toBe(true);
    const noneTenpai = applyDraw(freshGame(), { tenpai: [false, false, false, false], abortive: false });
    expect(noneTenpai.state.players.every((p) => p.score === 25000)).toBe(true);
  });

  it("keeps the dealer if they're tenpai, advances otherwise", () => {
    const state = freshGame(); // dealer = seat 0
    const kept = applyDraw(state, { tenpai: [true, false, false, false], abortive: false });
    expect(kept.state.kyoku).toBe(1);
    const advanced = applyDraw(state, { tenpai: [false, true, false, false], abortive: false });
    expect(advanced.state.kyoku).toBe(2);
  });

  it("moves no points and keeps the dealer on an abortive draw", () => {
    const state = freshGame();
    const r = applyDraw(state, { tenpai: [true, true, true, true], abortive: true });
    expect(r.state.players.every((p) => p.score === 25000)).toBe(true);
    expect(r.state.kyoku).toBe(1);
    expect(r.state.honba).toBe(1);
  });
});

describe("restartGame", () => {
  it("keeps names and settings but resets everything else", () => {
    const state = freshGame({ kyoku: 3, honba: 2, ended: true });
    state.players[0].score = 40000;
    const next = restartGame(state);
    expect(next.players.map((p) => p.name)).toEqual(NAMES);
    expect(next.players.every((p) => p.score === 25000)).toBe(true);
    expect(next.kyoku).toBe(1);
    expect(next.ended).toBe(false);
  });
});

describe("applySettingsUpdate", () => {
  it("physically reorders seats and reports the change", () => {
    const state = freshGame();
    const order: SeatIndex[] = [1, 0, 2, 3];
    const r = applySettingsUpdate(state, {
      names: [null, null, null, null],
      settings: {},
      order,
      manual: {
        roundWind: state.roundWind,
        kyoku: state.kyoku,
        honba: state.honba,
        kyotaku: state.kyotaku,
        scores: state.players.map((p) => p.score),
        reopenIfEnded: false,
      },
    });
    expect(r.changed).toBe(true);
    expect(r.state.players.map((p) => p.name)).toEqual(["B", "A", "C", "D"]);
  });

  it("reports no change when nothing actually moved or differs", () => {
    const state = freshGame();
    const r = applySettingsUpdate(state, {
      names: [null, null, null, null],
      settings: {},
      order: [0, 1, 2, 3],
      manual: {
        roundWind: state.roundWind,
        kyoku: state.kyoku,
        honba: state.honba,
        kyotaku: state.kyotaku,
        scores: state.players.map((p) => p.score),
        reopenIfEnded: false,
      },
    });
    expect(r.changed).toBe(false);
  });

  it("reopens an ended game only when asked", () => {
    const state = freshGame({ ended: true });
    const manual = {
      roundWind: state.roundWind,
      kyoku: state.kyoku,
      honba: state.honba,
      kyotaku: state.kyotaku,
      scores: state.players.map((p) => p.score),
    };
    const stillEnded = applySettingsUpdate(state, {
      names: [null, null, null, null],
      settings: {},
      order: [0, 1, 2, 3],
      manual: { ...manual, reopenIfEnded: false },
    });
    expect(stillEnded.state.ended).toBe(true);
    const reopened = applySettingsUpdate(state, {
      names: [null, null, null, null],
      settings: {},
      order: [0, 1, 2, 3],
      manual: { ...manual, reopenIfEnded: true },
    });
    expect(reopened.state.ended).toBe(false);
  });
});
