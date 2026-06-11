import { CalendarDays } from "lucide-react";

interface HeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  windowLabel?: string;
}

export function Header({ title, eyebrow, description, windowLabel }: HeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? <p className="label mb-2 text-teal">{eyebrow}</p> : null}
        <h1 className="max-w-4xl text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{description}</p> : null}
      </div>
      {windowLabel ? (
        <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
          <CalendarDays className="h-4 w-4 text-teal" />
          <span>{windowLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
