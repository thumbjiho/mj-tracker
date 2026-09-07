"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_NAMES } from "@/lib/mahjong/constants";
import {
  applyDraw,
  applyHand,
  applySettingsUpdate,
  defaultSettings,
  exitToSetup,
  newGame,
  restartGame,
  startGame,
  startGameWithManualState,
  toggleRiichi,
  type ManualState,
  type SettingsUpdate,
} from "@/lib/mahjong/game";
import { loadGame, saveGame } from "@/lib/storage";
import type {
  DrawInput,
  GameSettings,
  GameState,
  SeatIndex,
  WinInput,
} from "@/lib/mahjong/types";

interface ConfirmHandOutcome {
  ok: boolean;
  ended?: boolean;
}

interface GameContextValue {
  state: GameState;
  flash: number[] | null;
  toast: string | null;
  doRiichi: (seat: SeatIndex) => void;
  confirmHand: (wins: WinInput[]) => ConfirmHandOutcome;
  confirmDraw: (draw: DrawInput) => { ended: boolean };
  startNewGame: (names: string[], settings: GameSettings) => void;
  startGameFromState: (names: string[], settings: GameSettings, manual: ManualState) => void;
  restart: () => void;
  goToSetup: () => void;
  saveSettings: (update: SettingsUpdate) => boolean;
  showToast: (message: string) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

function initialGame(): GameState {
  return loadGame() ?? { ...newGame(DEFAULT_NAMES.slice(), defaultSettings()), setup: true };
}

export function GameProvider({ children }: { children: ReactNode }) {
  // GameApp (the only caller) is mounted with next/dynamic({ssr:false}), so this
  // always runs client-side and localStorage is safe to read here.
  const [state, setState] = useState<GameState>(() => initialGame());
  const [flash, setFlash] = useState<number[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    saveGame(state);
  }, [state]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  const showToast = useCallback((message: string) => setToast(message), []);

  const doRiichi = useCallback(
    (seat: SeatIndex) => {
      setState((prev) => {
        const r = toggleRiichi(prev, seat);
        if (!r.ok) {
          if (r.message) showToast(r.message);
          return prev;
        }
        return r.state;
      });
    },
    [showToast]
  );

  const confirmHand = useCallback(
    (wins: WinInput[]): ConfirmHandOutcome => {
      const r = applyHand(state, wins);
      if (!r.ok) {
        showToast("입력이 완료되지 않았습니다");
        return { ok: false };
      }
      setState(r.state);
      setFlash(r.deltas.some((d) => d) ? r.deltas : null);
      return { ok: true, ended: r.state.ended };
    },
    [state, showToast]
  );

  const confirmDraw = useCallback(
    (draw: DrawInput): { ended: boolean } => {
      const r = applyDraw(state, draw);
      setState(r.state);
      setFlash(r.deltas.some((d) => d) ? r.deltas : null);
      return { ended: r.state.ended };
    },
    [state]
  );

  const startNewGame = useCallback((names: string[], settings: GameSettings) => {
    setFlash(null);
    setState(startGame(names, settings));
  }, []);

  const startGameFromState = useCallback(
    (names: string[], settings: GameSettings, manual: ManualState) => {
      setFlash(null);
      setState(startGameWithManualState(names, settings, manual));
    },
    []
  );

  const restart = useCallback(() => {
    setState((prev) => restartGame(prev));
    setFlash(null);
  }, []);

  const goToSetup = useCallback(() => {
    setState((prev) => exitToSetup(prev));
    setFlash(null);
  }, []);

  const saveSettings = useCallback(
    (update: SettingsUpdate): boolean => {
      const r = applySettingsUpdate(state, update);
      setFlash(null);
      setState(r.state);
      return r.changed;
    },
    [state]
  );

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      flash,
      toast,
      doRiichi,
      confirmHand,
      confirmDraw,
      startNewGame,
      startGameFromState,
      restart,
      goToSetup,
      saveSettings,
      showToast,
    }),
    [
      state,
      flash,
      toast,
      doRiichi,
      confirmHand,
      confirmDraw,
      startNewGame,
      startGameFromState,
      restart,
      goToSetup,
      saveSettings,
      showToast,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside <GameProvider>");
  return ctx;
}
