import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Heart, Loader2, Search } from "lucide-react";
import { AppSidebar } from "../components/AppSidebar";
import { ComparePanel } from "../components/ComparePanel";
import { LiveTicker } from "../components/LiveTicker";
import { MethodologyDrawer } from "../components/MethodologyDrawer";
import { WatchlistHeart } from "../components/WatchlistHeart";
import { classColor, classStyles, type CompanyClass, categoryStyles } from "../lib/analytics";
import { loadWatchlistData } from "../lib/data";
import { formatMomentum, formatNumber } from "../lib/format";
import { evidenceFreshness } from "../lib/research";
import { readWatchlist, subscribeWatchlist } from "../lib/watchlist";
import { navigateTo } from "../routes/router";
import type { CompanyComparisonRow, DataQualitySummary, EsgCategory, LiveSignal, WatchlistCompany, WatchlistUpdate } from "../types/esg";

type UpdateFilter = "All" | EsgCategory | "Positive" | "Negative";

const updateFilters: UpdateFilter[] = ["All", "Environmental", "Social", "Governance", "Positive", "Negative"];

export function Watchlist() {
  const [companies, setCompanies] = useState<WatchlistCompany[]>([]);
  const [updates, setUpdates] = useState<WatchlistUpdate[]>([]);
  const [liveSignals, setLiveSignals] = useState<LiveSignal[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQualitySummary | undefined>();
  const [comparisonRows, setComparisonRows] = useState<CompanyComparisonRow[]>([]);
  const [watchedIds, setWatchedIds] = useState<string[]>(() => readWatchlist());
  const [activeFilter, setActiveFilter] = useState<UpdateFilter>("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWatchlistData()
      .then((data) => {
        setCompanies(data.companies);
        setUpdates(data.updates);
        setLiveSignals(data.liveSignals);
        setDataQuality(data.dataQuality);
        setComparisonRows(data.comparisonRows);
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load watchlist data");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => subscribeWatchlist(setWatchedIds), []);

  const watchedSet = useMemo(() => new Set(watchedIds), [watchedIds]);
  const watchedCompanies = companies.filter((company) => watchedSet.has(company.companyId));
  const normalizedQuery = query.trim().toLowerCase();
  const visibleCompanies = watchedCompanies.filter((company) => {
    if (!normalizedQuery) return true;
    return `${company.name} ${company.sgxIdentifier} ${company.sector}`.toLowerCase().includes(normalizedQuery);
  });
  const watchedUpdates = updates.filter((update) => watchedSet.has(update.companyId));
  const filteredUpdates = watchedUpdates.filter((update) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Positive") return update.impact > 0 || update.direction === "positive";
    if (activeFilter === "Negative") return update.impact < 0 || update.direction === "negative";
    return update.category === activeFilter;
  });
  const negativeSignals = watchedUpdates.filter((update) => update.impact < 0 || update.direction === "negative").length;
  const highRiskWatched = watchedCompanies.filter((company) => company.highSeverityAlerts > 0 || company.riskScore >= 60).length;

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <div className="grid min-h-screen lg:grid-cols-[240px_minmax(0,1fr)]">
        <AppSidebar />
        <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1440px]">
            <LiveTicker signals={liveSignals} />
            <MethodologyDrawer dataQuality={dataQuality} />

            <section className="mb-5 mt-6 rounded-[22px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">Follow-up workspace</p>
                  <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#1d1d1f] sm:text-4xl">Watchlist</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6e6e73]">Track ESG updates and risk signals for companies you follow.</p>
                </div>
                <div className="rounded-2xl bg-[#1d1d1f] px-4 py-3 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#a1a1a6]">Data note</p>
                  <p className="text-xs font-semibold">Updates are sourced from ESG evidence data, not a live news feed.</p>
                </div>
              </div>
            </section>

            {loading ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-[22px] bg-white">
                <Loader2 className="h-7 w-7 animate-spin text-[#0071e3]" />
              </div>
            ) : error ? (
              <div className="rounded-[22px] bg-white p-8 text-sm text-[#ff3b30]">{error}</div>
            ) : watchedCompanies.length ? (
              <>
                <WatchlistBrief companies={watchedCompanies} updates={watchedUpdates} />

                <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard label="Watched Companies" value={watchedCompanies.length.toString()} caption={`${visibleCompanies.length} visible`} tone="#0071e3" />
                  <SummaryCard label="Latest Updates" value={watchedUpdates.length.toString()} caption="Evidence items for followed names" tone="#00a99d" />
                  <SummaryCard label="Negative Signals" value={negativeSignals.toString()} caption="Signals requiring closer review" tone={negativeSignals ? "#ff3b30" : "#00a99d"} />
                  <SummaryCard label="High Risk Watched" value={highRiskWatched.toString()} caption="High alerts or risk score above 60" tone={highRiskWatched ? "#f59e0b" : "#00a99d"} />
                </section>

                <section className="grid gap-5 xl:grid-cols-[minmax(360px,0.95fr)_minmax(0,1.25fr)]">
                  <Panel title="Watched Companies" caption="Click a company to open its full ESG analysis">
                    <label className="mb-4 flex h-11 items-center gap-3 rounded-xl border border-black/10 bg-[#f8fafc] px-3">
                      <Search className="h-4 w-4 text-[#86868b]" />
                      <input
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#86868b]"
                        type="search"
                        placeholder="Search watchlist"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                      />
                    </label>
                    <div className="grid gap-3">
                      {visibleCompanies.length ? (
                        visibleCompanies.map((company) => <WatchedCompanyCard key={company.companyId} company={company} />)
                      ) : (
                        <div className="rounded-2xl border border-dashed border-black/15 bg-[#f8fafc] p-6 text-center text-sm text-[#6e6e73]">
                          No watched companies match your search.
                        </div>
                      )}
                    </div>
                  </Panel>

                  <Panel title="Watchlist Updates" caption="Evidence signals filtered to the companies you follow">
                    <div className="mb-4 flex flex-wrap gap-2">
                      {updateFilters.map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          className={`h-9 rounded-full px-3 text-xs font-bold transition ${
                            activeFilter === filter ? "bg-[#1d1d1f] text-white shadow-[0_6px_18px_rgba(0,0,0,.16)]" : "bg-[#f5f5f7] text-[#424245] hover:bg-black/10"
                          }`}
                          onClick={() => setActiveFilter(filter)}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                    <div className="grid max-h-[720px] gap-3 overflow-y-auto pr-1">
                      {filteredUpdates.length ? (
                        filteredUpdates.map((update) => <UpdateCard key={update.id} update={update} />)
                      ) : (
                        <div className="rounded-2xl border border-dashed border-black/15 bg-[#f8fafc] p-8 text-center text-sm text-[#6e6e73]">
                          No evidence updates match this filter.
                        </div>
                      )}
                    </div>
                  </Panel>
                </section>

                <div className="mt-5">
                  <ComparePanel rows={comparisonRows} seedCompanyId={watchedCompanies[0]?.companyId} />
                </div>
              </>
            ) : (
              <EmptyWatchlist />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function WatchedCompanyCard({ company }: { company: WatchlistCompany }) {
  return (
    <article
      className="cursor-pointer rounded-2xl bg-[#f8fafc] p-4 transition hover:bg-white hover:shadow-[0_8px_24px_rgba(0,0,0,.08)]"
      onClick={() => navigateTo(`/company/${encodeURIComponent(company.companyId)}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#1d1d1f]">{company.name}</p>
          <p className="mt-1 text-xs text-[#6e6e73]">{company.sgxIdentifier} - {company.sector}</p>
        </div>
        <WatchlistHeart companyId={company.companyId} companyName={company.name} size="sm" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <MiniMetric label="ESG" value={formatNumber(company.esgScore, 1)} tone="#0071e3" />
        <MiniMetric label="Momentum" value={formatMomentum(company.momentum)} tone={classColor(company.classification as CompanyClass)} />
        <MiniMetric label="Risk" value={formatNumber(company.riskScore, 0)} tone={company.riskScore >= 60 ? "#ff3b30" : "#00a99d"} />
        <MiniMetric label="High Alerts" value={company.highSeverityAlerts.toString()} tone={company.highSeverityAlerts ? "#ff3b30" : "#00a99d"} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classStyles(company.classification as CompanyClass)}`}>{company.classification}</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${categoryStyles(company.dominantCategory)}`}>{company.dominantCategory}</span>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#424245]">{company.followUpStatus}</span>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#6e6e73]">{evidenceFreshness(company.latestSignalDate)}</span>
      </div>
    </article>
  );
}

function WatchlistBrief({ companies, updates }: { companies: WatchlistCompany[]; updates: WatchlistUpdate[] }) {
  const negativeUpdates = updates.filter((update) => update.impact < 0 || update.direction === "negative");
  const highConfidence = updates.filter((update) => update.confidence >= 0.75);
  const needsReview = companies.filter((company) => company.followUpStatus !== "No new update" || company.riskScore >= 60);
  const latest = updates[0];

  return (
    <section className="mb-5 rounded-[18px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]">
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#86868b]">Watchlist Brief</p>
        <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[#1d1d1f]">Follow-up review queue</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <BriefStat label="Latest update" value={latest ? latest.companyName : "No update"} helper={latest ? latest.summary : "No watched evidence yet"} tone="#0071e3" />
        <BriefStat label="Negative evidence" value={negativeUpdates.length.toString()} helper="Review downside or controversy signals first" tone={negativeUpdates.length ? "#ff3b30" : "#00a99d"} />
        <BriefStat label="High-confidence changes" value={highConfidence.length.toString()} helper="Evidence above 75% confidence" tone="#00a99d" />
        <BriefStat label="Companies requiring review" value={needsReview.length.toString()} helper="New evidence, risk changed, or high risk" tone={needsReview.length ? "#f59e0b" : "#00a99d"} />
      </div>
    </section>
  );
}

function BriefStat({ label, value, helper, tone }: { label: string; value: string; helper: string; tone: string }) {
  return (
    <article className="rounded-2xl bg-[#f8fafc] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#86868b]">{label}</p>
      <p className="mt-2 truncate text-lg font-bold" style={{ color: tone }}>{value}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#6e6e73]">{helper}</p>
    </article>
  );
}

function UpdateCard({ update }: { update: WatchlistUpdate }) {
  const tone = update.impact < 0 || update.direction === "negative" ? "#ff3b30" : update.impact > 0 || update.direction === "positive" ? "#00a99d" : "#86868b";

  return (
    <article className="rounded-2xl border bg-[#f8fafc] p-4" style={{ borderColor: `${tone}55` }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${categoryStyles(update.category)}`}>{update.category}</span>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold capitalize text-[#424245]">{update.direction}</span>
          </div>
          <button
            type="button"
            className="mt-3 text-left text-sm font-bold text-[#1d1d1f] hover:text-[#0071e3]"
            onClick={() => navigateTo(`/company/${encodeURIComponent(update.companyId)}`)}
          >
            {update.companyName} <span className="text-xs font-semibold text-[#86868b]">({update.sgxIdentifier})</span>
          </button>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#86868b]">Impact</p>
          <p className="text-lg font-bold" style={{ color: tone }}>
            {formatMomentum(update.impact)}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#424245]">{update.summary}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[#6e6e73]">
        <span className="font-semibold text-[#1d1d1f]">{formatDate(update.publishedDate)}</span>
        <span>Confidence {formatNumber(update.confidence * 100, 0)}%</span>
        {update.sourcePlatform ? <span>{update.sourcePlatform.replace(/_/g, " ")}</span> : null}
        {update.url ? (
          <a className="inline-flex items-center gap-1 font-bold text-[#0071e3] hover:underline" href={update.url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
            Direct source <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
    </article>
  );
}

function EmptyWatchlist() {
  return (
    <section className="rounded-[22px] bg-white p-10 text-center shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff3b30]/10 text-[#ff3b30]">
        <Heart className="h-6 w-6" />
      </div>
      <h2 className="mt-5 text-2xl font-bold tracking-[-0.03em] text-[#1d1d1f]">No companies watched yet</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#6e6e73]">
        Add companies with the heart icon from Dashboard, Risk Radar, Investment, or a company detail page. Your follow-up evidence feed will appear here.
      </p>
      <button type="button" className="mt-6 rounded-full bg-[#1d1d1f] px-5 py-2.5 text-sm font-bold text-white" onClick={() => navigateTo("/")}>
        Explore companies
      </button>
    </section>
  );
}

function SummaryCard({ label, value, caption, tone }: { label: string; value: string; caption: string; tone: string }) {
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

function MiniMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#86868b]">{label}</p>
      <p className="mt-1 font-bold" style={{ color: tone }}>
        {value}
      </p>
    </div>
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

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}
