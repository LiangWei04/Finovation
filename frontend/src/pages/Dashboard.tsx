import { Activity, BarChart3, Building2, Database, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { categoryOverview, computeInsights, computeKpis, matrixGroups, scopeWindow } from "../lib/analytics";
import { categoryColor, formatInteger, formatNumber, formatPercent } from "../lib/format";
import type { CompanyAnalytics, EsgDataBundle, MomentumClassification } from "../types/esg";
import { AnalystNotes } from "../components/AnalystNotes";
import { ChartCard } from "../components/ChartCard";
import { Header } from "../components/Header";
import { KpiCard } from "../components/KpiCard";
import { MomentumBadge } from "../components/MomentumBadge";
import { RankingTable } from "../components/RankingTable";

interface DashboardProps {
  data: EsgDataBundle;
  analytics: CompanyAnalytics[];
}

const matrixDescriptions: Record<MomentumClassification, string> = {
  "Hidden Winners": "Low starting ESG score, improving momentum",
  "Future Leaders": "High starting ESG score, improving momentum",
  "Value Traps": "Low starting ESG score, declining or weak momentum",
  "Overrated Leaders": "High starting ESG score, declining or weak momentum",
};

export function Dashboard({ data, analytics }: DashboardProps) {
  const kpis = computeKpis(data);
  const overview = categoryOverview(data.signals);
  const insights = computeInsights(data, analytics);
  const groups = matrixGroups(analytics);

  return (
    <>
      <Header
        eyebrow="Find Tomorrow's ESG Leaders Today"
        title="ESG Momentum Radar"
        description="An evidence-backed ESG momentum dashboard for identifying improving companies before static ESG scores fully reflect change."
        windowLabel={scopeWindow(data.scope)}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="Total Companies" value={formatInteger(kpis.totalCompanies)} icon={Building2} />
        <KpiCard label="Total ESG Signals" value={formatInteger(kpis.totalSignals)} icon={Activity} />
        <KpiCard label="Positive Signal %" value={formatPercent(kpis.positiveSignalPercent)} icon={TrendingUp} />
        <KpiCard label="Negative Signal %" value={formatPercent(kpis.negativeSignalPercent)} icon={TrendingDown} />
        <KpiCard label="Average Confidence" value={formatPercent(kpis.averageConfidence)} icon={ShieldCheck} />
        <KpiCard label="Unique Source Count" value={formatInteger(kpis.uniqueSourceCount)} icon={Database} />
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.75fr)]">
        <RankingTable analytics={analytics} />
        <AnalystNotes notes={insights} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <ChartCard title="ESG Category Overview" subtitle="Signal counts and evidence-weighted scores from structured ESG signals.">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="category" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                  labelStyle={{ color: "#e5e7eb", fontWeight: 600 }}
                  itemStyle={{ color: "#e5e7eb" }}
                />
                <Bar dataKey="count" name="Signals" radius={[6, 6, 0, 0]}>
                  {overview.map((entry) => (
                    <Cell key={entry.category} fill={categoryColor(entry.category)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {overview.map((item) => (
              <div key={item.category} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" style={{ color: categoryColor(item.category) }} />
                  <p className="font-semibold text-white">{item.category}</p>
                </div>
                <p className="mt-3 text-2xl font-semibold" style={{ color: categoryColor(item.category) }}>
                  {item.count}
                </p>
                <p className="text-xs text-slate-400">
                  {item.positive} positive, {item.negative} negative - score {formatNumber(item.score)}
                </p>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Momentum Matrix" subtitle="X-axis: current ESG score. Y-axis: recent evidence momentum.">
          <div className="grid grid-cols-[1.1rem_minmax(0,1fr)] gap-2">
            <div className="flex items-center justify-center">
              <span className="-rotate-90 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Improving</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {(["Hidden Winners", "Future Leaders"] as MomentumClassification[]).map((classification) => (
                <MatrixQuadrant key={classification} classification={classification} description={matrixDescriptions[classification]} companies={groups[classification]} />
              ))}
            </div>
            <div className="flex items-center justify-center">
              <span className="-rotate-90 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Weak</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {(["Value Traps", "Overrated Leaders"] as MomentumClassification[]).map((classification) => (
                <MatrixQuadrant key={classification} classification={classification} description={matrixDescriptions[classification]} companies={groups[classification]} />
              ))}
            </div>
            <div />
            <div className="grid grid-cols-2 gap-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <span>Lower Current ESG</span>
              <span>Higher Current ESG</span>
            </div>
          </div>
        </ChartCard>
      </div>
    </>
  );
}

function MatrixQuadrant({
  classification,
  description,
  companies,
}: {
  classification: MomentumClassification;
  description: string;
  companies: CompanyAnalytics[];
}) {
  return (
    <div className="min-h-40 rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MomentumBadge classification={classification} />
        <span className="text-xs text-slate-500">{companies.length}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {companies.length ? (
          companies.map((item) => (
            <span key={item.company.company_id} className="rounded-full border border-white/10 bg-midnight/50 px-2.5 py-1 text-xs text-slate-200">
              {item.company.name}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-500">No companies in this quadrant</span>
        )}
      </div>
    </div>
  );
}
