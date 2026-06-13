import {
  BarChart3,
  Clock3,
  Compass,
  Flame,
  Home,
  Library,
  ListVideo,
  PlaySquare,
  Search,
  ShieldCheck,
} from "lucide-react";

export const sidebarItems = [
  { label: "Overview", icon: Home, active: true },
  { label: "ESG Analysis", icon: BarChart3 },
  { label: "Evidence", icon: Search },
  { label: "Risk Radar", icon: ShieldCheck },
  { label: "Explore", icon: Compass },
  { label: "Trending", icon: Flame },
  { label: "Watch Later", icon: Clock3 },
  { label: "Playlists", icon: ListVideo },
  { label: "Library", icon: Library },
  { label: "Reports", icon: PlaySquare },
] as const;

export const chips = ["All", "Banks", "Real Estate", "Aviation", "ESG Signals", "Improving", "High Confidence", "Recent", "Reports"] as const;
