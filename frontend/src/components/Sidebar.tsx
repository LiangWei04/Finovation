import { sidebarItems } from "../data/navigation";

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  return (
    <aside
      className={`fixed bottom-0 left-0 top-14 z-30 hidden overflow-y-auto border-r border-broadcast-border bg-white px-3 py-3 transition-[width] duration-200 lg:block ${
        collapsed ? "w-[72px]" : "w-60"
      }`}
    >
      <nav className="space-y-1">
        {sidebarItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`rb-sidebar-item ${"active" in item && item.active ? "rb-sidebar-item-active" : ""} ${collapsed ? "justify-center gap-0 px-0" : ""}`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
          </button>
        ))}
      </nav>
    </aside>
  );
}
