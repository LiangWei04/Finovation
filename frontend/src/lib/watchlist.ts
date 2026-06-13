export const watchlistStorageKey = "esg_watchlist_company_ids_v1";
export const watchlistChangedEvent = "esg-watchlist-changed";

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

export function readWatchlist() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(watchlistStorageKey) ?? "[]");
    return Array.isArray(parsed) ? uniqueIds(parsed.filter((item): item is string => typeof item === "string")) : [];
  } catch {
    return [];
  }
}

export function writeWatchlist(companyIds: string[]) {
  if (typeof window === "undefined") return;
  const next = uniqueIds(companyIds);
  window.localStorage.setItem(watchlistStorageKey, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(watchlistChangedEvent, { detail: { companyIds: next } }));
}

export function isWatched(companyId: string) {
  return readWatchlist().includes(companyId);
}

export function addToWatchlist(companyId: string) {
  writeWatchlist([...readWatchlist(), companyId]);
}

export function removeFromWatchlist(companyId: string) {
  writeWatchlist(readWatchlist().filter((id) => id !== companyId));
}

export function toggleWatchlist(companyId: string) {
  const current = readWatchlist();
  if (current.includes(companyId)) {
    writeWatchlist(current.filter((id) => id !== companyId));
    return false;
  }
  writeWatchlist([...current, companyId]);
  return true;
}

export function subscribeWatchlist(listener: (companyIds: string[]) => void) {
  if (typeof window === "undefined") return () => undefined;

  const handleChange = (event: Event) => {
    const detail = event instanceof CustomEvent ? (event.detail as { companyIds?: string[] } | undefined) : undefined;
    listener(detail?.companyIds ?? readWatchlist());
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key === watchlistStorageKey) listener(readWatchlist());
  };

  window.addEventListener(watchlistChangedEvent, handleChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(watchlistChangedEvent, handleChange);
    window.removeEventListener("storage", handleStorage);
  };
}
