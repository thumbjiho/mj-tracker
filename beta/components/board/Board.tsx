"use client";

import { dealer, isOorasu, posOf, seatWind } from "@/lib/mahjong/game";
import type { GameState, SeatIndex } from "@/lib/mahjong/types";
import styles from "./board.module.css";
import { CenterPanel } from "./CenterPanel";
import { SeatCard } from "./SeatCard";

const POS_CLASS = [styles.bottom, styles.right, styles.top, styles.left];
const ALL_SEATS: SeatIndex[] = [0, 1, 2, 3];

interface BoardProps {
  state: GameState;
  flash: number[] | null;
  onToggleRiichi: (seat: SeatIndex) => void;
  onTapSeat: (seat: SeatIndex) => void;
  onWinFor: (seat: SeatIndex) => void;
  onDraw: () => void;
  onMenu: () => void;
}

export function Board({ state, flash, onToggleRiichi, onTapSeat, onWinFor, onDraw, onMenu }: BoardProps) {
  const d = dealer(state);

  return (
    <div className={styles.board}>
      {ALL_SEATS.map((seat) => {
        const pos = posOf(state, seat);
        const player = state.players[seat];
        return (
          <div key={seat} className={`${styles.band} ${POS_CLASS[pos]}`}>
            <SeatCard
              wind={seatWind(state, seat)}
              name={player.name}
              score={player.score}
              riichi={player.riichi}
              isDealer={seat === d}
              ended={state.ended}
              flashDelta={flash ? flash[seat] : undefined}
              onToggleRiichi={() => onToggleRiichi(seat)}
              onTap={() => onTapSeat(seat)}
            />
          </div>
        );
      })}
      <div className={`${styles.band} ${styles.center}`}>
        <CenterPanel
          dealer={d}
          names={state.players.map((p) => p.name)}
          roundWind={state.roundWind}
          kyoku={state.kyoku}
          honba={state.honba}
          kyotaku={state.kyotaku}
          ended={state.ended}
          isOorasu={isOorasu(state)}
          onWinFor={onWinFor}
          onDraw={onDraw}
          onMenu={onMenu}
        />
      </div>
    </div>
  );
}
