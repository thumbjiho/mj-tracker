"use client";

import { useCallback, useState } from "react";
import type { ManualState } from "@/lib/mahjong/game";

/**
 * Ports updateManualSum()'s auto-balance behavior: editing one player's score
 * "locks" it, and the still-untouched seats redistribute the remainder to
 * keep the total correct. Locking 0 or all 4 seats turns auto-fill off.
 */
function rebalance(scores: number[], locked: Set<number>, kyotaku: number, start: number): number[] {
  if (locked.size === 0 || locked.size >= 4) return scores;
  const freeIdx = [0, 1, 2, 3].filter((i) => !locked.has(i));
  let rest = start * 4 - kyotaku * 1000;
  scores.forEach((v, i) => {
    if (locked.has(i)) rest -= v || 0;
  });
  const each = Math.floor(rest / freeIdx.length / 100) * 100;
  const next = [...scores];
  freeIdx.forEach((i, k) => {
    next[i] = k === freeIdx.length - 1 ? rest - each * (freeIdx.length - 1) : each;
  });
  return next;
}

export function useManualScores(manual: ManualState, setManual: (m: ManualState) => void, start: number) {
  const [locked, setLocked] = useState<Set<number>>(new Set());

  const setScore = useCallback(
    (seat: number, value: number) => {
      const nextLocked = new Set(locked);
      nextLocked.add(seat);
      setLocked(nextLocked);
      const scores = [...manual.scores];
      scores[seat] = value;
      setManual({ ...manual, scores: rebalance(scores, nextLocked, manual.kyotaku, start) });
    },
    [locked, manual, setManual, start]
  );

  const setKyotaku = useCallback(
    (value: number) => {
      const next: ManualState = { ...manual, kyotaku: Math.max(0, value) };
      next.scores = rebalance(next.scores, locked, next.kyotaku, start);
      setManual(next);
    },
    [locked, manual, setManual, start]
  );

  const isAuto = (seat: number) => locked.size > 0 && locked.size < 4 && !locked.has(seat);
  const sum = manual.scores.reduce((a, b) => a + (b || 0), 0);
  const total = sum + manual.kyotaku * 1000;
  const expect = start * 4;

  return { setScore, setKyotaku, isAuto, total, expect, balanced: total === expect };
}
