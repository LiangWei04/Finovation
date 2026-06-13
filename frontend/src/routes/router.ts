import { useEffect, useState } from "react";

export type AppRoute =
  | { name: "dashboard" }
  | { name: "company"; companyId: string }
  | { name: "risk-radar" }
  | { name: "investment" }
  | { name: "watchlist" };

export function parseRoute(pathname = window.location.pathname): AppRoute {
  if (pathname === "/watchlist") return { name: "watchlist" };
  if (pathname === "/investment") return { name: "investment" };
  if (pathname === "/risk-radar") return { name: "risk-radar" };
  const companyMatch = pathname.match(/^\/company\/([^/]+)$/);
  if (companyMatch) return { name: "company", companyId: decodeURIComponent(companyMatch[1]) };
  return { name: "dashboard" };
}

export function navigateTo(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useRoute() {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute());

  useEffect(() => {
    const syncRoute = () => setRoute(parseRoute());
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  return route;
}
