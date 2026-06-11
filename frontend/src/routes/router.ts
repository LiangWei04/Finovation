import { useEffect, useMemo, useState } from "react";

export type Route =
  | { name: "dashboard" }
  | { name: "evidence" }
  | { name: "company"; companyId: string };

function parsePath(pathname: string): Route {
  const companyMatch = pathname.match(/^\/company\/([^/]+)/);
  if (companyMatch) return { name: "company", companyId: decodeURIComponent(companyMatch[1]) };
  if (pathname === "/evidence") return { name: "evidence" };
  return { name: "dashboard" };
}

export function navigateTo(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useRoute() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return useMemo(() => parsePath(path), [path]);
}
