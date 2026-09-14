import type { UmaKey } from "./types";

export const WINDS = ["東", "南", "西", "北"] as const;
export const DEFAULT_NAMES = ["조조", "리지", "쟝쟝", "후후"];

/** 기록 그래프에서 좌석 0~3에 쓰는 선 색상 */
export const SERIES = ["#3987e5", "#d95926", "#2fa36b", "#b862d6"];

export const UMA: Record<UmaKey, [number, number, number, number]> = {
  none: [0, 0, 0, 0],
  "5-10": [10, 5, -5, -10],
  "10-20": [20, 10, -10, -20],
  "10-30": [30, 10, -10, -30],
};

export const RON_KO = [
  1000, 1300, 1600, 2000, 2600, 3200, 3900, 5200, 6400, 7700, 8000, 12000,
  16000, 24000, 32000, 48000,
];
export const RON_OYA = [
  1500, 2000, 2400, 2900, 3900, 4800, 5800, 7700, 9600, 11600, 12000, 18000,
  24000, 36000, 48000,
];
export const TSUMO_KO: Array<[number, number]> = [
  [300, 500],
  [400, 700],
  [500, 1000],
  [700, 1300],
  [800, 1600],
  [1000, 2000],
  [1300, 2600],
  [1600, 3200],
  [2000, 4000],
  [3000, 6000],
  [4000, 8000],
  [6000, 12000],
  [8000, 16000],
];
export const TSUMO_OYA = [
  500, 700, 800, 1000, 1300, 1600, 2000, 2600, 3200, 4000, 6000, 8000, 12000,
  16000,
];

export const LIMITS: Array<[string, number]> = [
  ["만관", 5],
  ["하네만", 6],
  ["배만", 8],
  ["삼배만", 11],
  ["역만", 13],
  ["더블역만", 26],
  ["트리플역만", 39],
  ["4배역만", 52],
];

export const FUS = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];

/**
 * 역 일람. han = 멘젠 판수, open = 후로(울었을) 때 판수 (null 이면 멘젠 한정),
 * yakuman = 역만 배수. 도라는 별도 스테퍼로 센다.
 */
export interface YakuDef {
  id: string;
  name: string;
  han: number;
  open: number | null;
  yakuman?: 1 | 2;
}

export interface YakuGroup {
  title: string;
  items: YakuDef[];
}

export const YAKU_GROUPS: YakuGroup[] = [
  {
    title: "1판",
    items: [
      { id: "riichi", name: "리치", han: 1, open: null },
      { id: "ippatsu", name: "일발", han: 1, open: null },
      { id: "tsumo", name: "멘젠쯔모", han: 1, open: null },
      { id: "pinfu", name: "핑후", han: 1, open: null },
      { id: "tanyao", name: "탕야오", han: 1, open: 1 },
      { id: "iipeikou", name: "이페코", han: 1, open: null },
      { id: "yaku-seat", name: "역패 · 자풍", han: 1, open: 1 },
      { id: "yaku-round", name: "역패 · 장풍", han: 1, open: 1 },
      { id: "yaku-haku", name: "역패 · 백", han: 1, open: 1 },
      { id: "yaku-hatsu", name: "역패 · 발", han: 1, open: 1 },
      { id: "yaku-chun", name: "역패 · 중", han: 1, open: 1 },
      { id: "rinshan", name: "영상개화", han: 1, open: 1 },
      { id: "chankan", name: "창깡", han: 1, open: 1 },
      { id: "haitei", name: "해저로월", han: 1, open: 1 },
      { id: "houtei", name: "하저로어", han: 1, open: 1 },
    ],
  },
  {
    title: "2판",
    items: [
      { id: "double-riichi", name: "더블리치", han: 2, open: null },
      { id: "chiitoi", name: "치또이", han: 2, open: null },
      { id: "sanshoku", name: "삼색동순", han: 2, open: 1 },
      { id: "ittsu", name: "일기통관", han: 2, open: 1 },
      { id: "chanta", name: "찬타", han: 2, open: 1 },
      { id: "toitoi", name: "또이또이", han: 2, open: 2 },
      { id: "sanankou", name: "산안커", han: 2, open: 2 },
      { id: "sanshoku-dokou", name: "삼색동각", han: 2, open: 2 },
      { id: "sankantsu", name: "산깡쯔", han: 2, open: 2 },
      { id: "shousangen", name: "소삼원", han: 2, open: 2 },
      { id: "honroutou", name: "혼노두", han: 2, open: 2 },
    ],
  },
  {
    title: "3판 · 6판",
    items: [
      { id: "honitsu", name: "혼일색", han: 3, open: 2 },
      { id: "junchan", name: "준찬타", han: 3, open: 2 },
      { id: "ryanpeikou", name: "량페코", han: 3, open: null },
      { id: "chinitsu", name: "청일색", han: 6, open: 5 },
    ],
  },
  {
    title: "역만",
    items: [
      { id: "kokushi", name: "국사무쌍", han: 13, open: null, yakuman: 1 },
      { id: "suuankou", name: "사암각", han: 13, open: null, yakuman: 1 },
      { id: "daisangen", name: "대삼원", han: 13, open: 13, yakuman: 1 },
      { id: "shousuushii", name: "소사희", han: 13, open: 13, yakuman: 1 },
      { id: "tsuuiisou", name: "자일색", han: 13, open: 13, yakuman: 1 },
      { id: "ryuuiisou", name: "녹일색", han: 13, open: 13, yakuman: 1 },
      { id: "chinroutou", name: "청노두", han: 13, open: 13, yakuman: 1 },
      { id: "chuuren", name: "구련보등", han: 13, open: null, yakuman: 1 },
      { id: "suukantsu", name: "사깡쯔", han: 13, open: 13, yakuman: 1 },
      { id: "tenhou", name: "천화", han: 13, open: null, yakuman: 1 },
      { id: "chiihou", name: "지화", han: 13, open: null, yakuman: 1 },
      { id: "kokushi-13", name: "국사 13면", han: 26, open: null, yakuman: 2 },
      { id: "suuankou-tanki", name: "사암각 단기", han: 26, open: null, yakuman: 2 },
      { id: "daisuushii", name: "대사희", han: 26, open: 26, yakuman: 2 },
      { id: "junsei-chuuren", name: "순정 구련보등", han: 26, open: null, yakuman: 2 },
    ],
  },
];

export const YAKU_BY_ID: Record<string, YakuDef> = Object.fromEntries(
  YAKU_GROUPS.flatMap((g) => g.items).map((y) => [y.id, y])
);
