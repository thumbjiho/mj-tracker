"use client";

import { useState } from "react";
import { Board } from "@/components/board/Board";
import { PovOverlay } from "@/components/board/PovOverlay";
import { Toast } from "@/components/design-system/Toast";
import { DrawSheet } from "@/components/draw/DrawSheet";
import { LogSheet } from "@/components/log/LogSheet";
import { MenuSheet } from "@/components/menu/MenuSheet";
import { SettingsSheet } from "@/components/settings/SettingsSheet";
import { SettleSheet } from "@/components/settle/SettleSheet";
import { SetupWizard } from "@/components/setup/SetupWizard";
import { WinWizard } from "@/components/win-wizard/WinWizard";
import type { SeatIndex } from "@/lib/mahjong/types";
import { useGame } from "@/state/game-context";

type ActiveSheet =
  | { type: "none" }
  | { type: "menu" }
  | { type: "win"; seat?: SeatIndex }
  | { type: "draw" }
  | { type: "settings" }
  | { type: "log" }
  | { type: "settle" }
  | { type: "pov"; seat: SeatIndex };

export function GameScreen() {
  const { state, toast, flash, doRiichi } = useGame();
  const [sheet, setSheet] = useState<ActiveSheet>({ type: "none" });

  const close = () => setSheet({ type: "none" });
  const finishHand = (ended: boolean) => setSheet(ended ? { type: "settle" } : { type: "none" });

  return (
    <div className="relative h-full w-full overflow-hidden bg-ground">
      <Board
        state={state}
        flash={flash}
        onToggleRiichi={doRiichi}
        onTapSeat={(seat) =>
          setSheet((prev) => (prev.type === "pov" && prev.seat === seat ? { type: "none" } : { type: "pov", seat }))
        }
        onWinFor={(seat) => setSheet({ type: "win", seat })}
        onDraw={() => setSheet({ type: "draw" })}
        onMenu={() => setSheet({ type: "menu" })}
      />

      {sheet.type === "pov" && <PovOverlay state={state} seat={sheet.seat} onClose={close} />}
      {sheet.type === "win" && <WinWizard initialWinner={sheet.seat} onDone={finishHand} />}
      {sheet.type === "draw" && <DrawSheet onDone={finishHand} />}
      {sheet.type === "menu" && (
        <MenuSheet
          onClose={close}
          onOpenSettle={() => setSheet({ type: "settle" })}
          onOpenLog={() => setSheet({ type: "log" })}
          onOpenSettings={() => setSheet({ type: "settings" })}
          onExit={close}
        />
      )}
      {sheet.type === "settings" && <SettingsSheet onClose={close} />}
      {sheet.type === "log" && <LogSheet onClose={close} />}
      {sheet.type === "settle" && <SettleSheet onClose={close} />}

      {state.setup && <SetupWizard />}

      <Toast message={toast} />
    </div>
  );
}
