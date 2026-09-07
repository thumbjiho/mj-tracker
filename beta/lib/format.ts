export const sgn = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `-${Math.abs(n)}` : "0");

export type DeltaClass = "up" | "down" | "zero";
export const deltaClass = (n: number): DeltaClass => (n > 0 ? "up" : n < 0 ? "down" : "zero");
