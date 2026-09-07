export type SeatIndex = 0 | 1 | 2 | 3;

export type GameLength = "han" | "ton";
export type UmaKey = "none" | "5-10" | "10-20" | "10-30";

export interface GameSettings {
  length: GameLength;
  start: number;
  oka: number;
  uma: UmaKey;
  tobi: boolean;
  finalCalc: boolean;
}

export interface Player {
  name: string;
  score: number;
  riichi: boolean;
}

export type Players = [Player, Player, Player, Player];

export type LogKind = "info" | "riichi" | "hand" | "manual" | "start";

export interface LogEntry {
  round: string;
  sr: string;
  text: string;
  kind: LogKind;
  deltas: number[] | null;
  scores: number[];
}

export interface GameState {
  players: Players;
  /** 0 = 東, 1 = 南 (동풍전에서는 1에 도달하지 않음) */
  roundWind: number;
  kyoku: number;
  honba: number;
  kyotaku: number;
  log: LogEntry[];
  settings: GameSettings;
  ended: boolean;
  setup: boolean;
  started: number;
}

export type WinType = "ron" | "tsumo";

export interface WinInput {
  winner: SeatIndex;
  type: WinType;
  /** ron에서만 사용 */
  loser: SeatIndex | null;
  /** ron: 본장/공탁을 제외한 총 지불 점수 */
  base: number | "";
  /** tsumo: 子 지불액(親이 화료했으면 전원 동일 지불액) */
  a: number | "";
  /** tsumo: 親 지불액(子가 화료했을 때만) */
  b: number | "";
  /** 화면 표시용 (예: "3판 30부", "만관") */
  label: string;
}

export interface DrawInput {
  tenpai: [boolean, boolean, boolean, boolean];
  abortive: boolean;
}

export interface WinResult {
  ok: boolean;
  deltas: [number, number, number, number];
  honba?: number;
  base?: string;
}

export interface HandResult {
  ok: boolean;
  deltas: [number, number, number, number];
  rec?: SeatIndex;
  kyotaku?: number;
  parts?: WinResult[];
}

export interface SettleRow {
  seat: SeatIndex;
  rank: number;
  score: number;
  pts: number;
}
