import type { GameState } from "./mahjong/types";

const KEY = "mj-tracker-beta-v1";

export function loadGame(): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (parsed && Array.isArray(parsed.players) && parsed.players.length === 4) {
      return parsed;
    }
  } catch {
    // corrupt storage — treat as no saved game
  }
  return null;
}

export function saveGame(state: GameState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage full/unavailable — game still works in-memory for this session
  }
}
