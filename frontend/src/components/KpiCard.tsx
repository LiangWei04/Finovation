import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  detail?: string;
}

export function KpiCard({ label, value, icon: Icon, detail }: KpiCardProps) {
  return (
    <div className="glass-panel rounded-lg p-3 transition hover:border-teal/35">
      <div className="flex items-center justify-between gap-3">
        <p className="label">{label}</p>
        <div className="rounded-md border border-teal/20 bg-teal/10 p-1.5 text-teal">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-400">{detail}</p> : null}
    </div>
  );
}
