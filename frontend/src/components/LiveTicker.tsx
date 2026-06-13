import type { LiveSignal } from "../types/esg";

export function LiveTicker({ signals }: { signals: LiveSignal[] }) {
  if (!signals.length) return null;
  const tickerItems = [...signals, ...signals];

  return (
    <div className="mb-5 flex h-9 items-center gap-3 overflow-hidden rounded-full bg-[#1d1d1f] px-4 text-xs text-[#a1a1a6]">
      <span className="flex shrink-0 items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#86868b]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff3b30]" />
        Live Signals
      </span>
      <div className="relative h-5 min-w-0 flex-1 overflow-hidden">
        <div className="ticker-track absolute flex gap-10 whitespace-nowrap">
          {tickerItems.map((signal, index) => {
            const positive = signal.direction !== "negative";
            return (
              <span key={`${signal.id}-${index}`} className="inline-flex items-center gap-2">
                <b className="font-semibold text-white">{signal.sgxIdentifier}</b>
                <span>
                  {signal.category}: {signal.summary}
                </span>
                <span className={positive ? "font-semibold text-[#30d158]" : "font-semibold text-[#ff6961]"}>
                  {positive ? "+" : "-"}
                  {Math.abs(signal.impact).toFixed(2)} nowcast
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
