function StickIcon({ kind }: { kind: "honba" | "riichi" }) {
  return (
    <svg viewBox="0 0 48 10" aria-hidden className="h-2.5 w-auto drop-shadow-sm">
      <rect x="0.5" y="0.5" width="47" height="9" rx="4.5" fill="#F4EFE3" stroke="#B9B1A0" strokeWidth="0.8" />
      {kind === "honba"
        ? [16.5, 21.5, 26.5, 31.5].flatMap((x) =>
            [3.2, 6.8].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.05} fill="#1a1a1a" />)
          )
        : <circle cx={24} cy={5} r={2.1} fill="#E8553F" />}
    </svg>
  );
}

export function StickRow({ honba, kyotaku }: { honba: number; kyotaku: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1 text-ink-2" title="본장 (백점봉)">
        <StickIcon kind="honba" />
        <b className="font-num text-sm text-ink tabular-nums">×{honba}</b>
      </div>
      <div className="flex items-center gap-1 text-ink-2" title="공탁 리치봉 (천점봉)">
        <StickIcon kind="riichi" />
        <b className="font-num text-sm text-ink tabular-nums">×{kyotaku}</b>
      </div>
    </div>
  );
}
