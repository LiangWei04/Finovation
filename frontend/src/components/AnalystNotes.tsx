import { AlertTriangle, CheckCircle2, Info, Search, TrendingUp } from "lucide-react";
interface AnalystNote {
  label: string;
  value: string;
  detail: string;
}

interface AnalystNotesProps {
  notes: AnalystNote[];
}

const icons = [TrendingUp, AlertTriangle, Info, Search, CheckCircle2, Info];

export function AnalystNotes({ notes }: AnalystNotesProps) {
  return (
    <section className="glass-panel rounded-lg p-4">
      <div className="flex flex-col gap-1 border-b border-white/10 pb-3">
        <p className="label">Analyst Notes</p>
        <h2 className="text-base font-semibold text-white">What deserves attention first</h2>
      </div>
      <div className="space-y-3 pt-3">
        {notes.map((note, index) => {
          const Icon = icons[index % icons.length];
          return (
            <article key={note.label} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gold/25 bg-gold/10">
                  <Icon className="h-4 w-4 text-gold" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{note.label}</p>
                  <p className="mt-1 text-sm font-semibold leading-5 text-white">{note.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{note.detail}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
