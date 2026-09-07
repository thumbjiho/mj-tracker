/**
 * Ports #dock: when the viewport is clearly wider or taller than square, the
 * 유국/메뉴 buttons leave the board (whose center wheel gets too cramped) and
 * dock to the side/top strip instead. Pure CSS media-query driven — see the
 * "dock mode" block in globals.css — so this always renders and stays hidden
 * until that breakpoint applies.
 */
export function Dock({ ended, onDraw, onMenu }: { ended: boolean; onDraw: () => void; onMenu: () => void }) {
  return (
    <div id="dock">
      <button type="button" className="dk dk-draw" disabled={ended} onClick={onDraw}>
        <span>
          <i>유</i>
          <i>국</i>
        </span>
      </button>
      <button type="button" className="dk dk-menu" aria-label="메뉴" onClick={onMenu}>
        <span>
          <i>메</i>
          <i>뉴</i>
        </span>
      </button>
    </div>
  );
}
