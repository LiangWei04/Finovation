import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, Loader2, Search, ShieldAlert } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { AppSidebar } from "../components/AppSidebar";
import { ComparePanel } from "../components/ComparePanel";
import { LiveTicker } from "../components/LiveTicker";
import { MethodologyDrawer } from "../components/MethodologyDrawer";
import { WatchlistHeart } from "../components/WatchlistHeart";
import { categoryColor, classColor, classStyles, type CompanyClass } from "../lib/analytics";
import { loadRiskRadarData } from "../lib/data";
import { formatMomentum, formatNumber } from "../lib/format";
import { navigateTo } from "../routes/router";
import type { CompanyComparisonRow, DataQualitySummary, EsgCategory, LiveSignal, RiskAlert, RiskRadarCompany, RiskSeverity } from "../types/esg";

type AlertCategory = RiskAlert["category"];
type QuickFilter = "All" | "High severity" | "Governance" | "Greenwash proxy" | "Momentum reversal";
type SortKey = "riskScore" | "name" | "sector" | "severity" | "negativeSignalCount" | "confidence";
type SortDirection = "asc" | "desc";

const severities: Array<RiskSeverity | "All severities"> = ["All severities", "High", "Medium", "Low"];
const categories: Array<AlertCategory | "All categories"> = ["All categories", "Environmental", "Social", "Governance", "Momentum", "Greenwash Proxy", "Confidence"];
const quickFilters: QuickFilter[] = ["All", "High severity", "Governance", "Greenwash proxy", "Momentum reversal"];

export function RiskRadar() {
  const [companies, setCompanies] = useState<RiskRadarCompany[]>([]);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [liveSignals, setLiveSignals] = useState<LiveSignal[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQualitySummary | undefined>();
  const [comparisonRows, setComparisonRows] = useState<CompanyComparisonRow[]>([]);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<RiskSeverity | "All severities">("All severities");
  const [category, setCategory] = useState<AlertCategory | "All categories">("All categories");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("All");
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: "riskScore", direction: "desc" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRiskRadarData()
      .then((data) => {
        setCompanies(data.companies);
        setAlerts(data.alerts);
        setLiveSignals(data.liveSignals);
        setDataQuality(data.dataQuality);
        setComparisonRows(data.comparisonRows);
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load risk radar data");
      })
      .finally(() => setLoading(false));
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredAlerts = useMemo(
    () =>
      alerts.filter((alert) => {
        const matchesQuery =
          !normalizedQuery ||
          alert.companyName.toLowerCase().includes(normalizedQuery) ||
          alert.sgxIdentifier.toLowerCase().includes(normalizedQuery) ||
          alert.type.toLowerCase().includes(normalizedQuery);
        const matchesSeverity = severity === "All severities" || alert.severity === severity;
        const matchesCategory = category === "All categories" || alert.category === category;
        const matchesQuick =
          quickFilter === "All" ||
          (quickFilter === "High severity" && alert.severity === "High") ||
          (quickFilter === "Governance" && alert.category === "Governance") ||
          (quickFilter === "Greenwash proxy" && alert.type === "Greenwash proxy") ||
          (quickFilter === "Momentum reversal" && alert.type === "Momentum reversal");
        return matchesQuery && matchesSeverity && matchesCategory && matchesQuick;
      }),
    [alerts, category, normalizedQuery, quickFilter, severity],
  );

  const filteredCompanyIds = new Set(filteredAlerts.map((alert) => alert.companyId));
  const visibleCompanies = companies.filter((company) => !normalizedQuery || filteredCompanyIds.has(company.companyId) || company.name.toLowerCase().includes(normalizedQuery));
  const highAlerts = alerts.filter((alert) => alert.severity === "High");
  const governanceAlerts = alerts.filter((alert) => alert.category === "Governance");
  const companiesFlagged = new Set(alerts.map((alert) => alert.companyId)).size;
  const worstCompany = companies[0];
  const pillarRows = buildPillarRows(companies);
  const leaderboardRows = sortCompanies(visibleCompanies, sort).slice(0, 12);

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
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
              Loading risk radar
            </div>
          ) : error ? (
            <div className="rounded-[18px] border border-broadcast-red/30 bg-red-50 p-4 text-sm text-broadcast-red">{error}</div>
          ) : (
            <>
              <section className="mb-5 rounded-[18px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">Universe monitor</p>
                    <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#1d1d1f] sm:text-4xl">Risk Radar</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6e6e73]">
                      Cross-company ESG risk surveillance for evidence spikes, governance flags, momentum deterioration, and greenwash proxy signals.
                      Review tool only; not investment advice.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-[#1d1d1f] px-4 py-3 text-white">
                    <ShieldAlert className="h-5 w-5 text-[#ff453a]" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#a1a1a6]">Risk language</p>
                      <p className="text-xs font-semibold">Review, investigate, watch</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <KpiCard label="Active Alerts" value={alerts.length.toString()} caption={`${filteredAlerts.length} visible`} tone="#1d1d1f" />
                <KpiCard label="High Severity" value={highAlerts.length.toString()} caption="Priority review flags" tone="#ff3b30" />
                <KpiCard label="Companies Flagged" value={companiesFlagged.toString()} caption={`of ${companies.length} companies`} tone="#f59e0b" />
                <KpiCard label="Worst Risk Score" value={worstCompany ? formatNumber(worstCompany.riskScore, 0) : "0"} caption={worstCompany?.sgxIdentifier ?? "No companies"} tone="#ff3b30" />
                <KpiCard label="Governance Flags" value={governanceAlerts.length.toString()} caption="High-sensitivity pillar" tone={categoryColor("Governance")} />
              </section>

              <section className="mb-5 rounded-[18px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]">
                <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_180px_190px]">
                  <label className="flex h-11 items-center gap-3 rounded-xl border border-black/10 bg-[#f8fafc] px-3">
                    <Search className="h-4 w-4 text-[#86868b]" />
                    <input
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#86868b]"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search company, ticker, or alert..."
                      type="search"
                    />
                  </label>
                  <SelectControl value={severity} options={severities} onChange={(value) => setSeverity(value as RiskSeverity | "All severities")} label="Severity" />
                  <SelectControl value={category} options={categories} onChange={(value) => setCategory(value as AlertCategory | "All categories")} label="Category" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {quickFilters.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                        quickFilter === filter ? "bg-[#1d1d1f] text-white shadow-[0_6px_18px_rgba(0,0,0,.16)]" : "bg-[#f5f5f7] text-[#424245] hover:bg-black/10"
                      }`}
                      onClick={() => setQuickFilter(filter)}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </section>

              <section className="mb-5 grid gap-5 xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.15fr)]">
                <Panel title="Alert Feed" caption="Ranked by severity, risk score, and evidence pressure">
                  <div className="grid max-h-[560px] gap-3 overflow-y-auto pr-1">
                    {filteredAlerts.length ? (
                      filteredAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
                    ) : (
                      <div className="rounded-2xl border border-dashed border-black/15 bg-[#f8fafc] p-8 text-center text-sm text-[#6e6e73]">
                        No alerts match the current filters.
                      </div>
                    )}
                  </div>
                </Panel>

                <Panel title="Universe Risk Map" caption="X-axis shows greenwash/conflict proxy; Y-axis shows ESG momentum. Bubble size reflects signal depth.">
                  <div className="h-[520px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 18, bottom: 20, left: 4 }}>
                        <CartesianGrid stroke="#e5e5ea" strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          dataKey="greenwashProxy"
                          name="Greenwash proxy"
                          domain={[0, 100]}
                          tick={{ fill: "#6e6e73", fontSize: 11 }}
                          label={{ value: "Greenwash / conflict proxy", position: "insideBottom", offset: -8, fill: "#0071e3", fontSize: 12 }}
                        />
                        <YAxis
                          type="number"
                          dataKey="momentum"
                          name="Momentum"
                          tick={{ fill: "#6e6e73", fontSize: 11 }}
                          label={{ value: "ESG momentum", angle: -90, position: "insideLeft", fill: "#0071e3", fontSize: 12 }}
                        />
                        <ZAxis type="number" dataKey="signalCount" range={[60, 360]} />
                        <Tooltip content={<RiskMapTooltip />} />
                        <Scatter data={visibleCompanies}>
                          {visibleCompanies.map((company) => (
                            <Cell key={company.companyId} fill={classColor(company.classification as CompanyClass)} fillOpacity={0.72} stroke={classColor(company.classification as CompanyClass)} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#6e6e73]">
                    {(["Hidden Winners", "Future Leaders", "Value Traps", "Overrated Leaders"] as CompanyClass[]).map((classification) => (
                      <span key={classification} className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: classColor(classification) }} />
                        {classification}
                      </span>
                    ))}
                  </div>
                </Panel>
              </section>

              <section className="grid gap-5 xl:grid-cols-[minmax(320px,0.7fr)_minmax(0,1.3fr)]">
                <Panel title="Negative Evidence by ESG Pillar" caption="Aggregated risk pressure across Environmental, Social, and Governance signals">
                  <div className="h-[330px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pillarRows} margin={{ top: 10, right: 8, bottom: 0, left: -12 }}>
                        <CartesianGrid stroke="#e5e5ea" strokeDasharray="3 3" />
                        <XAxis dataKey="category" tick={{ fill: "#6e6e73", fontSize: 11 }} />
                        <YAxis tick={{ fill: "#6e6e73", fontSize: 11 }} width={34} />
                        <Tooltip formatter={(value) => formatNumber(Number(value), 2)} />
                        <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="negativeScore" name="Negative impact" fill="#ff3b30" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="governanceFlags" name="Governance flags" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>

                <Panel title="Risk Leaderboard" caption="Sortable cross-company watchlist built from evidence, momentum, confidence, and quadrant status">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-black/10 text-xs uppercase tracking-[0.08em] text-[#86868b]">
                          <SortableTh label="Company" sortKey="name" sort={sort} onSort={toggleSort} />
                          <SortableTh label="Sector" sortKey="sector" sort={sort} onSort={toggleSort} />
                          <SortableTh label="Risk" sortKey="riskScore" sort={sort} onSort={toggleSort} />
                          <SortableTh label="Severity" sortKey="severity" sort={sort} onSort={toggleSort} />
                          <SortableTh label="Negative" sortKey="negativeSignalCount" sort={sort} onSort={toggleSort} />
                          <SortableTh label="Confidence" sortKey="confidence" sort={sort} onSort={toggleSort} />
                          <th className="w-40 px-3 py-3">Quadrant</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {leaderboardRows.map((company) => (
                          <tr key={company.companyId} className="cursor-pointer transition hover:bg-[#f8fafc]" onClick={() => navigateTo(`/company/${encodeURIComponent(company.companyId)}`)}>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-3">
                                <WatchlistHeart companyId={company.companyId} companyName={company.name} size="sm" />
                                <div className="min-w-0">
                                  <div className="font-bold text-[#1d1d1f]">{company.name}</div>
                                  <div className="text-xs text-[#6e6e73]">{company.sgxIdentifier}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-[#424245]">{company.sector}</td>
                            <td className="px-3 py-3">
                              <RiskBar value={company.riskScore} />
                            </td>
                            <td className="px-3 py-3">
                              <SeverityPill severity={companySeverity(company)} />
                            </td>
                            <td className="px-3 py-3 font-semibold text-[#ff3b30]">{company.negativeSignalCount}</td>
                            <td className="px-3 py-3">{formatNumber(company.confidence * 100, 0)}%</td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex min-w-32 justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${classStyles(company.classification as CompanyClass)}`}>
                                {company.classification}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </section>

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

function KpiCard({ label, value, caption, tone }: { label: string; value: string; caption: string; tone: string }) {
  return (
    <article className="min-h-28 rounded-[18px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#86868b]">{label}</p>
      <p className="mt-2 text-2xl font-bold leading-8 tracking-[-0.03em]" style={{ color: tone }}>
        {value}
      </p>
      <p className="mt-1 text-[11.5px] leading-4 text-[#86868b]">{caption}</p>
    </article>
  );
}

function Panel({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[18px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]">
      <div className="mb-4">
        <h2 className="text-[15px] font-bold tracking-[-0.01em] text-[#1d1d1f]">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-[#6e6e73]">{caption}</p>
      </div>
      {children}
    </section>
  );
}

function SelectControl({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        className="h-11 w-full appearance-none rounded-xl border border-black/10 bg-[#f8fafc] px-3 pr-9 text-sm font-semibold text-[#1d1d1f] outline-none focus:border-[#0071e3]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-[#6e6e73]" />
    </label>
  );
}

function AlertCard({ alert }: { alert: RiskAlert }) {
  return (
    <article
      className="cursor-pointer rounded-2xl border-l-4 bg-[#f8fafc] p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_24px_rgba(0,0,0,.08)]"
      style={{ borderLeftColor: severityColor(alert.severity) }}
      onClick={() => navigateTo(`/company/${encodeURIComponent(alert.companyId)}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityPill severity={alert.severity} />
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#424245]">{alert.category}</span>
          </div>
          <h3 className="mt-3 text-sm font-bold text-[#1d1d1f]">{alert.type}</h3>
          <p className="mt-1 text-sm font-semibold text-[#424245]">
            {alert.companyName} <span className="text-xs text-[#86868b]">({alert.sgxIdentifier})</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="flex items-start justify-end gap-2">
            <WatchlistHeart companyId={alert.companyId} companyName={alert.companyName} size="sm" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#86868b]">Risk</p>
              <p className="text-lg font-bold" style={{ color: severityColor(alert.severity) }}>
                {formatNumber(alert.riskScore, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#424245]">{alert.description}</p>
      {alert.evidenceSummary ? <p className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 text-[#6e6e73]">{alert.evidenceSummary}</p> : null}
    </article>
  );
}

function RiskMapTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: RiskRadarCompany }> }) {
  if (!active || !payload?.length) return null;
  const company = payload[0].payload;
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-3 text-xs shadow-[0_8px_24px_rgba(0,0,0,.12)]">
      <p className="font-bold text-[#1d1d1f]">{company.name}</p>
      <p className="mt-1 text-[#6e6e73]">{company.sgxIdentifier} · {company.sector}</p>
      <p className="mt-2 text-[#424245]">Risk {formatNumber(company.riskScore, 0)} · Proxy {formatNumber(company.greenwashProxy, 0)}</p>
      <p className="text-[#424245]">Momentum {formatMomentum(company.momentum)} · Negative signals {company.negativeSignalCount}</p>
    </div>
  );
}

function SortableTh({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; direction: SortDirection };
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <th className="px-3 py-3">
      <button type="button" className="inline-flex items-center gap-1 font-bold" onClick={() => onSort(sortKey)}>
        {label}
        {active ? sort.direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" /> : null}
      </button>
    </th>
  );
}

function SeverityPill({ severity }: { severity: RiskSeverity }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: severityColor(severity), backgroundColor: severityBg(severity) }}>
      <AlertTriangle className="h-3.5 w-3.5" />
      {severity}
    </span>
  );
}

function RiskBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-[#e5e5ea]">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, backgroundColor: value >= 60 ? "#ff3b30" : value >= 38 ? "#f59e0b" : "#00a99d" }} />
      </div>
      <span className="text-xs font-bold text-[#1d1d1f]">{formatNumber(value, 0)}</span>
    </div>
  );
}

function buildPillarRows(companies: RiskRadarCompany[]) {
  return (["Environmental", "Social", "Governance"] as EsgCategory[]).map((category) => {
    const matching = companies.filter((company) => company.dominantCategory === category);
    return {
      category,
      negativeScore: matching.reduce((sum, company) => sum + company.negativeEvidenceScore, 0),
      governanceFlags: category === "Governance" ? companies.reduce((sum, company) => sum + company.governanceFlagCount, 0) : 0,
    };
  });
}

function sortCompanies(companies: RiskRadarCompany[], sort: { key: SortKey; direction: SortDirection }) {
  return companies.slice().sort((a, b) => {
    const multiplier = sort.direction === "asc" ? 1 : -1;
    if (sort.key === "name" || sort.key === "sector") return a[sort.key].localeCompare(b[sort.key]) * multiplier;
    if (sort.key === "severity") return (severityWeight(companySeverity(a)) - severityWeight(companySeverity(b))) * multiplier;
    return (a[sort.key] - b[sort.key]) * multiplier;
  });
}

function companySeverity(company: RiskRadarCompany): RiskSeverity {
  if (company.riskScore >= 60 || company.governanceFlagCount >= 2) return "High";
  if (company.riskScore >= 35 || company.negativeSignalCount >= 2) return "Medium";
  return "Low";
}

function severityWeight(severity: RiskSeverity) {
  if (severity === "High") return 3;
  if (severity === "Medium") return 2;
  return 1;
}

function severityColor(severity: RiskSeverity) {
  if (severity === "High") return "#ff3b30";
  if (severity === "Medium") return "#f59e0b";
  return "#0071e3";
}

function severityBg(severity: RiskSeverity) {
  if (severity === "High") return "#fff1f0";
  if (severity === "Medium") return "#fff7ed";
  return "#eff6ff";
}
