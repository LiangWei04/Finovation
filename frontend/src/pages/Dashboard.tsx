import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Loader2, Search } from "lucide-react";
import { AppSidebar } from "../components/AppSidebar";
import { ComparePanel } from "../components/ComparePanel";
import { LiveTicker } from "../components/LiveTicker";
import { MethodologyDrawer } from "../components/MethodologyDrawer";
import { WatchlistHeart } from "../components/WatchlistHeart";
import { confidenceTone } from "../lib/research";
import { categoryStyles, classificationThresholds, classColor, classifyCompany, classStyles, type CompanyClass } from "../lib/analytics";
import { loadDashboardData } from "../lib/data";
import { formatMomentum, formatNumber } from "../lib/format";
import { navigateTo } from "../routes/router";
import type { CompanyComparisonRow, DashboardCompany, DataQualitySummary, LiveSignal, ResearchReviewItem } from "../types/esg";

type SortKey = "rank" | "name" | "sector" | "esgScore" | "momentum";
type SortDirection = "asc" | "desc";

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

function sortCompanies(companies: DashboardCompany[], sort: SortState) {
  return companies.slice().sort((a, b) => {
    const multiplier = sort.direction === "asc" ? 1 : -1;
    if (sort.key === "name" || sort.key === "sector") {
      return a[sort.key].localeCompare(b[sort.key]) * multiplier;
    }
    return (a[sort.key] - b[sort.key]) * multiplier;
  });
}

export function Dashboard() {
  const [companies, setCompanies] = useState<DashboardCompany[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [liveSignals, setLiveSignals] = useState<LiveSignal[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQualitySummary | undefined>();
  const [reviewItems, setReviewItems] = useState<ResearchReviewItem[]>([]);
  const [comparisonRows, setComparisonRows] = useState<CompanyComparisonRow[]>([]);
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("Latest");
  const [sector, setSector] = useState("All sectors");
  const [sort, setSort] = useState<SortState>({ key: "rank", direction: "asc" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData()
      .then((data) => {
        setCompanies(data.companies);
        setPeriods(data.periods);
        setPeriod(data.periods[0] ?? "Latest");
        setSectors(data.sectors);
        setLiveSignals(data.liveSignals);
        setDataQuality(data.dataQuality);
        setReviewItems(data.reviewItems);
        setComparisonRows(data.comparisonRows);
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard data");
      })
      .finally(() => setLoading(false));
  }, []);

  const periodCompanies = useMemo(() => {
    const rows =
      period === "Latest"
        ? companies
        : companies.filter((company) => company.momentumByPeriod[period] !== undefined).map((company) => ({ ...company, momentum: company.momentumByPeriod[period] }));

    return rows
      .slice()
      .sort((a, b) => b.momentum - a.momentum)
      .map((company, index) => ({ ...company, rank: index + 1 }));
  }, [companies, period]);

  const filteredCompanies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return periodCompanies.filter((company) => {
      const matchesQuery = normalizedQuery.length === 0 || company.name.toLowerCase().includes(normalizedQuery);
      const matchesSector = sector === "All sectors" || company.sector === sector;
      return matchesQuery && matchesSector;
    });
  }, [periodCompanies, query, sector]);

  const rankedCompanies = useMemo(() => sortCompanies(filteredCompanies, sort), [filteredCompanies, sort]);
  const { minEsg, maxEsg, minMomentum, maxMomentum, esgThreshold, momentumThreshold } = classificationThresholds(periodCompanies);
  const averageEsg = periodCompanies.length ? periodCompanies.reduce((sum, company) => sum + company.esgScore, 0) / periodCompanies.length : 0;
  const averageMomentum = periodCompanies.length ? periodCompanies.reduce((sum, company) => sum + company.momentum, 0) / periodCompanies.length : 0;

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <div className="grid min-h-screen lg:grid-cols-[240px_minmax(0,1fr)]">
        <AppSidebar />

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <LiveTicker signals={liveSignals} />
          <MethodologyDrawer dataQuality={dataQuality} />

          {loading ? (
            <div className="flex min-h-80 items-center justify-center text-sm text-broadcast-muted">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading dashboard data
            </div>
          ) : error ? (
            <div className="rounded-lg border border-broadcast-red/30 bg-red-50 p-4 text-sm text-broadcast-red">{error}</div>
          ) : (
            <>
              <ReviewQueue reviewItems={reviewItems} />

              <section className="mb-8 grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
                <div className="grid gap-4">
                  <KpiCard label="Total Companies" value={companies.length.toString()} caption={`${rankedCompanies.length} visible`} />
                  <KpiCard label="Average ESG Score" value={formatNumber(averageEsg, 0)} caption="Current ESG baseline" />
                  <KpiCard label="Average Momentum" value={formatMomentum(averageMomentum)} caption="Evidence signal score" />
                </div>

                <Matrix
                  companies={rankedCompanies}
                  minEsg={minEsg}
                  maxEsg={maxEsg}
                  minMomentum={minMomentum}
                  maxMomentum={maxMomentum}
                />
              </section>

              <QuadrantGuide />

              <section className="mb-5 rounded-[18px] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]">
                <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px]">
                  <label className="flex h-10 items-center gap-3 rounded-xl border border-black/10 bg-white px-3 shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]">
                    <Search className="h-4 w-4 text-[#86868b]" />
                    <input
                      className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#6e6e73]"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search company or ticker..."
                      type="search"
                    />
                  </label>

                  <SelectControl label="Latest Quarter" value={period} onChange={setPeriod} options={periods.length ? periods : ["Latest"]} />
                  <SelectControl label="All sectors" value={sector} onChange={setSector} options={["All sectors", ...sectors]} />
                </div>
              </section>

              <CompanyTable
                companies={rankedCompanies}
                sort={sort}
                onSort={toggleSort}
                onOpenCompany={(companyId) => navigateTo(`/company/${encodeURIComponent(companyId)}`)}
                esgThreshold={esgThreshold}
                momentumThreshold={momentumThreshold}
              />

              <div className="mt-5">
                <ComparePanel rows={comparisonRows} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function ReviewQueue({ reviewItems }: { reviewItems: ResearchReviewItem[] }) {
  const highestConfidence = reviewItems.slice().sort((a, b) => b.confidence - a.confidence).slice(0, 1)[0];
  const topRisk = reviewItems.slice().sort((a, b) => b.riskScore - a.riskScore).slice(0, 1)[0];
  const bestOpportunity = reviewItems.find((item) => item.classification === "Hidden Winners" || item.classification === "Future Leaders") ?? reviewItems[0];
  const changed = reviewItems[0];
  const cards = [
    { label: "What changed since last review", item: changed, helper: changed ? changed.latestChange : "No evidence change available" },
    { label: "Highest confidence mover", item: highestConfidence, helper: highestConfidence ? `${formatNumber(highestConfidence.confidence * 100, 0)}% confidence - ${highestConfidence.latestChange}` : "No confidence data" },
    { label: "Top risk flag", item: topRisk, helper: topRisk ? `${topRisk.topRisk} - risk ${formatNumber(topRisk.riskScore, 0)}` : "No risk flag" },
    { label: "Best opportunity candidate", item: bestOpportunity, helper: bestOpportunity ? `${bestOpportunity.classification} - ${bestOpportunity.latestChange}` : "No opportunity candidate" },
  ];

  return (
    <section className="mb-5 grid gap-4 xl:grid-cols-4">
      {cards.map((card) => (
        <button
          key={card.label}
          type="button"
          className="min-h-36 rounded-[18px] bg-white p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)] transition hover:-translate-y-0.5"
          onClick={() => card.item && navigateTo(`/company/${encodeURIComponent(card.item.companyId)}`)}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#86868b]">{card.label}</p>
          <p className="mt-3 text-sm font-bold text-[#1d1d1f]">{card.item?.name ?? "No company"}</p>
          <p className="mt-1 text-xs font-semibold text-[#6e6e73]">{card.item?.sgxIdentifier ?? "No ticker"}</p>
          <p className="mt-3 text-xs leading-5 text-[#424245]">{card.helper}</p>
          {card.item ? (
            <span className="mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: confidenceTone(card.item.confidenceTier), backgroundColor: "#f8fafc" }}>
              {card.item.confidenceTier} confidence
            </span>
          ) : null}
        </button>
      ))}
    </section>
  );
}

function QuadrantGuide() {
  const items: Array<{ label: CompanyClass; action: string }> = [
    { label: "Hidden Winners", action: "Review improvement evidence and compare valuation before the market reprices it." },
    { label: "Future Leaders", action: "Compare quality, valuation, and evidence freshness to confirm durability." },
    { label: "Value Traps", action: "Investigate structural ESG risks and whether weak momentum is reversing." },
    { label: "Overrated Leaders", action: "Monitor whether current ESG score is still supported by recent evidence." },
  ];

  return (
    <section className="mb-5 grid gap-3 rounded-[18px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)] xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl bg-[#f8fafc] p-3">
          <p className="text-sm font-bold" style={{ color: classColor(item.label) }}>
            {item.label}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#6e6e73]">{item.action}</p>
        </div>
      ))}
    </section>
  );
}

function SelectControl({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        className="h-10 w-full appearance-none rounded-xl border border-black/10 bg-white px-3 pr-9 text-[13px] font-medium text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)] outline-none focus:border-[#0071e3]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === value ? label : option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-5 w-5 text-[#1d1d1f]" />
    </label>
  );
}

function KpiCard({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <article className="min-h-24 rounded-[18px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)] transition hover:-translate-y-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#86868b]">{label}</p>
      <p className="mt-2 bg-gradient-to-r from-[#00a888] to-[#0071e3] bg-clip-text text-2xl font-bold leading-8 tracking-[-0.03em] text-transparent">{value}</p>
      <p className="mt-1 text-[11.5px] leading-4 text-[#86868b]">{caption}</p>
    </article>
  );
}

function Matrix({
  companies,
  minEsg,
  maxEsg,
  minMomentum,
  maxMomentum,
}: {
  companies: DashboardCompany[];
  minEsg: number;
  maxEsg: number;
  minMomentum: number;
  maxMomentum: number;
}) {
  const esgRange = Math.max(1, maxEsg - minEsg);
  const momentumRange = Math.max(1, maxMomentum - minMomentum);
  const esgThreshold = (minEsg + maxEsg) / 2;
  const momentumThreshold = (minMomentum + maxMomentum) / 2;
  const legend: CompanyClass[] = ["Hidden Winners", "Future Leaders", "Value Traps", "Overrated Leaders"];

  return (
    <section className="rounded-[18px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]">
      <div className="relative h-[320px] overflow-hidden rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-[#6e6e73]">
        <div className="absolute left-5 top-5 text-[15px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">ESG Momentum Matrix</div>
        <div className="absolute right-5 top-5 flex flex-wrap justify-end gap-x-5 gap-y-2 text-xs text-[#1d1d1f]">
          {legend.map((item) => (
            <span key={item} className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: classColor(item) }} />
              {item}
            </span>
          ))}
        </div>
        <div className="absolute bottom-5 left-0 right-0 text-center text-xs tracking-[0.08em] text-[#0071e3]">ESG Score Today</div>
        <div className="absolute left-7 top-1/2 -translate-y-1/2 -rotate-90 text-xs tracking-[0.08em] text-[#0071e3]">Momentum %</div>
        <div className="absolute bottom-12 left-12 text-xs text-[#0071e3]">{formatNumber(minEsg, 0)}</div>
        <div className="absolute bottom-12 right-7 text-xs text-[#0071e3]">{formatNumber(maxEsg, 0)}</div>
        <div className="absolute left-8 top-[62px] text-xs text-[#0071e3]">{formatMomentum(maxMomentum)}</div>
        <div className="absolute bottom-[62px] left-8 text-xs text-[#0071e3]">{formatMomentum(minMomentum)}</div>

        <div className="absolute bottom-16 left-16 right-10 top-16">
          <div className="absolute inset-0 rounded-sm bg-[linear-gradient(to_right,rgba(96,96,96,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(96,96,96,0.12)_1px,transparent_1px)] bg-[size:25%_50%]" />
          <div className="absolute bottom-0 top-0 left-1/2 w-px border-l border-dashed border-broadcast-muted/45" />
          <div className="absolute left-0 right-0 top-1/2 h-px border-t border-dashed border-broadcast-muted/45" />
          <div className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-xs font-bold text-teal-700 shadow-header">Hidden Winners</div>
          <div className="absolute right-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-xs font-bold text-blue-700 shadow-header">Future Leaders</div>
          <div className="absolute bottom-3 left-3 rounded-full bg-white/85 px-2.5 py-1 text-xs font-bold text-amber-700 shadow-header">Value Traps</div>
          <div className="absolute bottom-3 right-3 rounded-full bg-white/85 px-2.5 py-1 text-xs font-bold text-red-700 shadow-header">Overrated Leaders</div>
          {companies.map((company) => {
            const x = ((company.esgScore - minEsg) / esgRange) * 100;
            const y = 100 - ((company.momentum - minMomentum) / momentumRange) * 100;
            const classification = classifyCompany(company, esgThreshold, momentumThreshold);
            return (
              <span
                key={company.companyId}
                className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white/10 transition hover:scale-125"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  backgroundColor: classColor(classification),
                  boxShadow: `0 0 18px ${classColor(classification)}66`,
                }}
                title={`${company.name}: ${classification}, ESG ${company.esgScore}, momentum ${formatMomentum(company.momentum)}`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CompanyTable({
  companies,
  sort,
  onSort,
  onOpenCompany,
  esgThreshold,
  momentumThreshold,
}: {
  companies: DashboardCompany[];
  sort: SortState;
  onSort: (key: SortKey) => void;
  onOpenCompany: (companyId: string) => void;
  esgThreshold: number;
  momentumThreshold: number;
}) {
  return (
    <section className="overflow-hidden rounded-[18px] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] border-separate border-spacing-y-2 px-3 pb-3 text-left">
          <thead>
            <tr>
              <th className="w-24 px-4 py-4 text-sm font-bold text-broadcast-text">Rank</th>
              <SortableHeader label="Company name" sortKey="name" activeSort={sort} onSort={onSort} />
              <SortableHeader label="Sector" sortKey="sector" activeSort={sort} onSort={onSort} className="w-56" />
              <SortableHeader label="ESG" sortKey="esgScore" activeSort={sort} onSort={onSort} className="w-28" />
              <SortableHeader label="Momentum" sortKey="momentum" activeSort={sort} onSort={onSort} className="w-36" />
            </tr>
          </thead>
          <tbody>
            {companies.length ? (
              companies.map((company) => (
                <CompanyRow
                  key={company.companyId}
                  company={company}
                  onOpenCompany={onOpenCompany}
                  esgThreshold={esgThreshold}
                  momentumThreshold={momentumThreshold}
                />
              ))
            ) : (
              <tr>
                <td className="px-4 py-10 text-center text-sm text-broadcast-muted" colSpan={5}>
                  No companies match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CompanyRow({
  company,
  onOpenCompany,
  esgThreshold,
  momentumThreshold,
}: {
  company: DashboardCompany;
  onOpenCompany: (companyId: string) => void;
  esgThreshold: number;
  momentumThreshold: number;
}) {
  const classification = classifyCompany(company, esgThreshold, momentumThreshold);
  const progress = Math.max(8, Math.min(100, company.esgScore));

  return (
    <tr
      className="group cursor-pointer"
      role="button"
      tabIndex={0}
      title={`Open ${company.name} analysis`}
      onClick={() => onOpenCompany(company.companyId)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenCompany(company.companyId);
        }
      }}
    >
      <td className="rounded-l-2xl border-y border-l border-black/5 bg-white px-4 py-4 text-sm font-bold text-[#0071e3] shadow-[0_1px_3px_rgba(0,0,0,.035)] transition group-hover:bg-[#f5f5f7]">
        #{String(company.rank).padStart(2, "0")}
      </td>
      <td className="border-y border-black/5 bg-white px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,.035)] transition group-hover:bg-[#f5f5f7]">
        <div className="flex items-center gap-3">
          <WatchlistHeart companyId={company.companyId} companyName={company.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-5 text-broadcast-text">{company.name}</p>
            <p className="text-xs leading-4 text-broadcast-muted">{company.sgxIdentifier}</p>
          </div>
        </div>
      </td>
      <td className="border-y border-black/5 bg-white px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,.035)] transition group-hover:bg-[#f5f5f7]">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-medium text-[#1d1d1f]">{company.sector}</span>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${categoryStyles(company.dominantCategory)}`}>{company.dominantCategory}</span>
        </div>
      </td>
      <td className="border-y border-black/5 bg-white px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,.035)] transition group-hover:bg-[#f5f5f7]">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-20 rounded-full bg-[#f5f5f7]">
            <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: classColor(classification) }} />
          </div>
          <span className="text-sm font-bold">{formatNumber(company.esgScore, 1)}</span>
        </div>
      </td>
      <td className="rounded-r-2xl border-y border-r border-black/5 bg-white px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,.035)] transition group-hover:bg-[#f5f5f7]">
        <p className="text-sm font-bold" style={{ color: classColor(classification) }}>
          {formatMomentum(company.momentum)}
        </p>
        <p className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${classStyles(classification)}`}>{classification}</p>
        <p className="mt-1 text-[11px] leading-4 text-[#6e6e73]">
          Why rank #{company.rank}: {formatNumber(company.confidence * 100, 0)}% confidence, {company.signalCount} signals, latest period {company.latestPeriod}
        </p>
      </td>
    </tr>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeSort,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  activeSort: SortState;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = activeSort.key === sortKey;
  return (
    <th className={`px-4 py-4 ${className}`}>
      <button type="button" className="inline-flex items-center gap-2 text-sm font-bold text-broadcast-text" onClick={() => onSort(sortKey)}>
        <span>{label}</span>
        <span className="flex flex-col text-broadcast-text">
          <ArrowUp className={`h-3.5 w-3.5 ${active && activeSort.direction === "asc" ? "text-broadcast-red" : ""}`} />
          <ArrowDown className={`-mt-1 h-3.5 w-3.5 ${active && activeSort.direction === "desc" ? "text-broadcast-red" : ""}`} />
        </span>
      </button>
    </th>
  );
}
