import type { ReactNode } from "react";

interface FilterBarProps {
  children: ReactNode;
}

export function FilterBar({ children }: FilterBarProps) {
  return <div className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-3 md:grid-cols-2 xl:grid-cols-5">{children}</div>;
}
