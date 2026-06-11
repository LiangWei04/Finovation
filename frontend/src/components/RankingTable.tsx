import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { categoryScore } from "../lib/analytics";
import { formatNumber, formatPercent } from "../lib/format";
import { navigateTo } from "../routes/router";
import type { CompanyAnalytics } from "../types/esg";
import { FilterBar } from "./FilterBar";
import { MomentumBadge } from "./MomentumBadge";

type SortKey = "score" | "signalCount" | "confidence";

interface RankingTableProps {
  analytics: CompanyAnalytics[];
}

export function RankingTable({ analytics }: RankingTableProps) {
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const sectors = useMemo(() => Array.from(new Set(analytics.map((item) => item.company.sector))).sort(), [analytics]);

  const rows = useMemo(() => {
    const filtered = analytics.filter((item) => {
      const matchesSearch = item.company.name.toLowerCase().includes(search.toLowerCase().trim());
      const matchesSector = sector === "all" || item.company.sector === sector;
      return matchesSearch && matchesSector;
    });

    const multiplier = direction === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      const aDataset = a.dataset;
      const bDataset = b.dataset;
      const values: Record<SortKey, [number, number]> = {
        score: [aDataset?.total_signal_score ?? 0, bDataset?.total_signal_score ?? 0],
        signalCount: [aDataset?.total_signal_count ?? 0, bDataset?.total_signal_count ?? 0],
        confidence: [aDataset?.average_confidence ?? 0, bDataset?.average_confidence ?? 0],
      };
      const [aValue, bValue] = values[sortKey];
      return (aValue - bValue) * multiplier;
    });
  }, [analytics, direction, search, sector, sortKey]);

  return (
    <section className="glass-panel rounded-lg p-4">
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">ESG Momentum Ranking</h2>
          <p className="mt-1 text-sm text-slate-400">Click any company row to open the detail view.</p>
        </div>
      </div>

      <FilterBar>
        <label className="relative xl:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input className="control w-full pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company" />
        </label>
        <select className="control" value={sector} onChange={(event) => setSector(event.target.value)}>
          <option value="all">All sectors</option>
          {sectors.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select className="control" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
          <option value="score">Sort by score</option>
          <option value="signalCount">Sort by signal count</option>
          <option value="confidence">Sort by confidence</option>
        </select>
        <button
          type="button"
          onClick={() => setDirection((value) => (value === "asc" ? "desc" : "asc"))}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-ink/95 px-3 text-sm text-slate-200 transition hover:border-teal/40"
        >
          {direction === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          {direction === "asc" ? "Ascending" : "Descending"}
        </button>
      </FilterBar>

      <div className="mt-4 space-y-2">
        <div className="hidden grid-cols-[2.4rem_minmax(190px,1.6fr)_minmax(120px,0.9fr)_78px_58px] items-center gap-3 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 xl:grid">
          <span>Rank</span>
          <span>Company</span>
          <span>Sector</span>
          <span className="text-right">Score</span>
          <span className="text-right">Signals</span>
        </div>

        {rows.map((item, index) => {
          return (
            <button
              key={item.company.company_id}
              type="button"
              onClick={() => navigateTo(`/company/${item.company.company_id}`)}
              className="grid w-full gap-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] p-3 text-left text-sm text-slate-300 transition hover:border-teal/35 hover:bg-white/[0.06] xl:grid-cols-[2.4rem_minmax(190px,1.6fr)_minmax(120px,0.9fr)_78px_58px] xl:items-center xl:gap-3 xl:py-2"
            >
              <div className="flex items-center justify-between gap-3 xl:block">
                <span className="text-xs uppercase tracking-[0.1em] text-slate-500 xl:hidden">Rank</span>
                <span className="font-semibold text-slate-400">{index + 1}</span>
              </div>

              <div className="min-w-0">
                <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-slate-500 xl:hidden">Company</span>
                <span className="block truncate font-semibold text-white">{item.company.name}</span>
                <span className="mt-1 hidden items-center gap-2 xl:flex">
                  <span className="text-xs text-slate-500">{item.company.sgx_identifier}</span>
                  <MomentumBadge classification={item.classification} compact />
                </span>
              </div>

              <div className="min-w-0">
                <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-slate-500 xl:hidden">Sector</span>
                <span className="block truncate text-slate-300">{item.company.sector}</span>
              </div>

              <div className="xl:hidden">
                <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-slate-500 xl:hidden">SGX</span>
                <span className="text-slate-300">{item.company.sgx_identifier}</span>
              </div>

              <div className="xl:text-right">
                <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-slate-500 xl:hidden">Momentum Score</span>
                <span className="font-semibold text-teal">{formatNumber(item.dataset?.total_signal_score)}</span>
              </div>

              <div className="xl:text-right">
                <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-slate-500 xl:hidden">Signals</span>
                <span>{item.dataset?.total_signal_count ?? 0}</span>
              </div>

              <div className="xl:hidden">
                <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-slate-500 xl:hidden">Environmental / Social / Governance</span>
                <span className="whitespace-nowrap text-xs text-slate-300">
                  <span className="text-environmental">{formatNumber(categoryScore(item.dataset, "Environmental"))}</span>
                  <span className="text-slate-600"> / </span>
                  <span className="text-social">{formatNumber(categoryScore(item.dataset, "Social"))}</span>
                  <span className="text-slate-600"> / </span>
                  <span className="text-governance">{formatNumber(categoryScore(item.dataset, "Governance"))}</span>
                </span>
              </div>

              <div className="xl:hidden">
                <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-slate-500 xl:hidden">Average Confidence</span>
                <span>{formatPercent(item.dataset?.average_confidence)}</span>
              </div>

              <div className="min-w-0 xl:hidden">
                <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-slate-500 xl:hidden">Classification</span>
                <MomentumBadge classification={item.classification} />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
