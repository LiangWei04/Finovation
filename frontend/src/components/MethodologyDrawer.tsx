import { useState } from "react";
import { Database, Info, ShieldCheck, X } from "lucide-react";
import { confidenceTone, evidenceFreshness } from "../lib/research";
import { formatNumber } from "../lib/format";
import type { DataQualitySummary } from "../types/esg";

export function MethodologyDrawer({ dataQuality }: { dataQuality?: DataQualitySummary }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f5f5f7] text-[#0071e3]">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#1d1d1f]">Methodology & Data Quality</p>
            <p className="truncate text-xs text-[#6e6e73]">
              {dataQuality
                ? `${dataQuality.signalCount} ESG signals · ${formatNumber(dataQuality.averageConfidence * 100, 0)}% average confidence · ${evidenceFreshness(dataQuality.latestSignalDate)}`
                : "Scoring, evidence quality, and decision-support guardrails"}
            </p>
          </div>
        </div>
        <button type="button" className="inline-flex h-9 items-center gap-2 rounded-full bg-[#1d1d1f] px-4 text-xs font-bold text-white" onClick={() => setOpen(true)}>
          <Info className="h-3.5 w-3.5" />
          View methodology
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Methodology and data quality">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close methodology drawer" onClick={() => setOpen(false)} />
          <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-xl flex-col overflow-hidden bg-white shadow-[-12px_0_40px_rgba(0,0,0,.18)]">
            <div className="flex items-start justify-between gap-4 border-b border-black/10 p-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#86868b]">Trust layer</p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[#1d1d1f]">How to read this platform</h2>
                <p className="mt-2 text-sm leading-6 text-[#6e6e73]">Decision support only, not investment advice. Scores are research inputs, not recommendations.</p>
              </div>
              <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7] text-[#1d1d1f]" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {dataQuality ? (
                <section className="mb-5 grid gap-3 sm:grid-cols-2">
                  <QualityMetric label="Universe" value={`${dataQuality.companyCount} companies`} helper={`${dataQuality.financialProfileCount} with demo financial profiles`} />
                  <QualityMetric label="Evidence" value={`${dataQuality.signalCount} signals`} helper={`${dataQuality.sourceCount} source references`} />
                  <QualityMetric label="Confidence" value={`${formatNumber(dataQuality.averageConfidence * 100, 0)}%`} helper={`${dataQuality.confidenceTier} confidence tier`} tone={confidenceTone(dataQuality.confidenceTier)} />
                  <QualityMetric label="Freshness" value={dataQuality.latestPeriod} helper={evidenceFreshness(dataQuality.latestSignalDate)} />
                </section>
              ) : null}

              <section className="grid gap-3">
                {(dataQuality?.methodologyMetrics ?? fallbackMetrics).map((metric) => (
                  <article key={metric.label} className="rounded-2xl bg-[#f8fafc] p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#0071e3]">
                        <Database className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-[#1d1d1f]">{metric.label}</h3>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#424245]">{metric.value}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#6e6e73]">{metric.description}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </section>

              <section className="mt-5 rounded-2xl bg-[#1d1d1f] p-4 text-white">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#a1a1a6]">Investor use</p>
                <p className="mt-2 text-sm leading-6 text-[#d1d1d6]">
                  Use the platform to prioritize review, compare peer evidence, inspect direct sources, and monitor changes. Final investment decisions still require independent valuation, portfolio fit, and risk review.
                </p>
              </section>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function QualityMetric({ label, value, helper, tone = "#1d1d1f" }: { label: string; value: string; helper: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-[#f8fafc] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#86868b]">{label}</p>
      <p className="mt-1 text-lg font-bold" style={{ color: tone }}>
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-[#6e6e73]">{helper}</p>
    </div>
  );
}

const fallbackMetrics = [
  {
    label: "ESG score",
    value: "0-100",
    description: "Company baseline score used with momentum to place companies into the ESG Momentum Matrix.",
  },
  {
    label: "Momentum",
    value: "Evidence-weighted",
    description: "Weighted recent ESG evidence flow. Positive values indicate improving signals; negative values indicate deteriorating or controversial evidence.",
  },
  {
    label: "Risk score",
    value: "0-100",
    description: "Composite review score built from negative evidence, governance flags, momentum deterioration, and evidence conflict proxy.",
  },
  {
    label: "Live signals",
    value: "Evidence feed",
    description: "Ticker items are generated from the synced ESG evidence dataset. They are not a real-time news feed.",
  },
];
