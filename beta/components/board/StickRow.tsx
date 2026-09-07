function StickSvg({ kind }: { kind: "h" | "t" }) {
  const dots =
    kind === "h"
      ? [16.5, 21.5, 26.5, 31.5].flatMap((x) =>
          [3.2, 6.8].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.05} fill="#1a1a1a" />)
        )
      : [<circle key="t" cx={24} cy={5} r={2.1} fill="#E8553F" />];
  return (
    <svg className="stk" viewBox="0 0 48 10" aria-hidden="true">
      <rect x={0.5} y={0.5} width={47} height={9} rx={4.5} fill="#F4EFE3" stroke="#B9B1A0" strokeWidth={0.8} />
      {dots}
    </svg>
  );
}

export function StickRow({ honba, kyotaku }: { honba: number; kyotaku: number }) {
  return (
    <div className="sticks">
      <div className="stkrow" title="본장 (백점봉)">
        <StickSvg kind="h" />
        <b>×{honba}</b>
      </div>
      <div className="stkrow" title="공탁 리치봉 (천점봉)">
        <StickSvg kind="t" />
        <b>×{kyotaku}</b>
      </div>
    </div>
  );
}
