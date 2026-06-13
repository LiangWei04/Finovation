import { BarChart3, BriefcaseBusiness, Heart, Radar } from "lucide-react";
import { navigateTo, useRoute, type AppRoute } from "../routes/router";

type SidebarItem = {
  label: string;
  icon: typeof BarChart3;
  path: string;
  routeNames: AppRoute["name"][];
};

const sidebarItems: SidebarItem[] = [
  { label: "ESG Analysis", icon: BarChart3, path: "/", routeNames: ["dashboard", "company"] },
  { label: "Investment", icon: BriefcaseBusiness, path: "/investment", routeNames: ["investment"] },
  { label: "Watchlist", icon: Heart, path: "/watchlist", routeNames: ["watchlist"] },
  { label: "Risk Radar", icon: Radar, path: "/risk-radar", routeNames: ["risk-radar"] },
];

export function AppSidebar() {
  const route = useRoute();

  return (
    <aside className="border-b border-black/10 bg-white/75 backdrop-blur-xl lg:border-b-0 lg:border-r">
      <div className="flex h-24 items-center gap-4 border-b border-black/10 px-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#00a888] to-[#0071e3] text-sm font-bold text-white shadow-[0_8px_24px_rgba(0,113,227,0.2)]">
          ME
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-5 tracking-[-0.01em]">ESG Momentum</p>
          <p className="text-xs leading-5 text-[#86868b]">Engine dashboard</p>
        </div>
      </div>

      <nav className="grid gap-1 px-3 py-3 sm:grid-cols-4 lg:block">
        {sidebarItems.map((item) => {
          const active = item.routeNames.includes(route.name);
          const disabled = item.routeNames.length === 0;
          return (
            <button
              key={item.label}
              type="button"
              className={`flex h-11 w-full items-center gap-4 rounded-full px-3 text-left text-sm transition ${
                active ? "bg-white font-semibold shadow-[0_1px_4px_rgba(0,0,0,0.12)]" : "font-medium text-[#6e6e73] hover:bg-black/5"
              } ${disabled ? "cursor-default opacity-70" : ""}`}
              onClick={() => {
                if (!disabled) navigateTo(item.path);
              }}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
