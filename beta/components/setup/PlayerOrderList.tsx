"use client";

import { DEFAULT_NAMES, WINDS } from "@/lib/mahjong/constants";
import type { SeatIndex } from "@/lib/mahjong/types";
import { useRowDrag } from "./useRowDrag";

export function PlayerOrderList({
  order,
  setOrder,
  names,
  setNames,
}: {
  order: SeatIndex[];
  setOrder: (order: SeatIndex[]) => void;
  names: string[];
  setNames: (names: string[]) => void;
}) {
  const { rowProps, gripProps } = useRowDrag(order, setOrder);

  return (
    <>
      <div className="lbl">
        <span>플레이어</span>
        <span>≡ 를 끌어 자리 순서 바꾸기</span>
      </div>
      <div className="prow-wrap">
        <div className="windcol">
          {WINDS.map((w) => (
            <div className="windcell" key={w}>
              <span className="wind">{w}</span>
            </div>
          ))}
        </div>
        <div className="olist">
          {order.map((pi, pos) => {
            const { className, style } = rowProps(pos);
            return (
              <div key={pi} className={className} style={style}>
                <input
                  type="text"
                  value={names[pi] || ""}
                  placeholder={DEFAULT_NAMES[pi]}
                  maxLength={12}
                  aria-label={`플레이어 ${pi + 1} 이름`}
                  onChange={(e) => setNames(names.map((n, k) => (k === pi ? e.target.value : n)))}
                />
                <span className="grip" aria-label="순서 바꾸기" {...gripProps(pos)}>
                  ≡
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
