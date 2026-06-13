import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, ChevronDown, ExternalLink, FileText, Loader2, Newspaper, Search, ShieldCheck } from "lucide-react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppSidebar } from "../components/AppSidebar";
import { ComparePanel } from "../components/ComparePanel";
import { LiveTicker } from "../components/LiveTicker";
import { MethodologyDrawer } from "../components/MethodologyDrawer";
import { WatchlistHeart } from "../components/WatchlistHeart";
import { categoryColor, categoryStyles, classificationThresholds, classColor, classifyCompany, classStyles, type CompanyClass } from "../lib/analytics";
import { loadCompanyDetailData } from "../lib/data";
import { formatMomentum, formatNumber } from "../lib/format";
import { confidenceDescription, confidenceTone, evidenceFreshness, materialityThemes } from "../lib/research";
import { navigateTo } from "../routes/router";
import type { CompanyDetailData, EsgCategory, EsgSignal } from "../types/esg";

type DetailTab = "stats" | "evidence" | "report";
type EvidenceSort = "recent" | "esg-category" | "impact";

const tabItems: Array<{ key: DetailTab; label: string }> = [
  { key: "stats", label: "Stats" },
  { key: "evidence", label: "Evidence" },
  { key: "report", label: "Report" },
];

const esgCategories: EsgCategory[] = ["Environmental", "Social", "Governance"];

export function CompanyDetail({ companyId }: { companyId: string }) {
  const [data, setData] = useState<CompanyDetailData | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("stats");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    loadCompanyDetailData(companyId)
      .then((detailData) => setData(detailData))
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load company data");
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  const thresholds = useMemo(() => classificationThresholds(data?.allCompanies ?? []), [data?.allCompanies]);
  const classification = data ? classifyCompany(data.company, thresholds.esgThreshold, thresholds.momentumThreshold) : "Hidden Winners";

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <div className="grid min-h-screen lg:grid-cols-[240px_minmax(0,1fr)]">
        <AppSidebar />

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <LiveTicker signals={data?.liveSignals ?? []} />
          <MethodologyDrawer dataQuality={data?.dataQuality} />

          {loading ? (
            <div className="flex min-h-80 items-center justify-center text-sm text-broadcast-muted">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading company analysis
            </div>
          ) : error ? (
            <div className="rounded-[18px] border border-broadcast-red/30 bg-red-50 p-4 text-sm text-broadcast-red">{error}</div>
          ) : !data ? (
            <NotFound />
          ) : (
            <>
              <button
                type="button"
                className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)] transition hover:bg-[#f8fafc]"
                onClick={() => navigateTo("/")}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to overview
              </button>

              <section className="mb-5 rounded-[18px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">Company analysis</p>
                    <div className="mt-2 flex items-center gap-3">
                      <h1 className="min-w-0 text-3xl font-bold tracking-[-0.04em] text-[#1d1d1f] sm:text-4xl">{data.company.name}</h1>
                      <WatchlistHeart companyId={data.company.companyId} companyName={data.company.name} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#6e6e73]">
                      <span className="rounded-full bg-[#f5f5f7] px-3 py-1 font-medium text-[#1d1d1f]">{data.company.sgxIdentifier}</span>
                      <span className="rounded-full bg-[#f5f5f7] px-3 py-1 font-medium text-[#1d1d1f]">{data.company.sector}</span>
                      <span className={`rounded-full px-3 py-1 font-medium ${categoryStyles(data.company.dominantCategory)}`}>{data.company.dominantCategory}</span>
                      <span className={`rounded-full px-3 py-1 font-medium ${classStyles(classification)}`}>{classification}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <MetricPill label="ESG" value={formatNumber(data.company.esgScore, 1)} />
                    <MetricPill label="Momentum" value={formatMomentum(data.company.momentum)} accent={classColor(classification)} />
                    <MetricPill label="Signals" value={data.company.signalCount.toString()} />
                  </div>
                </div>
              </section>

              <InvestorBriefPanel data={data} />

              <div className="mb-5 inline-flex rounded-2xl bg-white p-1 shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]">
                {tabItems.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`h-10 min-w-28 rounded-xl px-5 text-sm font-semibold transition ${
                      activeTab === tab.key ? "bg-[#1d1d1f] text-white shadow-[0_6px_18px_rgba(0,0,0,.16)]" : "text-[#6e6e73] hover:bg-[#f5f5f7]"
                    }`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "stats" ? <StatsTab data={data} classification={classification} /> : null}
              {activeTab === "evidence" ? <EvidenceTab signals={data.signals} /> : null}
              {activeTab === "report" ? <ReportTab data={data} classification={classification} /> : null}
              <div className="mt-5">
                <ComparePanel rows={data.comparisonRows} seedCompanyId={data.company.companyId} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function InvestorBriefPanel({ data }: { data: CompanyDetailData }) {
  const brief = data.investorBrief;
  return (
    <section className="mb-5 rounded-[18px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#86868b]">Investor Brief</p>
          <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[#1d1d1f]">Analyst-style review snapshot</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6e6e73]">{brief.thesisSnapshot}</p>
        </div>
        <span className="inline-flex rounded-full px-3 py-1 text-xs font-bold" style={{ color: confidenceTone(brief.confidenceTier), backgroundColor: "#f8fafc" }}>
          {brief.confidenceTier} confidence
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <BriefCard label="Top opportunity" text={brief.topOpportunity} tone={categoryColor(brief.materialPillar)} />
        <BriefCard label="Top risk" text={brief.topRisk} tone="#ff3b30" />
        <BriefCard label="Latest evidence change" text={brief.latestEvidenceChange} tone="#0071e3" />
        <BriefCard label="Peer-relative context" text={brief.peerRelativeContext} tone="#1d1d1f" />
        <BriefCard label="Material ESG pillar" text={brief.materialPillar} tone={categoryColor(brief.materialPillar)} />
        <BriefCard label="Monitoring trigger" text={brief.monitoringTrigger} tone="#f59e0b" />
      </div>
    </section>
  );
}

function BriefCard({ label, text, tone }: { label: string; text: string; tone: string }) {
  return (
    <article className="rounded-2xl bg-[#f8fafc] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#86868b]">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#1d1d1f]" style={{ borderTop: `2px solid ${tone}`, paddingTop: 10 }}>
        {text}
      </p>
    </article>
  );
}

function NotFound() {
  return (
    <section className="rounded-[18px] bg-white p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]">
      <p className="text-lg font-bold text-[#1d1d1f]">Company not found</p>
      <p className="mt-2 text-sm text-[#6e6e73]">The selected company ID is not available in the current ESG dataset.</p>
      <button
        type="button"
        className="mt-5 rounded-full bg-[#1d1d1f] px-5 py-2 text-sm font-semibold text-white"
        onClick={() => navigateTo("/")}
      >
        Back to overview
      </button>
    </section>
  );
}

function MetricPill({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl bg-[#f5f5f7] px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#86868b]">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-[-0.03em]" style={{ color: accent ?? "#1d1d1f" }}>
        {value}
      </p>
    </div>
  );
}

function StatsTab({ data, classification }: { data: CompanyDetailData; classification: CompanyClass }) {
  const profile = data.financialProfile;
  const radarData = esgCategories.map((category) => ({
    category,
    score: data.datasetRow?.category_breakdown?.find((item) => item.esg_category === category)?.score ?? 0,
  }));

  const trendData = data.trends.map((trend) => ({
    period: trend.period,
    Environmental: trend.environmental_score,
    Social: trend.social_score,
    Governance: trend.governance_score,
    Overall: trend.total_signal_score,
  }));

  const technicalRows = useMemo(() => buildTechnicalRows(profile?.price_history ?? []), [profile?.price_history]);
  const latestTechnical = technicalRows[technicalRows.length - 1];
  const signalQualityRows = useMemo(() => buildSignalQualityRows(data.signals), [data.signals]);
  const confidenceRows = useMemo(() => buildConfidenceRows(data.signals), [data.signals]);
  const backtestRows = profile?.backtest_history ?? [];
  const backtestMetrics = useMemo(() => buildBacktestMetrics(backtestRows), [backtestRows]);
  const fundamentalRows = profile?.fundamentals ?? [];

  return (
    <section className="space-y-5">
      <div className="rounded-[18px] border border-black/5 bg-[#1d1d1f] p-4 text-white shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]">
        <p className="text-xs leading-5 text-[#d1d1d6]">
          Decision support only, not investment advice. Backtest is simulated demo data. Indicators are analytics inputs for the report, not trading
          instructions.
        </p>
      </div>

      {!profile ? (
        <Panel title="Financial analytics unavailable" caption="Static financial demo data is required for market technicals and simulated backtest.">
          <p className="py-8 text-center text-sm text-[#6e6e73]">ESG charts remain available, but market and backtest panels cannot be shown.</p>
        </Panel>
      ) : null}

      {profile ? (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.65fr)]">
          <Panel title="Market Technicals" caption={`${profile.currency} price, volume, short/long moving averages, and trading trend context`}>
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={technicalRows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="#e5e5ea" strokeDasharray="3 3" />
                  <XAxis dataKey="label" interval={5} tick={{ fill: "#6e6e73", fontSize: 11 }} />
                  <YAxis yAxisId="price" tick={{ fill: "#6e6e73", fontSize: 11 }} width={42} />
                  <YAxis yAxisId="volume" orientation="right" tick={{ fill: "#6e6e73", fontSize: 11 }} width={42} />
                  <Tooltip formatter={(value, name) => [formatNumber(Number(value), name === "volume_m" ? 1 : 2), technicalLabel(String(name))]} />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="volume" dataKey="volume_m" name="Volume m" fill="#d7e9ff" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="price" type="monotone" dataKey="close" name="Close" stroke="#0071e3" strokeWidth={3} dot={false} />
                  <Line yAxisId="price" type="monotone" dataKey="sma6" name="MA 6" stroke="#00a99d" strokeWidth={2} dot={false} />
                  <Line yAxisId="price" type="monotone" dataKey="sma12" name="MA 12" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Trend Confirmation" caption="RSI and MACD-style signals help identify whether price momentum confirms the ESG story">
            <div className="grid gap-3">
              <IndicatorCard
                label="Latest close"
                value={`${profile.currency} ${formatNumber(latestTechnical?.close ?? 0, 2)}`}
                helper={`${formatPercent(priceReturn(profile.price_history))} over 36-month demo window`}
                tone="#0071e3"
              />
              <IndicatorCard
                label="RSI"
                value={latestTechnical?.rsi == null ? "n/a" : formatNumber(latestTechnical.rsi, 1)}
                helper={rsiLabel(latestTechnical?.rsi)}
                tone={rsiTone(latestTechnical?.rsi)}
              />
              <IndicatorCard
                label="MACD spread"
                value={latestTechnical?.macd == null ? "n/a" : formatNumber(latestTechnical.macd - (latestTechnical.macdSignal ?? 0), 3)}
                helper={macdLabel(latestTechnical)}
                tone={(latestTechnical?.macd ?? 0) >= (latestTechnical?.macdSignal ?? 0) ? "#00a99d" : "#ff3b30"}
              />
            </div>
          </Panel>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.4fr)]">
        <Panel title="ESG Category Radar" caption="Environmental, Social, and Governance signal balance used by the report">
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="74%">
                <PolarGrid stroke="#d7d7db" />
                <PolarAngleAxis dataKey="category" tick={{ fill: "#1d1d1f", fontSize: 12, fontWeight: 600 }} />
                <PolarRadiusAxis angle={90} tick={{ fill: "#86868b", fontSize: 11 }} />
                <Radar dataKey="score" stroke={classColor(classification)} fill={classColor(classification)} fillOpacity={0.25} strokeWidth={2} />
                <Tooltip formatter={(value) => formatNumber(Number(value), 2)} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="ESG Momentum Trend" caption="Half-year signal movement from the synced evidence dataset">
          <div className="mb-3 flex flex-wrap gap-3 text-xs text-[#6e6e73]">
            {esgCategories.map((category) => (
              <span key={category} className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryColor(category) }} />
                {category}
              </span>
            ))}
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#1d1d1f]" />
              Overall
            </span>
          </div>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 16, right: 20, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="#e5e5ea" strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fill: "#6e6e73", fontSize: 11 }} />
                <YAxis tick={{ fill: "#6e6e73", fontSize: 11 }} width={36} />
                <Tooltip formatter={(value) => formatNumber(Number(value), 2)} />
                <Line type="monotone" dataKey="Environmental" stroke={categoryColor("Environmental")} strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Social" stroke={categoryColor("Social")} strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Governance" stroke={categoryColor("Governance")} strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Overall" stroke="#1d1d1f" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <MaterialityMap sector={data.company.sector} />

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Signal Quality" caption="Positive and negative ESG evidence by pillar; this helps the report separate opportunity from controversy">
          <div className="h-[310px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={signalQualityRows} margin={{ top: 12, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid stroke="#e5e5ea" strokeDasharray="3 3" />
                <XAxis dataKey="category" tick={{ fill: "#6e6e73", fontSize: 11 }} />
                <YAxis tick={{ fill: "#6e6e73", fontSize: 11 }} width={34} />
                <Tooltip formatter={(value) => formatNumber(Number(value), 2)} />
                <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="positive" name="Positive impact" stackId="signals" fill="#34c759" radius={[4, 4, 0, 0]} />
                <Bar dataKey="negative" name="Negative impact" stackId="signals" fill="#ff3b30" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="net" name="Net impact" stroke="#1d1d1f" strokeWidth={2.5} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Evidence Confidence" caption="Confidence-weighted evidence distribution behind the ESG score and narrative">
          <div className="h-[310px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={confidenceRows} margin={{ top: 12, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid stroke="#e5e5ea" strokeDasharray="3 3" />
                <XAxis dataKey="bucket" tick={{ fill: "#6e6e73", fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#6e6e73", fontSize: 11 }} width={34} />
                <Tooltip />
                <Bar dataKey="count" name="Signals" fill="#00a99d" radius={[6, 6, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      {profile ? (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.75fr)]">
          <Panel title="Simulated Backtest - 36 months" caption="Company ESG momentum signal versus benchmark proxy, indexed to 100">
            {backtestRows.length ? (
              <div className="h-[390px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={backtestRows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="#e5e5ea" />
                    <XAxis dataKey="period" interval={5} tick={{ fill: "#6e6e73", fontSize: 11 }} />
                    <YAxis domain={["dataMin - 4", "dataMax + 4"]} tick={{ fill: "#6e6e73", fontSize: 11 }} width={42} />
                    <Tooltip formatter={(value) => formatNumber(Number(value), 2)} />
                    <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="signal_index" name="Company signal" stroke="#00a99d" fill="#dff5f1" strokeWidth={3} />
                    <Line type="monotone" dataKey="benchmark_index" name="Benchmark proxy" stroke="#8e8e93" strokeDasharray="5 4" strokeWidth={2.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <UnavailableChart message="Backtest demo data is not available for this company." />
            )}
          </Panel>

          <Panel title="Backtest Metrics" caption="Risk-adjusted view of the simulated signal path">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <MiniMetric label="Company signal return" value={formatPercent(backtestMetrics.signalReturn)} />
              <MiniMetric label="Benchmark return" value={formatPercent(backtestMetrics.benchmarkReturn)} />
              <MiniMetric label="Sharpe ratio" value={formatNumber(backtestMetrics.sharpe, 2)} />
              <MiniMetric label="Annual volatility" value={formatPercent(backtestMetrics.volatility)} />
              <MiniMetric label="Max drawdown" value={formatPercent(backtestMetrics.maxDrawdown)} />
            </div>
          </Panel>
        </section>
      ) : null}

      {profile ? (
        <section className="grid gap-5 xl:grid-cols-2">
          <Panel title="Fundamental Quality Trend" caption="Revenue, net income, and free cash flow give financial context to ESG momentum">
            <div className="h-[330px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={fundamentalRows} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="#e5e5ea" strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fill: "#6e6e73", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#6e6e73", fontSize: 11 }} width={46} />
                  <Tooltip formatter={(value) => formatNumber(Number(value), 0)} />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenue_m" name="Revenue m" fill="#d7e9ff" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="net_income_m" name="Net income m" stroke="#0071e3" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="free_cash_flow_m" name="Free cash flow m" stroke="#00a99d" strokeWidth={2.5} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Margin and Leverage" caption="Profitability and balance-sheet pressure can change how investors interpret ESG progress">
            <div className="h-[330px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={fundamentalRows} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="#e5e5ea" strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fill: "#6e6e73", fontSize: 11 }} />
                  <YAxis yAxisId="margin" tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} tick={{ fill: "#6e6e73", fontSize: 11 }} width={44} />
                  <YAxis yAxisId="debt" orientation="right" tick={{ fill: "#6e6e73", fontSize: 11 }} width={44} />
                  <Tooltip formatter={(value, name) => [String(name) === "operating_margin" ? formatPercent(Number(value)) : `${formatNumber(Number(value), 2)}x`, String(name) === "operating_margin" ? "Operating margin" : "Debt/equity"]} />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="margin" type="monotone" dataKey="operating_margin" name="Operating margin" stroke="#00a99d" strokeWidth={3} />
                  <Line yAxisId="debt" type="monotone" dataKey="debt_to_equity" name="Debt/equity" stroke="#f59e0b" strokeWidth={3} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </section>
      ) : null}
    </section>
  );
}

function IndicatorCard({ label, value, helper, tone }: { label: string; value: string; helper: string; tone: string }) {
  return (
    <article className="rounded-2xl bg-[#f8fafc] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#86868b]">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-[-0.04em]" style={{ color: tone }}>
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-[#6e6e73]">{helper}</p>
    </article>
  );
}

function MaterialityMap({ sector }: { sector: string }) {
  return (
    <Panel title="Materiality Map" caption="Sector-specific ESG questions mapped to SGX-style Environmental, Social, and Governance themes">
      <div className="grid gap-3 xl:grid-cols-3">
        {materialityThemes(sector).map((item) => (
          <article key={item.category} className="rounded-2xl bg-[#f8fafc] p-4">
            <div className="flex items-center justify-between gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${categoryStyles(item.category)}`}>{item.category}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#86868b]">Materiality</span>
            </div>
            <p className="mt-3 text-sm font-bold leading-6 text-[#1d1d1f]">{item.themes}</p>
            <p className="mt-2 text-xs leading-5 text-[#6e6e73]">{item.investorQuestion}</p>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function UnavailableChart({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-black/15 bg-[#f8fafc] px-5 text-center text-sm text-[#6e6e73]">
      {message}
    </div>
  );
}

function buildTechnicalRows(priceHistory: NonNullable<CompanyDetailData["financialProfile"]>["price_history"]) {
  const closes = priceHistory.map((point) => point.close);
  const sma6 = movingAverage(closes, 6);
  const sma12 = movingAverage(closes, 12);
  const rsi = relativeStrengthIndex(closes, 14);
  const macd = macdSeries(closes);

  return priceHistory.map((point, index) => ({
    ...point,
    label: index === 0 ? "Start" : `M${index}`,
    sma6: sma6[index],
    sma12: sma12[index],
    rsi: rsi[index],
    macd: macd.macd[index],
    macdSignal: macd.signal[index],
  }));
}

function movingAverage(values: number[], windowSize: number) {
  return values.map((_, index) => {
    if (index + 1 < windowSize) return undefined;
    const windowValues = values.slice(index + 1 - windowSize, index + 1);
    return windowValues.reduce((sum, value) => sum + value, 0) / windowSize;
  });
}

function exponentialMovingAverage(values: number[], windowSize: number) {
  const multiplier = 2 / (windowSize + 1);
  return values.reduce<number[]>((series, value, index) => {
    if (index === 0) {
      series.push(value);
      return series;
    }
    series.push(value * multiplier + series[index - 1] * (1 - multiplier));
    return series;
  }, []);
}

function relativeStrengthIndex(values: number[], windowSize: number) {
  return values.map((_, index) => {
    if (index < windowSize) return undefined;
    const changes = values.slice(index + 1 - windowSize, index + 1).map((value, changeIndex, windowValues) => {
      if (changeIndex === 0) return 0;
      return value - windowValues[changeIndex - 1];
    });
    const gains = changes.filter((change) => change > 0).reduce((sum, change) => sum + change, 0) / windowSize;
    const losses = Math.abs(changes.filter((change) => change < 0).reduce((sum, change) => sum + change, 0)) / windowSize;
    if (losses === 0) return 100;
    const rs = gains / losses;
    return 100 - 100 / (1 + rs);
  });
}

function macdSeries(values: number[]) {
  const fast = exponentialMovingAverage(values, 12);
  const slow = exponentialMovingAverage(values, 26);
  const macd = values.map((_, index) => fast[index] - slow[index]);
  const signal = exponentialMovingAverage(macd, 9);
  return { macd, signal };
}

function buildSignalQualityRows(signals: EsgSignal[]) {
  return esgCategories.map((category) => {
    const categorySignals = signals.filter((signal) => signal.esg_category === category);
    const positive = categorySignals.filter((signal) => signal.weighted_signal_score > 0).reduce((sum, signal) => sum + signal.weighted_signal_score, 0);
    const negative = categorySignals.filter((signal) => signal.weighted_signal_score < 0).reduce((sum, signal) => sum + Math.abs(signal.weighted_signal_score), 0);
    return {
      category,
      positive,
      negative,
      net: positive - negative,
    };
  });
}

function buildConfidenceRows(signals: EsgSignal[]) {
  const buckets = [
    { bucket: "Low", min: 0, max: 0.5 },
    { bucket: "Medium", min: 0.5, max: 0.75 },
    { bucket: "High", min: 0.75, max: 1.01 },
  ];
  return buckets.map((bucket) => ({
    bucket: bucket.bucket,
    count: signals.filter((signal) => signal.confidence >= bucket.min && signal.confidence < bucket.max).length,
  }));
}

function buildBacktestMetrics(rows: NonNullable<NonNullable<CompanyDetailData["financialProfile"]>["backtest_history"]>) {
  if (rows.length < 2) {
    return { signalReturn: 0, benchmarkReturn: 0, sharpe: 0, volatility: 0, maxDrawdown: 0 };
  }

  const first = rows[0];
  const last = rows[rows.length - 1];
  const returns = rows.slice(1).map((row, index) => row.signal_index / rows[index].signal_index - 1);
  const averageReturn = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - averageReturn) ** 2, 0) / returns.length;
  const monthlyVolatility = Math.sqrt(variance);
  const annualizedVolatility = monthlyVolatility * Math.sqrt(12);
  const sharpe = annualizedVolatility === 0 ? 0 : (averageReturn * 12) / annualizedVolatility;

  return {
    signalReturn: last.signal_index / first.signal_index - 1,
    benchmarkReturn: last.benchmark_index / first.benchmark_index - 1,
    sharpe,
    volatility: annualizedVolatility,
    maxDrawdown: maxDrawdown(rows.map((row) => row.signal_index)),
  };
}

function maxDrawdown(values: number[]) {
  let peak = values[0] ?? 0;
  let worst = 0;
  values.forEach((value) => {
    peak = Math.max(peak, value);
    if (peak > 0) {
      worst = Math.min(worst, value / peak - 1);
    }
  });
  return worst;
}

function priceReturn(priceHistory: NonNullable<CompanyDetailData["financialProfile"]>["price_history"]) {
  if (priceHistory.length < 2) return 0;
  return priceHistory[priceHistory.length - 1].close / priceHistory[0].close - 1;
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value * 100, 1)}%`;
}

function rsiLabel(value: number | undefined) {
  if (value == null) return "Needs more monthly history";
  if (value >= 70) return "Elevated momentum; watch reversal risk";
  if (value <= 30) return "Weak price momentum; watch downside pressure";
  return "Balanced momentum range";
}

function rsiTone(value: number | undefined) {
  if (value == null) return "#86868b";
  if (value >= 70) return "#f59e0b";
  if (value <= 30) return "#ff3b30";
  return "#00a99d";
}

function macdLabel(row: ReturnType<typeof buildTechnicalRows>[number] | undefined) {
  if (!row || row.macd == null || row.macdSignal == null) return "Needs more monthly history";
  return row.macd >= row.macdSignal ? "Trend confirmation is positive" : "Trend confirmation is softening";
}

function technicalLabel(name: string) {
  if (name === "volume_m") return "Volume m";
  if (name === "sma6") return "MA 6";
  if (name === "sma12") return "MA 12";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function EvidenceTab({ signals }: { signals: EsgSignal[] }) {
  const [sortBy, setSortBy] = useState<EvidenceSort>("recent");
  const sortedSignals = useMemo(() => sortEvidenceSignals(signals, sortBy), [signals, sortBy]);

  if (!signals.length) {
    return (
      <section className="space-y-5">
        <EvidenceToolbar sortBy={sortBy} onSortChange={setSortBy} />
        <Panel title="Evidence Signals" caption="Filtered to this company">
          <p className="py-10 text-center text-sm text-[#6e6e73]">No evidence signals are available for this company yet.</p>
        </Panel>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <EvidenceToolbar sortBy={sortBy} onSortChange={setSortBy} />
      <div className="grid gap-5 xl:grid-cols-2">
        {sortedSignals.map((signal) => (
          <EvidenceCard key={signal.signal_id} signal={signal} />
        ))}
      </div>
    </section>
  );
}

function EvidenceToolbar({ sortBy, onSortChange }: { sortBy: EvidenceSort; onSortChange: (sortBy: EvidenceSort) => void }) {
  return (
    <section className="rounded-[18px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]">
      <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_auto_190px] lg:items-center">
        <label className="flex h-11 items-center gap-3 rounded-xl border border-black/10 bg-[#f8fafc] px-3">
          <Search className="h-4 w-4 text-[#86868b]" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#86868b]"
            placeholder="Search evidence"
            readOnly
            type="search"
          />
        </label>

        <span className="hidden text-sm font-semibold text-[#6e6e73] lg:inline">Sort by:</span>

        <label className="relative block">
          <span className="sr-only">Sort evidence by</span>
          <select
            className="h-11 w-full appearance-none rounded-xl border border-black/10 bg-[#f8fafc] px-4 pr-10 text-sm font-semibold text-[#1d1d1f] outline-none focus:border-[#0071e3]"
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value as EvidenceSort)}
          >
            <option value="recent">recent</option>
            <option value="esg-category">ESG category</option>
            <option value="impact">impact</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-[#6e6e73]" />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        {[
          ["Environment", "Environmental"],
          ["Social", "Social"],
          ["Governance", "Governance"],
        ].map(([label, category]) => (
          <label key={category} className="inline-flex items-center gap-2 text-sm font-semibold text-[#424245]">
            <span
              className="flex h-5 w-5 items-center justify-center rounded border-2 bg-white"
              style={{ borderColor: categoryColor(category as EsgCategory) }}
              aria-hidden="true"
            >
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: categoryColor(category as EsgCategory) }} />
            </span>
            <input className="sr-only" type="checkbox" checked readOnly />
            {label}
          </label>
        ))}
      </div>
    </section>
  );
}

function sortEvidenceSignals(signals: EsgSignal[], sortBy: EvidenceSort) {
  const categoryOrder: Record<EsgCategory, number> = {
    Environmental: 0,
    Social: 1,
    Governance: 2,
  };

  return signals.slice().sort((a, b) => {
    if (sortBy === "impact") {
      const impactCompare = Math.abs(b.weighted_signal_score) - Math.abs(a.weighted_signal_score);
      if (impactCompare !== 0) return impactCompare;
    }

    if (sortBy === "esg-category") {
      const categoryCompare = categoryOrder[a.esg_category] - categoryOrder[b.esg_category];
      if (categoryCompare !== 0) return categoryCompare;
    }

    const dateCompare = new Date(b.published_date).getTime() - new Date(a.published_date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return Math.abs(b.weighted_signal_score) - Math.abs(a.weighted_signal_score);
  });
}

function EvidenceCard({ signal }: { signal: EsgSignal }) {
  const tone = evidenceTone(signal);
  const sourceUrl = signal.clickable_url ?? signal.url;
  const tier = signal.confidence >= 0.75 ? "High" : signal.confidence >= 0.6 ? "Medium" : "Low";

  return (
    <article
      className="min-h-[260px] rounded-[18px] border-2 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]"
      style={{ borderColor: tone.border, boxShadow: `0 10px 28px ${tone.glow}` }}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${categoryStyles(signal.esg_category)}`}>{signal.esg_category}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${directionStyle(signal.signal_direction)}`}>{signal.signal_direction}</span>
          <span className="rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-semibold text-[#1d1d1f]">Used in score</span>
        </div>
        <span className="shrink-0 text-sm font-bold" style={{ color: tone.text }}>
          {signal.weighted_signal_score > 0 ? "+" : ""}
          {formatMomentum(signal.weighted_signal_score)}
        </span>
      </div>

      <p className="text-sm font-semibold leading-5 text-[#1d1d1f]">{signal.evidence_summary}</p>
      {signal.evidence_quote ? <p className="mt-3 rounded-2xl bg-[#f5f5f7] p-3 text-sm leading-6 text-[#424245]">"{signal.evidence_quote}"</p> : null}

      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-[#6e6e73]">
        <span className="font-semibold text-[#1d1d1f]">{formatDate(signal.published_date)}</span>
        <span>{evidenceFreshness(signal.published_date)}</span>
        <span>Confidence {formatNumber(signal.confidence * 100, 0)}%</span>
        <span className="font-bold" style={{ color: confidenceTone(tier) }}>{tier} source quality</span>
        {signal.source_platform ? <span>{signal.source_platform.replace(/_/g, " ")}</span> : null}
      </div>
      <p className="mt-3 rounded-2xl bg-[#f8fafc] p-3 text-xs leading-5 text-[#6e6e73]">{confidenceDescription(signal.confidence)}</p>

      {sourceUrl ? (
        <a
          className="mt-5 inline-flex h-9 items-center gap-2 rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-xs font-bold text-[#1d1d1f] transition hover:border-[#0071e3] hover:text-[#0071e3]"
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Direct source
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null}
    </article>
  );
}

function ReportTab({ data, classification }: { data: CompanyDetailData; classification: CompanyClass }) {
  if (!data.financialProfile) {
    return (
      <Panel title="Financial demo data unavailable" caption="The investor report needs static financial data to show valuation, price, and peer charts.">
        <div className="rounded-2xl border border-dashed border-black/15 bg-[#f8fafc] p-5 text-sm leading-6 text-[#6e6e73]">
          ESG evidence and trend data are available, but no financial profile was found for this company. Decision support only, not investment advice.
        </div>
      </Panel>
    );
  }

  const dominantCategory = data.company.dominantCategory;
  const financialQuality = financialQualityLabel(data.financialProfile);
  const valuationStatus = valuationStatusLabel(data.financialProfile, data);
  const investorSignal = investorSignalLabel(classification, financialQuality, data.signals);
  const latestFundamental = data.financialProfile.fundamentals[data.financialProfile.fundamentals.length - 1];
  const negativeSignals = data.signals.filter((signal) => signal.weighted_signal_score < 0);
  const peerRows = peerComparisonRows(data);
  const sgxCoverage = sgxCoverageRows(data);
  const combinedTrend = combinedTrendRows(data);
  const takeaways = investorTakeaways(data, classification, financialQuality, valuationStatus, investorSignal);

  return (
    <section className="space-y-5">
      <section className="rounded-[18px] bg-[#1d1d1f] p-5 text-white shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#a1a1a6]">Investor decision support</p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em]">{investorSignal}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#d1d1d6]">
              Combines ESG momentum, SGX core metric coverage, evidence quality, historical trends, and static demo financial data. Decision support only,
              not investment advice.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[640px]">
            <ReportMetric label="ESG score" value={formatNumber(data.company.esgScore, 1)} />
            <ReportMetric label="Momentum" value={formatMomentum(data.company.momentum)} color={classColor(classification)} />
            <ReportMetric label="Financial quality" value={financialQuality} />
            <ReportMetric label="Valuation" value={valuationStatus} />
          </div>
        </div>
      </section>

      <Panel title="Analyst Memo" caption="Structured research notes to support investment review, not a recommendation">
        <div className="grid gap-3 md:grid-cols-2">
          <MemoItem label="Summary" text={data.investorBrief.thesisSnapshot} />
          <MemoItem label="Key evidence" text={data.investorBrief.latestEvidenceChange} />
          <MemoItem label="Financial context" text={`${financialQuality} financial quality; valuation screens as ${valuationStatus.toLowerCase()} versus available peers.`} />
          <MemoItem label="Open question" text={`Does ${data.company.dominantCategory.toLowerCase()} evidence remain material enough to influence future risk-adjusted returns?`} />
          <MemoItem label="Risk review" text={data.investorBrief.topRisk} />
          <MemoItem label="Monitoring trigger" text={data.investorBrief.monitoringTrigger} />
        </div>
      </Panel>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <Panel title="Price and Volume" caption={`${data.financialProfile.currency} demo market data, latest close and trading activity`}>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.financialProfile.price_history} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#e5e5ea" strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: "#6e6e73", fontSize: 11 }} />
                <YAxis yAxisId="price" tick={{ fill: "#6e6e73", fontSize: 11 }} width={42} />
                <YAxis yAxisId="volume" orientation="right" tick={{ fill: "#6e6e73", fontSize: 11 }} width={42} />
                <Tooltip formatter={(value, name) => [formatNumber(Number(value), name === "volume_m" ? 1 : 2), name === "volume_m" ? "Volume m" : "Close"]} />
                <Bar yAxisId="volume" dataKey="volume_m" fill="#d7e9ff" radius={[4, 4, 0, 0]} />
                <Line yAxisId="price" type="monotone" dataKey="close" stroke="#0071e3" strokeWidth={3} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Fundamental Snapshot" caption={`${data.financialProfile.latest_fiscal_period}; ${data.financialProfile.data_freshness_note}`}>
          <div className="grid grid-cols-2 gap-3">
            <MiniMetric label="Market cap" value={`${data.financialProfile.currency} ${formatNumber(data.financialProfile.market_cap_m, 0)}m`} />
            <MiniMetric label="Revenue" value={`${formatNumber(latestFundamental.revenue_m, 0)}m`} />
            <MiniMetric label="Net income" value={`${formatNumber(latestFundamental.net_income_m, 0)}m`} />
            <MiniMetric label="Free cash flow" value={`${formatNumber(latestFundamental.free_cash_flow_m, 0)}m`} />
            <MiniMetric label="P/E" value={`${formatNumber(data.financialProfile.valuation.pe, 1)}x`} />
            <MiniMetric label="Dividend yield" value={`${formatNumber(data.financialProfile.valuation.dividend_yield * 100, 1)}%`} />
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="ESG Momentum vs Revenue Trend" caption="Shows whether ESG signal improvement is moving alongside financial scale">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={combinedTrend} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#e5e5ea" strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fill: "#6e6e73", fontSize: 11 }} />
                <YAxis yAxisId="revenue" tick={{ fill: "#6e6e73", fontSize: 11 }} width={44} />
                <YAxis yAxisId="esg" orientation="right" tick={{ fill: "#6e6e73", fontSize: 11 }} width={44} />
                <Tooltip formatter={(value, name) => [formatNumber(Number(value), 2), name === "revenue" ? "Revenue m" : "ESG momentum"]} />
                <Bar yAxisId="revenue" dataKey="revenue" fill="#e5f4f1" radius={[4, 4, 0, 0]} />
                <Line yAxisId="esg" type="monotone" dataKey="momentum" stroke="#00a99d" strokeWidth={3} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Risk Decomposition" caption="Evidence quality, negative signal concentration, and financially material ESG pillars">
          <div className="grid gap-3">
            <RiskRow label="Quadrant" value={classification} tone={classColor(classification)} />
            <RiskRow label="Dominant ESG pillar" value={dominantCategory} tone={categoryColor(dominantCategory)} />
            <RiskRow label="Negative evidence" value={`${negativeSignals.length} of ${data.signals.length} signals`} tone={negativeSignals.length ? "#ff3b30" : "#34c759"} />
            <RiskRow label="Data confidence" value={`${formatNumber(data.company.confidence * 100, 0)}%`} tone="#0071e3" />
            <RiskRow label="Leverage watch" value={`Debt/equity ${formatNumber(latestFundamental.debt_to_equity, 2)}x`} tone={latestFundamental.debt_to_equity > 1 ? "#ff3b30" : "#00a99d"} />
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(340px,0.85fr)_minmax(0,1.15fr)]">
        <Panel title="SGX Core ESG Metric Coverage" caption="Coverage proxy from evidence tags and SGX core metric themes">
          <div className="grid gap-3">
            {sgxCoverage.map((row) => (
              <div key={row.category} className="rounded-2xl bg-[#f8fafc] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-[#1d1d1f]">{row.category}</span>
                  <span className="text-xs font-semibold text-[#6e6e73]">{row.covered}/{row.total} themes</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div className="h-full rounded-full" style={{ width: `${row.percent}%`, backgroundColor: categoryColor(row.category) }} />
                </div>
                <p className="mt-2 text-xs leading-5 text-[#6e6e73]">{row.label}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Peer Context" caption="Same-sector peers where available, otherwise nearest available companies">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.08em] text-[#86868b]">
                  <th className="pb-3">Company</th>
                  <th className="pb-3">ESG</th>
                  <th className="pb-3">Momentum</th>
                  <th className="pb-3">P/E</th>
                  <th className="pb-3">Dividend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {peerRows.map((row) => (
                  <tr key={row.name} className={row.current ? "font-bold text-[#1d1d1f]" : "text-[#424245]"}>
                    <td className="py-3">{row.name}</td>
                    <td className="py-3">{formatNumber(row.esg, 1)}</td>
                    <td className="py-3">{formatMomentum(row.momentum)}</td>
                    <td className="py-3">{formatNumber(row.pe, 1)}x</td>
                    <td className="py-3">{formatNumber(row.dividendYield * 100, 1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>

      <Panel title="Investor Takeaways" caption="Concise decision-support notes, not an investment recommendation">
        <div className="grid gap-3 md:grid-cols-2">
          {takeaways.map((item) => (
            <article key={item.label} className="rounded-2xl bg-[#f8fafc] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#86868b]">{item.label}</p>
              <p className="mt-2 text-sm leading-6 text-[#1d1d1f]">{item.text}</p>
            </article>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function MemoItem({ label, text }: { label: string; text: string }) {
  return (
    <article className="rounded-2xl bg-[#f8fafc] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#86868b]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-[#1d1d1f]">{text}</p>
    </article>
  );
}

function ReportMetric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#a1a1a6]">{label}</p>
      <p className="mt-1 truncate text-sm font-bold" style={{ color: color ?? "white" }}>{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f8fafc] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#86868b]">{label}</p>
      <p className="mt-1 text-sm font-bold text-[#1d1d1f]">{value}</p>
    </div>
  );
}

function RiskRow({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f8fafc] p-3">
      <span className="text-sm font-semibold text-[#424245]">{label}</span>
      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold" style={{ color: tone }}>{value}</span>
    </div>
  );
}

function financialQualityLabel(profile: NonNullable<CompanyDetailData["financialProfile"]>) {
  const first = profile.fundamentals[0];
  const latest = profile.fundamentals[profile.fundamentals.length - 1];
  const revenueGrowth = latest.revenue_m > first.revenue_m;
  const profitable = latest.net_income_m > 0 && latest.free_cash_flow_m > 0;
  const manageableLeverage = latest.debt_to_equity <= 1;

  if (revenueGrowth && profitable && manageableLeverage) return "Stronger";
  if (!profitable || latest.debt_to_equity > 1.1) return "Weaker";
  return "Mixed";
}

function valuationStatusLabel(profile: NonNullable<CompanyDetailData["financialProfile"]>, data: CompanyDetailData) {
  const peers = data.allFinancialProfiles.filter((peer) => {
    const peerCompany = data.allCompanies.find((company) => company.companyId === peer.company_id);
    return peerCompany?.sector === data.company.sector && peer.company_id !== profile.company_id;
  });
  const comparisonSet = peers.length ? peers : data.allFinancialProfiles.filter((peer) => peer.company_id !== profile.company_id);
  const averagePe = comparisonSet.length ? comparisonSet.reduce((sum, peer) => sum + peer.valuation.pe, 0) / comparisonSet.length : profile.valuation.pe;
  if (profile.valuation.pe > averagePe * 1.1) return "Premium";
  if (profile.valuation.pe < averagePe * 0.9) return "Discount";
  return "In line";
}

function investorSignalLabel(classification: CompanyClass, financialQuality: string, signals: EsgSignal[]) {
  const negativeShare = signals.length ? signals.filter((signal) => signal.weighted_signal_score < 0).length / signals.length : 0;
  if ((classification === "Hidden Winners" || classification === "Future Leaders") && financialQuality !== "Weaker") return "ESG Opportunity";
  if (classification === "Value Traps" || financialQuality === "Weaker" || negativeShare > 0.35) return "Risk Watch";
  return "Balanced Watch";
}

function peerComparisonRows(data: CompanyDetailData) {
  const sameSector = data.allCompanies.filter((company) => company.sector === data.company.sector);
  const pool = sameSector.length > 1 ? sameSector : data.allCompanies.slice(0, 5);
  return pool
    .map((company) => {
      const profile = data.allFinancialProfiles.find((item) => item.company_id === company.companyId);
      return profile
        ? {
            name: company.name,
            esg: company.esgScore,
            momentum: company.momentum,
            pe: profile.valuation.pe,
            dividendYield: profile.valuation.dividend_yield,
            current: company.companyId === data.company.companyId,
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => Number(b?.current) - Number(a?.current)) as Array<{ name: string; esg: number; momentum: number; pe: number; dividendYield: number; current: boolean }>;
}

function sgxCoverageRows(data: CompanyDetailData) {
  const tags = data.signals.flatMap((signal) => signal.signal_tags ?? []).join(" ").toLowerCase();
  const summaries = data.signals.map((signal) => signal.evidence_summary).join(" ").toLowerCase();
  const text = `${tags} ${summaries}`;
  const rows: Array<{ category: EsgCategory; themes: string[]; label: string }> = [
    { category: "Environmental", themes: ["emissions", "climate", "energy", "water", "waste"], label: "GHG, energy, water, waste and climate evidence" },
    { category: "Social", themes: ["employee", "workforce", "training", "safety", "diversity"], label: "Workforce diversity, training, employment and safety evidence" },
    { category: "Governance", themes: ["board", "corruption", "assurance", "certification", "framework"], label: "Board, ethics, assurance and disclosure practice evidence" },
  ];

  return rows.map((row) => {
    const covered = row.themes.filter((theme) => text.includes(theme)).length;
    return {
      ...row,
      covered,
      total: row.themes.length,
      percent: Math.max(8, (covered / row.themes.length) * 100),
    };
  });
}

function combinedTrendRows(data: CompanyDetailData) {
  const financial = data.financialProfile?.fundamentals ?? [];
  return financial.map((point, index) => ({
    period: point.period.replace("FY20", "'"),
    revenue: point.revenue_m,
    momentum: data.trends[index]?.total_signal_score ?? data.company.momentum,
  }));
}

function investorTakeaways(data: CompanyDetailData, classification: CompanyClass, financialQuality: string, valuationStatus: string, investorSignal: string) {
  const negativeSignals = data.signals.filter((signal) => signal.weighted_signal_score < 0);
  const latestFundamental = data.financialProfile?.fundamentals[data.financialProfile.fundamentals.length - 1];
  return [
    {
      label: "Opportunity",
      text: `${investorSignal}: ${data.company.name} sits in ${classification}, with ESG momentum of ${formatMomentum(data.company.momentum)} and ${financialQuality.toLowerCase()} financial quality.`,
    },
    {
      label: "Valuation context",
      text: `Static demo valuation screens as ${valuationStatus.toLowerCase()} versus available peers; use this as context alongside ESG momentum, not as a standalone call.`,
    },
    {
      label: "Risk watch",
      text: negativeSignals.length
        ? `${negativeSignals.length} negative evidence signals require review, led by ${negativeSignals[0].esg_category.toLowerCase()} evidence.`
        : "No negative evidence concentration appears in the current signal set.",
    },
    {
      label: "Evidence quality",
      text: `Average evidence confidence is ${formatNumber(data.company.confidence * 100, 0)}%; latest leverage snapshot is ${latestFundamental ? `${formatNumber(latestFundamental.debt_to_equity, 2)}x debt/equity` : "unavailable"}.`,
    },
  ];
}

function shortDate(date: string) {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return date;
  return parsedDate.toLocaleDateString(undefined, { month: "short" });
}
function Panel({ title, caption, children }: { title: string; caption: string; children: ReactNode }) {
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

function evidenceTone(signal: EsgSignal) {
  if (signal.weighted_signal_score > 0) {
    return {
      border: "#34c759",
      glow: "rgba(52,199,89,0.10)",
      text: "#16a34a",
    };
  }

  if (signal.weighted_signal_score < 0) {
    return {
      border: "#ff3b30",
      glow: "rgba(255,59,48,0.10)",
      text: "#dc2626",
    };
  }

  return {
    border: "#d7d7db",
    glow: "rgba(0,0,0,0.04)",
    text: "#6e6e73",
  };
}

function directionStyle(direction: EsgSignal["signal_direction"]) {
  if (direction === "positive") return "bg-emerald-50 text-emerald-700";
  if (direction === "negative") return "bg-red-50 text-red-700";
  return "bg-[#f5f5f7] text-[#1d1d1f]";
}

function formatDate(date: string) {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return date;
  return parsedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
