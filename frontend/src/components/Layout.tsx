import { useState, type ReactNode } from "react";
import { ChipBar } from "./ChipBar";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-white text-broadcast-text">
      <TopNav onMenuClick={() => setCollapsed((value) => !value)} />
      <Sidebar collapsed={collapsed} />
      <div className={`transition-[padding-left] duration-200 ${collapsed ? "lg:pl-[72px]" : "lg:pl-60"}`}>
        <ChipBar />
        <main className="mx-auto w-full max-w-[2200px] px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
