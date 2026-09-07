"use client";

import { useState } from "react";
import { Board } from "@/components/board/Board";
import { Layer } from "@/components/board/Layer";
import { PovOverlay } from "@/components/board/PovOverlay";
import { useSeatPress } from "@/components/board/useSeatPress";
import { useWinDrag, type WinDragResolution } from "@/components/board/useWinDrag";
import { Toast } from "@/components/chrome/Toast";
import { useEscapeKey } from "@/components/chrome/useEscapeKey";
import { DrawSheet } from "@/components/draw/DrawSheet";
import { LogSheet } from "@/components/log/LogSheet";
import { MenuSheet } from "@/components/menu/MenuSheet";
import { SettingsSheet } from "@/components/settings/SettingsSheet";
import { SettleSheet } from "@/components/settle/SettleSheet";
import { SetupWizard } from "@/components/setup/SetupWizard";
import { WinWizard, type WinDraftPreset } from "@/components/win-wizard/WinWizard";
import { useGame } from "@/state/game-context";

type ActiveSheet =
  | { type: "none" }
  | { type: "menu" }
  | { type: "win"; preset?: WinDraftPreset }
  | { type: "draw" }
  | { type: "settings" }
  | { type: "log" }
  | { type: "settle" };

export function GameScreen() {
  const { state, toast, flash, doRiichi } = useGame();
  const [sheet, setSheet] = useState<ActiveSheet>({ type: "none" });
  const seatPress = useSeatPress();

  const close = () => setSheet({ type: "none" });
  const finishHand = (ended: boolean) => setSheet(ended ? { type: "settle" } : { type: "none" });

  const winDragDisabled = sheet.type !== "none" || state.setup;
  useWinDrag(
    state,
    (r: WinDragResolution) => setSheet({ type: "win", preset: r }),
    winDragDisabled
  );
  useEscapeKey(seatPress.closePov, seatPress.povSeat != null);

  return (
    <>
      <Board
        state={state}
        flash={flash}
        onToggleRiichi={doRiichi}
        onSeatPointerDown={seatPress.onPointerDown}
        onSeatPointerUp={seatPress.onPointerUp}
        onSeatPointerCancel={seatPress.onPointerCancel}
        onDraw={() => setSheet({ type: "draw" })}
        onMenu={() => setSheet({ type: "menu" })}
      />

      {seatPress.povSeat != null && (
        <Layer>
          <PovOverlay state={state} seat={seatPress.povSeat} hold={seatPress.held} onClose={seatPress.closePov} />
        </Layer>
      )}

      {sheet.type === "win" && (
        <Layer>
          <WinWizard preset={sheet.preset} onDone={finishHand} />
        </Layer>
      )}
      {sheet.type === "draw" && (
        <Layer>
          <DrawSheet onDone={finishHand} />
        </Layer>
      )}
      {sheet.type === "menu" && (
        <Layer>
          <MenuSheet
            onClose={close}
            onOpenSettle={() => setSheet({ type: "settle" })}
            onOpenLog={() => setSheet({ type: "log" })}
            onOpenSettings={() => setSheet({ type: "settings" })}
            onExit={close}
          />
        </Layer>
      )}
      {sheet.type === "settings" && (
        <Layer>
          <SettingsSheet onClose={close} />
        </Layer>
      )}
      {sheet.type === "log" && (
        <Layer>
          <LogSheet onClose={close} />
        </Layer>
      )}
      {sheet.type === "settle" && (
        <Layer>
          <SettleSheet onClose={close} />
        </Layer>
      )}

      {state.setup && (
        <Layer>
          <SetupWizard />
        </Layer>
      )}

      <Toast message={toast} />
    </>
  );
}
