import type { EsgCategory, SignalDirection, SourcePlatform } from "../types/esg";

export function formatNumber(value: number | undefined, digits = 2) {
  if (value === undefined || Number.isNaN(value)) return "N/A";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatInteger(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return "N/A";
  return Math.round(value).toLocaleString();
}

export function formatPercent(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return "N/A";
  return `${Math.round(value * 100)}%`;
}

export function formatDate(value: string | undefined) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function platformLabel(platform: SourcePlatform | string | undefined) {
  if (!platform) return "Unknown source";
  return platform
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

export function directionClasses(direction: SignalDirection) {
  if (direction === "positive") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  if (direction === "negative") return "border-rose-400/25 bg-rose-400/10 text-rose-200";
  return "border-amber-400/25 bg-amber-400/10 text-amber-200";
}

export function categoryColor(category: EsgCategory) {
  if (category === "Environmental") return "#34d399";
  if (category === "Social") return "#60a5fa";
  return "#a78bfa";
}

export function categoryTextClass(category: EsgCategory) {
  if (category === "Environmental") return "text-environmental";
  if (category === "Social") return "text-social";
  return "text-governance";
}
