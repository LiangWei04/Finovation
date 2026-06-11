import type { MomentumClassification } from "../types/esg";

const badgeClasses: Record<MomentumClassification, string> = {
  "Hidden Winners": "border-teal/30 bg-teal/10 text-teal",
  "Future Leaders": "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  "Value Traps": "border-amber-400/30 bg-amber-400/10 text-amber-200",
  "Overrated Leaders": "border-rose-400/30 bg-rose-400/10 text-rose-200",
};

interface MomentumBadgeProps {
  classification: MomentumClassification;
}

export function MomentumBadge({ classification }: MomentumBadgeProps) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClasses[classification]}`}>
      {classification}
    </span>
  );
}
