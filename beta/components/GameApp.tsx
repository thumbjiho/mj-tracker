"use client";

import { GameScreen } from "./GameScreen";
import { GameProvider } from "@/state/game-context";

/**
 * Mounted only on the client (see app/client-only-game.tsx) — this app has no
 * server-renderable content, it's a localStorage-backed interactive board.
 */
export default function GameApp() {
  return (
    <GameProvider>
      <GameScreen />
    </GameProvider>
  );
}
