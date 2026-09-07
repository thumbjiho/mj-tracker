"use client";

import { dealer, isOorasu, posOf, seatWind } from "@/lib/mahjong/game";
import type { GameState, SeatIndex } from "@/lib/mahjong/types";
import { CenterPanel } from "./CenterPanel";
import { Dock } from "./Dock";
import { SeatCard } from "./SeatCard";
import type { PointerEvent as ReactPointerEvent } from "react";

const POS_CLASS = ["bottom", "right", "top", "left"];
const ALL_SEATS: SeatIndex[] = [0, 1, 2, 3];

interface BoardProps {
  state: GameState;
  flash: number[] | null;
  onToggleRiichi: (seat: SeatIndex) => void;
  onSeatPointerDown: (seat: SeatIndex, e: ReactPointerEvent<HTMLDivElement>) => void;
  onSeatPointerUp: (seat: SeatIndex, e: ReactPointerEvent<HTMLDivElement>) => void;
  onSeatPointerCancel: (seat: SeatIndex, e: ReactPointerEvent<HTMLDivElement>) => void;
  onDraw: () => void;
  onMenu: () => void;
}

export function Board({
  state,
  flash,
  onToggleRiichi,
  onSeatPointerDown,
  onSeatPointerUp,
  onSeatPointerCancel,
  onDraw,
  onMenu,
}: BoardProps) {
  const d = dealer(state);

  return (
    <>
      <div className="board">
        {ALL_SEATS.map((seat) => {
          const pos = posOf(state, seat);
          const player = state.players[seat];
          const classes = ["band", POS_CLASS[pos], "seat"];
          if (seat === d) classes.push("dealer");
          if (player.riichi) classes.push("riichi");
          return (
            <div key={seat} className={classes.join(" ")}>
              <SeatCard
                seat={seat}
                wind={seatWind(state, seat)}
                name={player.name}
                score={player.score}
                riichi={player.riichi}
                ended={state.ended}
                flashDelta={flash ? flash[seat] : 0}
                onToggleRiichi={() => onToggleRiichi(seat)}
                onCardPointerDown={(e) => onSeatPointerDown(seat, e)}
                onCardPointerUp={(e) => onSeatPointerUp(seat, e)}
                onCardPointerCancel={(e) => onSeatPointerCancel(seat, e)}
              />
            </div>
          );
        })}
        <div className="band center">
          <CenterPanel
            dealer={d}
            names={state.players.map((p) => p.name)}
            roundWind={state.roundWind}
            kyoku={state.kyoku}
            honba={state.honba}
            kyotaku={state.kyotaku}
            ended={state.ended}
            isOorasu={isOorasu(state)}
            onDraw={onDraw}
            onMenu={onMenu}
          />
        </div>
      </div>
      <Dock ended={state.ended} onDraw={onDraw} onMenu={onMenu} />
    </>
  );
}
