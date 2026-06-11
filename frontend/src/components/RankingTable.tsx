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
    <section className="glass-panel rounded-xl p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">ESG Momentum Ranking</h2>
          <p className="mt-1 text-sm text-slate-400">Sorted by evidence signal score, signal volume, or confidence.</p>
        </div>
        <button
          type="button"
          onClick={() => setDirection((value) => (value === "asc" ? "desc" : "asc"))}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-slate-200 transition hover:border-teal/40"
        >
          {direction === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          {direction === "asc" ? "Ascending" : "Descending"}
        </button>
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
      </FilterBar>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-slate-500">
            <tr>
              <th className="py-3 pr-3">Rank</th>
              <th className="px-3 py-3">Company</th>
              <th className="px-3 py-3">Sector</th>
              <th className="px-3 py-3">SGX</th>
              <th className="px-3 py-3 text-right">Momentum Score</th>
              <th className="px-3 py-3 text-right">Signals</th>
              <th className="px-3 py-3 text-right">Environmental</th>
              <th className="px-3 py-3 text-right">Social</th>
              <th className="px-3 py-3 text-right">Governance</th>
              <th className="px-3 py-3 text-right">Avg Confidence</th>
              <th className="py-3 pl-3">Classification</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, index) => (
              <tr
                key={item.company.company_id}
                onClick={() => navigateTo(`/company/${item.company.company_id}`)}
                className="cursor-pointer border-b border-white/5 text-slate-300 transition hover:bg-white/[0.04]"
              >
                <td className="py-3 pr-3 font-semibold text-slate-500">{index + 1}</td>
                <td className="px-3 py-3 font-semibold text-white">{item.company.name}</td>
                <td className="px-3 py-3">{item.company.sector}</td>
                <td className="px-3 py-3">{item.company.sgx_identifier}</td>
                <td className="px-3 py-3 text-right font-semibold text-teal">{formatNumber(item.dataset?.total_signal_score)}</td>
                <td className="px-3 py-3 text-right">{item.dataset?.total_signal_count ?? 0}</td>
                <td className="px-3 py-3 text-right">{formatNumber(categoryScore(item.dataset, "Environmental"))}</td>
                <td className="px-3 py-3 text-right">{formatNumber(categoryScore(item.dataset, "Social"))}</td>
                <td className="px-3 py-3 text-right">{formatNumber(categoryScore(item.dataset, "Governance"))}</td>
                <td className="px-3 py-3 text-right">{formatPercent(item.dataset?.average_confidence)}</td>
                <td className="py-3 pl-3">
                  <MomentumBadge classification={item.classification} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
