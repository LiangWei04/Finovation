import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { isWatched, subscribeWatchlist, toggleWatchlist } from "../lib/watchlist";

export function WatchlistHeart({
  companyId,
  companyName,
  className = "",
  size = "md",
}: {
  companyId: string;
  companyName?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const [watched, setWatched] = useState(() => isWatched(companyId));
  const dimensions = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  useEffect(() => {
    setWatched(isWatched(companyId));
    return subscribeWatchlist(() => setWatched(isWatched(companyId)));
  }, [companyId]);

  return (
    <button
      type="button"
      className={`${dimensions} inline-flex shrink-0 items-center justify-center rounded-full border transition ${
        watched
          ? "border-[#ff3b30]/20 bg-[#ff3b30]/10 text-[#ff3b30] shadow-[0_6px_16px_rgba(255,59,48,0.12)]"
          : "border-black/10 bg-white text-[#86868b] hover:border-[#ff3b30]/25 hover:bg-[#ff3b30]/5 hover:text-[#ff3b30]"
      } ${className}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setWatched(toggleWatchlist(companyId));
      }}
      aria-label={`${watched ? "Remove" : "Add"} ${companyName ?? "company"} ${watched ? "from" : "to"} watchlist`}
      title={`${watched ? "Remove from" : "Add to"} watchlist`}
    >
      <Heart className={iconSize} fill={watched ? "currentColor" : "none"} />
    </button>
  );
}
