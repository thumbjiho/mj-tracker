"use client";

import dynamic from "next/dynamic";

const GameApp = dynamic(() => import("@/components/GameApp"), { ssr: false });

export function ClientOnlyGame() {
  return <GameApp />;
}
