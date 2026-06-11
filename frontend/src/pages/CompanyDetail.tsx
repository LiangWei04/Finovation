import { ArrowLeft, Building2, LineChart as LineChartIcon, ShieldCheck } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { categories, categoryScore, scopeWindow } from "../lib/analytics";
import { categoryColor, formatNumber, formatPercent } from "../lib/format";
import { navigateTo } from "../routes/router";
import type { CompanyAnalytics, EsgDataBundle } from "../types/esg";
import { ChartCard } from "../components/ChartCard";
import { EmptyState } from "../components/EmptyState";
import { EvidenceCard } from "../components/EvidenceCard";
import { Header } from "../components/Header";
import { KpiCard } from "../components/KpiCard";
import { MomentumBadge } from "../components/MomentumBadge";

interface CompanyDetailProps {
  data: EsgDataBundle;
  analytics?: CompanyAnalytics;
}

export function CompanyDetail({ data, analytics }: CompanyDetailProps) {
  if (!analytics) {
    return <EmptyState title="Company not found" message="The selected company is not available in the generated ESG dataset." />;
  }

  const { company, dataset, trends, signals } = analytics;
  const radarData = categories.map((category) => ({
    category,
    score: categoryScore(dataset, category),
  }));
  const trendData = trends.map((trend) => ({
    period: trend.period,
    "Total signal score": trend.total_signal_score,
    Environmental: trend.environmental_score,
    Social: trend.social_score,
    Governance: trend.governance_score,
  }));
  const directionData = [
    { direction: "Positive", count: signals.filter((signal) => signal.signal_direction === "positive").length },
    { direction: "Negative", count: signals.filter((signal) => signal.signal_direction === "negative").length },
    { direction: "Neutral", count: signals.filter((signal) => signal.signal_direction === "neutral").length },
  ];
  const evidence = signals
    .slice()
    .sort((a, b) => b.weighted_signal_score - a.weighted_signal_score)
    .slice(0, 8);

  return (
    <>
      <button type="button" onClick={() => navigateTo("/")} className="mb-4 inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-teal">
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </button>

      <Header
        eyebrow={`${company.sector} · ${company.sgx_identifier}`}
        title={company.name}
        description="Company-level ESG momentum view based on collected evidence signals, confidence scores, and available trend points."
        windowLabel={scopeWindow(data.scope)}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <MomentumBadge classification={analytics.classification} />
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">{analytics.trendLabel}</span>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Initial ESG Score" value={formatNumber(company.initial_esg_score, 0)} icon={Building2} />
        <KpiCard label="Momentum Score" value={formatNumber(dataset?.total_signal_score)} icon={LineChartIcon} />
        <KpiCard label="Signal Count" value={`${dataset?.total_signal_count ?? 0}`} icon={LineChartIcon} />
        <KpiCard label="Average Confidence" value={formatPercent(dataset?.average_confidence)} icon={ShieldCheck} />
        <KpiCard label="Positive Signal Ratio" value={formatPercent(analytics.positiveRatio)} icon={ShieldCheck} />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <ChartCard title="ESG Breakdown Radar Chart" subtitle="Environmental, Social, and Governance evidence signal score.">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.15)" />
                <PolarAngleAxis dataKey="category" stroke="#cbd5e1" />
                <PolarRadiusAxis stroke="#64748b" />
                <Radar dataKey="score" stroke="#2dd4bf" fill="#2dd4bf" fillOpacity={0.28} />
                <Tooltip contentStyle={{ background: "#0a1d2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <div className="xl:col-span-2">
          <ChartCard title="ESG Trend Line Chart" subtitle="Quarterly evidence signal trend; not a formal ESG rating trend.">
            {trendData.length > 1 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 20, left: -15, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="period" stroke="#94a3b8" tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "#0a1d2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                    <Legend />
                    <Line type="monotone" dataKey="Total signal score" stroke="#2dd4bf" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Environmental" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Social" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Governance" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState title="Limited trend history" message="Limited trend history available for this company." />
            )}
          </ChartCard>
        </div>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <ChartCard title="Positive vs Negative Signal Bar Chart" subtitle="Directional evidence signals for the selected company.">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={directionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="direction" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#0a1d2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {directionData.map((item) => (
                    <Cell key={item.direction} fill={item.direction === "Negative" ? "#fb7185" : item.direction === "Positive" ? "#34d399" : "#f59e0b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Category Score Snapshot">
          <div className="grid gap-3 sm:grid-cols-3">
            {categories.map((category) => (
              <div key={category} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">{category}</p>
                <p className="mt-4 text-2xl font-semibold" style={{ color: categoryColor(category) }}>
                  {formatNumber(categoryScore(dataset, category))}
                </p>
                <p className="mt-1 text-xs text-slate-400">Evidence signal score</p>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Top Evidence</h2>
          <p className="mt-1 text-sm text-slate-400">Highest weighted evidence signals for {company.name}.</p>
        </div>
        {evidence.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {evidence.map((signal) => (
              <EvidenceCard
                key={signal.signal_id}
                esgCategory={signal.esg_category}
                signalTags={signal.signal_tags}
                signalDirection={signal.signal_direction}
                signalStrength={signal.signal_strength}
                weightedSignalScore={signal.weighted_signal_score}
                confidence={signal.confidence}
                timeRelevance={signal.time_relevance}
                evidenceSummary={signal.evidence_summary}
                evidenceQuote={signal.evidence_quote}
                publishedDate={signal.published_date}
                sourcePlatform={signal.source_platform}
                url={signal.url}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No company evidence" message="No ESG signals are available for this company in the generated JSON files." />
        )}
      </section>
    </>
  );
}
