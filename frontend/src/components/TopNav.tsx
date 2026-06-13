import { Bell, Menu, Mic, Plus, Search, UserCircle } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

interface TopNavProps {
  onMenuClick: () => void;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 bg-white px-3 shadow-header sm:px-4">
      <button type="button" className="rb-icon-button" onClick={onMenuClick} aria-label="Toggle navigation">
        <Menu className="h-6 w-6" />
      </button>

      <BrandLogo />

      <form className="mx-auto hidden w-full max-w-[720px] items-center md:flex" role="search">
        <label className="sr-only" htmlFor="app-search">
          Search
        </label>
        <input
          id="app-search"
          className="h-11 min-w-0 flex-1 border border-broadcast-border px-4 text-sm text-broadcast-text outline-none focus:border-broadcast-text"
          placeholder="Search companies, evidence, reports"
          type="search"
        />
        <button
          type="submit"
          className="-ml-px flex h-11 w-16 items-center justify-center rounded-r-full border border-broadcast-border bg-[#f8f8f8] text-broadcast-muted transition hover:bg-broadcast-surface"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
      </form>

      <button type="button" className="rb-icon-button hidden md:flex" aria-label="Voice search">
        <Mic className="h-5 w-5" />
      </button>
      <button type="button" className="rb-icon-button md:hidden" aria-label="Search">
        <Search className="h-5 w-5" />
      </button>
      <button type="button" className="rb-icon-button" aria-label="Create">
        <Plus className="h-5 w-5" />
      </button>
      <button type="button" className="rb-icon-button" aria-label="Notifications">
        <Bell className="h-5 w-5" />
      </button>
      <button type="button" className="rb-icon-button text-broadcast-blue" aria-label="Account">
        <UserCircle className="h-7 w-7" />
      </button>
    </header>
  );
}
