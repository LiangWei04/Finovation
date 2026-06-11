import type { MomentumClassification } from "../types/esg";

const badgeClasses: Record<MomentumClassification, string> = {
  "Hidden Winners": "border-teal/30 bg-teal/10 text-emerald-200",
  "Future Leaders": "border-sky-400/30 bg-sky-400/10 text-sky-200",
  "Value Traps": "border-amber-400/30 bg-amber-400/10 text-amber-200",
  "Overrated Leaders": "border-rose-400/30 bg-rose-400/10 text-rose-200",
};

interface MomentumBadgeProps {
  classification: MomentumClassification;
  compact?: boolean;
}

export function MomentumBadge({ classification, compact = false }: MomentumBadgeProps) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border font-semibold ${compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]"} ${badgeClasses[classification]}`}>
      {classification}
    </span>
  );
}
