import { BarChart3, Building2, Database, Radar } from "lucide-react";
import type { ReactNode } from "react";
import { navigateTo, type Route } from "../routes/router";

interface LayoutProps {
  route: Route;
  children: ReactNode;
}

function NavButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof BarChart3;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
        active ? "bg-teal/15 text-teal" : "text-slate-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

export function Layout({ route, children }: LayoutProps) {
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-white/10 bg-midnight/95 p-5 backdrop-blur-xl lg:block">
        <button type="button" onClick={() => navigateTo("/")} className="flex items-center gap-3 text-left">
          <div className="rounded-lg border border-teal/25 bg-teal/10 p-2 text-teal">
            <Radar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">ESG Momentum Radar</p>
            <p className="text-xs text-slate-400">Evidence signal dashboard</p>
          </div>
        </button>

        <nav className="mt-8 space-y-2">
          <NavButton active={route.name === "dashboard"} icon={BarChart3} label="Dashboard" onClick={() => navigateTo("/")} />
          <NavButton active={route.name === "evidence"} icon={Database} label="Evidence Explorer" onClick={() => navigateTo("/evidence")} />
          <NavButton active={route.name === "company"} icon={Building2} label="Company Detail" onClick={() => navigateTo("/")} />
        </nav>

        <div className="absolute bottom-5 left-5 right-5 rounded-lg border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
          Prototype ESG intelligence signal for research screening only; not investment advice.
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-midnight/75 px-4 py-3 backdrop-blur-xl sm:px-6 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => navigateTo("/")} className="flex items-center gap-2 text-sm font-semibold text-white">
              <Radar className="h-5 w-5 text-teal" />
              ESG Momentum Radar
            </button>
            <button type="button" onClick={() => navigateTo("/evidence")} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200">
              Evidence
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-7">{children}</main>
      </div>
    </div>
  );
}
