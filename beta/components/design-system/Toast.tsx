export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed bottom-7 left-1/2 z-40 max-w-[90vw] -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 text-center text-sm font-medium text-[#10161a] shadow-lg">
      {message}
    </div>
  );
}
