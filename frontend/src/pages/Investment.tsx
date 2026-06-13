import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ChevronDown, Loader2, Minus, PieChart, RefreshCw, Scale, Search } from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart as RechartsPieChart,
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
import { categoryColor, classColor, classStyles, type CompanyClass } from "../lib/analytics";
import { loadInvestmentData } from "../lib/data";
import { formatMomentum, formatNumber } from "../lib/format";
import { navigateTo } from "../routes/router";
import type { BasketHolding, BasketMetrics, CompanyComparisonRow, DataQualitySummary, EsgCategory, InvestmentCompany, InvestmentPreset, LiveSignal } from "../types/esg";

const storageKey = "esg_investment_basket_v1";

export function Investment() {
  const [companies, setCompanies] = useState<InvestmentCompany[]>([]);
  const [presets, setPresets] = useState<InvestmentPreset[]>([]);
  const [liveSignals, setLiveSignals] = useState<LiveSignal[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQualitySummary | undefined>();
  const [comparisonRows, setComparisonRows] = useState<CompanyComparisonRow[]>([]);
  const [activePresetId, setActivePresetId] = useState("top-momentum");
  const [holdings, setHoldings] = useState<BasketHolding[]>([]);
  const [addCompanyId, setAddCompanyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvestmentData()
      .then((data) => {
        setCompanies(data.companies);
        setPresets(data.presets);
        setLiveSignals(data.liveSignals);
        setDataQuality(data.dataQuality);
        setComparisonRows(data.comparisonRows);
        const saved = restoreBasket(data.companies);
        if (saved.length) {
          setHoldings(saved);
          setActivePresetId("custom");
        } else {
          const firstPreset = data.presets[0];
          setHoldings(firstPreset ? equalWeightHoldings(firstPreset.companyIds) : []);
          setActivePresetId(firstPreset?.id ?? "custom");
        }
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load investment data");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (holdings.length) localStorage.setItem(storageKey, JSON.stringify(holdings));
  }, [holdings]);

  const companiesById = useMemo(() => new Map(companies.map((company) => [company.companyId, company])), [companies]);
  const selectedCompanies = holdings.map((holding) => companiesById.get(holding.companyId)).filter(Boolean) as InvestmentCompany[];
  const weightTotal = holdings.reduce((sum, holding) => sum + holding.weight, 0);
  const normalizedWeights = normalizeWeights(holdings);
  const series = useMemo(() => buildBasketSeries(holdings, companiesById), [companiesById, holdings]);
  const metrics = useMemo(() => buildBasketMetrics(series, holdings, companiesById), [companiesById, holdings, series]);
  const sectorExposure = buildExposure(holdings, companiesById, (company) => company.sector);
  const quadrantExposure = buildExposure(holdings, companiesById, (company) => company.classification);
  const pillarExposure = buildExposure(holdings, companiesById, (company) => company.dominantCategory);
  const highSeverityCount = selectedCompanies.reduce((sum, company) => sum + company.highSeverityAlerts, 0);
  const worstContributor = selectedCompanies.slice().sort((a, b) => b.riskScore - a.riskScore)[0];
  const availableCompanies = companies.filter((company) => !holdings.some((holding) => holding.companyId === company.companyId));

  function loadPreset(preset: InvestmentPreset) {
    setHoldings(equalWeightHoldings(preset.companyIds));
    setActivePresetId(preset.id);
  }

  function resetPreset() {
    const preset = presets.find((item) => item.id === activePresetId) ?? presets[0];
    if (preset) loadPreset(preset);
  }

  function normalizeCurrentWeights() {
    const normalized = normalizedWeights.map((holding) => ({ ...holding, weight: Number(holding.weight.toFixed(2)) }));
    const delta = 100 - normalized.reduce((sum, holding) => sum + holding.weight, 0);
    if (normalized.length) normalized[0] = { ...normalized[0], weight: Number((normalized[0].weight + delta).toFixed(2)) };
    setHoldings(normalized);
    setActivePresetId("custom");
  }

  function addHolding() {
    if (!addCompanyId) return;
    const next = [...holdings, { companyId: addCompanyId, weight: 0 }];
    setHoldings(rebalanceEqual(next));
    setAddCompanyId("");
    setActivePresetId("custom");
  }

  function updateWeight(companyId: string, weight: number) {
    setHoldings((current) => current.map((holding) => (holding.companyId === companyId ? { ...holding, weight: clamp(weight, 0, 100) } : holding)));
    setActivePresetId("custom");
  }

  function removeHolding(companyId: string) {
    setHoldings((current) => rebalanceEqual(current.filter((holding) => holding.companyId !== companyId)));
    setActivePresetId("custom");
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
              Loading investment workspace
            </div>
          ) : error ? (
            <div className="rounded-[18px] border border-broadcast-red/30 bg-red-50 p-4 text-sm text-broadcast-red">{error}</div>
          ) : (
            <>
              <section className="mb-5 rounded-[18px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">Editable basket workspace</p>
                    <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#1d1d1f] sm:text-4xl">Investment</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6e6e73]">
                      Build an ESG momentum basket from engine presets, tune weights, and review performance, exposure, and risk context.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#1d1d1f] px-4 py-3 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#a1a1a6]">Disclaimer</p>
                    <p className="text-xs font-semibold">Decision support only, not investment advice. Backtests use static demo data.</p>
                  </div>
                </div>
              </section>

              <section className="mb-5 grid gap-4 xl:grid-cols-4">
                {presets.map((preset) => (
                  <PresetCard key={preset.id} preset={preset} active={activePresetId === preset.id} onLoad={() => loadPreset(preset)} />
                ))}
              </section>

              <section className="mb-5 grid gap-5 xl:grid-cols-[minmax(360px,0.82fr)_minmax(0,1.18fr)]">
                <Panel title="Editable Basket" caption="Load a preset, add or remove companies, and adjust weights. Charts use normalized weights if total differs from 100%.">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <WeightTotal value={weightTotal} />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="inline-flex h-9 items-center gap-2 rounded-full bg-[#f5f5f7] px-3 text-xs font-bold text-[#1d1d1f] hover:bg-black/10" onClick={normalizeCurrentWeights}>
                        <Scale className="h-3.5 w-3.5" />
                        Normalize
                      </button>
                      <button type="button" className="inline-flex h-9 items-center gap-2 rounded-full bg-[#f5f5f7] px-3 text-xs font-bold text-[#1d1d1f] hover:bg-black/10" onClick={resetPreset}>
                        <RefreshCw className="h-3.5 w-3.5" />
                        Reset preset
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {holdings.map((holding) => {
                      const company = companiesById.get(holding.companyId);
                      if (!company) return null;
                      return (
                        <article key={holding.companyId} className="rounded-2xl bg-[#f8fafc] p-3">
                          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_110px_78px] md:items-center">
                            <button type="button" className="min-w-0 text-left" onClick={() => navigateTo(`/company/${encodeURIComponent(company.companyId)}`)}>
                              <p className="truncate text-sm font-bold text-[#1d1d1f]">{company.name}</p>
                              <p className="mt-1 text-xs text-[#6e6e73]">{company.sgxIdentifier} · {company.sector}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classStyles(company.classification as CompanyClass)}`}>{company.classification}</span>
                                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#424245]">Risk {formatNumber(company.riskScore, 0)}</span>
                              </div>
                            </button>
                            <label className="block">
                              <span className="sr-only">Weight for {company.name}</span>
                              <div className="flex h-10 items-center rounded-xl border border-black/10 bg-white px-2">
                                <input
                                  className="w-full bg-transparent text-right text-sm font-bold outline-none"
                                  min={0}
                                  max={100}
                                  step={0.1}
                                  type="number"
                                  value={holding.weight}
                                  onChange={(event) => updateWeight(holding.companyId, Number(event.target.value))}
                                />
                                <span className="ml-1 text-xs font-semibold text-[#86868b]">%</span>
                              </div>
                            </label>
                            <div className="flex items-center gap-2">
                              <WatchlistHeart companyId={company.companyId} companyName={company.name} />
                              <button
                                type="button"
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#ff3b30] hover:bg-red-50"
                                onClick={() => removeHolding(holding.companyId)}
                                aria-label={`Remove ${company.name}`}
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <label className="relative block">
                      <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#86868b]" />
                      <select
                        className="h-11 w-full appearance-none rounded-xl border border-black/10 bg-[#f8fafc] px-10 pr-9 text-sm font-semibold text-[#1d1d1f] outline-none"
                        value={addCompanyId}
                        onChange={(event) => setAddCompanyId(event.target.value)}
                      >
                        <option value="">Add company</option>
                        {availableCompanies.map((company) => (
                          <option key={company.companyId} value={company.companyId}>
                            {company.name} ({company.sgxIdentifier})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-[#6e6e73]" />
                    </label>
                    <button type="button" className="h-11 rounded-xl bg-[#1d1d1f] px-5 text-sm font-bold text-white disabled:opacity-40" onClick={addHolding} disabled={!addCompanyId}>
                      Add
                    </button>
                  </div>
                </Panel>

                <Panel title="Portfolio Snapshot" caption="Weighted metrics from selected companies and static demo backtest data">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <Metric label="Basket return" value={formatPercent(metrics.basketReturn)} tone={metrics.basketReturn >= metrics.benchmarkReturn ? "#00a99d" : "#ff3b30"} />
                    <Metric label="Benchmark return" value={formatPercent(metrics.benchmarkReturn)} tone="#0071e3" />
                    <Metric label="Sharpe ratio" value={formatNumber(metrics.sharpe, 2)} tone="#00a99d" />
                    <Metric label="Annual volatility" value={formatPercent(metrics.volatility)} tone="#1d1d1f" />
                    <Metric label="Max drawdown" value={formatPercent(metrics.maxDrawdown)} tone="#f59e0b" />
                    <Metric label="Avg ESG / risk" value={`${formatNumber(metrics.averageEsg, 0)} / ${formatNumber(metrics.averageRisk, 0)}`} tone="#1d1d1f" />
                  </div>

                  <div className="mt-5 h-[360px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                        <CartesianGrid stroke="#e5e5ea" />
                        <XAxis dataKey="period" interval={5} tick={{ fill: "#6e6e73", fontSize: 11 }} />
                        <YAxis domain={["dataMin - 4", "dataMax + 4"]} tick={{ fill: "#6e6e73", fontSize: 11 }} width={42} />
                        <Tooltip formatter={(value) => formatNumber(Number(value), 2)} />
                        <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 12 }} />
                        <Area type="monotone" dataKey="basket" name="Momentum basket" stroke="#00a99d" fill="#dff5f1" strokeWidth={3} />
                        <Line type="monotone" dataKey="benchmark" name="Benchmark proxy" stroke="#8e8e93" strokeDasharray="5 4" strokeWidth={2.5} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
              </section>

              <section className="mb-5 grid gap-5 xl:grid-cols-3">
                <ExposurePanel title="Sector Exposure" data={sectorExposure} />
                <ExposurePanel title="Quadrant Exposure" data={quadrantExposure} />
                <ExposurePanel title="ESG Pillar Exposure" data={pillarExposure} />
              </section>

              <section className="mb-5 grid gap-5 xl:grid-cols-[minmax(320px,0.7fr)_minmax(0,1.3fr)]">
                <Panel title="Risk Overlay" caption="Portfolio-level risk context from Risk Radar signals">
                  <div className="grid gap-3">
                    <RiskRow label="High-severity alerts" value={highSeverityCount.toString()} tone={highSeverityCount ? "#ff3b30" : "#00a99d"} />
                    <RiskRow label="Worst contributor" value={worstContributor ? worstContributor.sgxIdentifier : "None"} tone={worstContributor && worstContributor.riskScore >= 60 ? "#ff3b30" : "#f59e0b"} />
                    <RiskRow label="Greenwash proxy exposure" value={formatNumber(weightedAverage(holdings, companiesById, (company) => company.greenwashProxy), 0)} tone="#f59e0b" />
                    <RiskRow label="Weighted momentum" value={formatMomentum(metrics.averageMomentum)} tone={metrics.averageMomentum >= 0 ? "#00a99d" : "#ff3b30"} />
                  </div>
                </Panel>

                <Panel title="Basket Table" caption="Click a company to open its full ESG analysis">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-black/10 text-xs uppercase tracking-[0.08em] text-[#86868b]">
                          <th className="px-3 py-3">Company</th>
                          <th className="px-3 py-3">Weight</th>
                          <th className="px-3 py-3">ESG</th>
                          <th className="px-3 py-3">Momentum</th>
                          <th className="px-3 py-3">Risk</th>
                          <th className="px-3 py-3">Quadrant</th>
                          <th className="px-3 py-3">Sector</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {holdings.map((holding) => {
                          const company = companiesById.get(holding.companyId);
                          if (!company) return null;
                          return (
                            <tr key={holding.companyId} className="cursor-pointer transition hover:bg-[#f8fafc]" onClick={() => navigateTo(`/company/${encodeURIComponent(company.companyId)}`)}>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-3">
                                  <WatchlistHeart companyId={company.companyId} companyName={company.name} size="sm" />
                                  <div className="min-w-0">
                                    <div className="font-bold text-[#1d1d1f]">{company.name}</div>
                                    <div className="text-xs text-[#6e6e73]">{company.sgxIdentifier}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 font-bold">{formatNumber(holding.weight, 1)}%</td>
                              <td className="px-3 py-3">{formatNumber(company.esgScore, 1)}</td>
                              <td className="px-3 py-3">{formatMomentum(company.momentum)}</td>
                              <td className="px-3 py-3">{formatNumber(company.riskScore, 0)}</td>
                              <td className="px-3 py-3">
                                <span className={`inline-flex min-w-32 justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${classStyles(company.classification as CompanyClass)}`}>
                                  {company.classification}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-[#424245]">{company.sector}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </section>

              <ComparePanel rows={comparisonRows} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function PresetCard({ preset, active, onLoad }: { preset: InvestmentPreset; active: boolean; onLoad: () => void }) {
  return (
    <button
      type="button"
      className={`rounded-[18px] p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)] transition hover:-translate-y-0.5 ${
        active ? "bg-[#1d1d1f] text-white" : "bg-white text-[#1d1d1f]"
      }`}
      onClick={onLoad}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-[11px] font-bold uppercase tracking-[0.1em] ${active ? "text-[#a1a1a6]" : "text-[#86868b]"}`}>Preset</p>
          <h2 className="mt-2 text-lg font-bold tracking-[-0.03em]">{preset.name}</h2>
        </div>
        <ArrowUpRight className="h-4 w-4" />
      </div>
      <p className={`mt-2 min-h-10 text-xs leading-5 ${active ? "text-[#d1d1d6]" : "text-[#6e6e73]"}`}>{preset.description}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <PresetStat label="Names" value={preset.companyIds.length.toString()} active={active} />
        <PresetStat label="Avg ESG" value={formatNumber(preset.averageEsg, 0)} active={active} />
        <PresetStat label="Risk" value={preset.riskLevel} active={active} />
      </div>
    </button>
  );
}

function PresetStat({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div className={`rounded-2xl px-3 py-2 ${active ? "bg-white/10" : "bg-[#f8fafc]"}`}>
      <p className={`text-[10px] font-bold uppercase tracking-[0.08em] ${active ? "text-[#a1a1a6]" : "text-[#86868b]"}`}>{label}</p>
      <p className="mt-1 truncate font-bold">{value}</p>
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

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl bg-[#f8fafc] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#86868b]">{label}</p>
      <p className="mt-1 text-lg font-bold tracking-[-0.03em]" style={{ color: tone }}>{value}</p>
    </div>
  );
}

function WeightTotal({ value }: { value: number }) {
  const tone = Math.abs(value - 100) < 0.01 ? "#00a99d" : value > 120 || value < 80 ? "#ff3b30" : "#f59e0b";
  return (
    <div className="rounded-2xl bg-[#f8fafc] px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#86868b]">Weight total</p>
      <p className="mt-1 text-xl font-bold" style={{ color: tone }}>{formatNumber(value, 1)}%</p>
    </div>
  );
}

function ExposurePanel({ title, data }: { title: string; data: Array<{ name: string; value: number }> }) {
  return (
    <Panel title={title} caption="Weighted by current basket allocation">
      <div className="grid gap-4 md:grid-cols-[150px_minmax(0,1fr)] md:items-center xl:grid-cols-1">
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={44} outerRadius={72} paddingAngle={2}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={exposureColor(entry.name, index)} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${formatNumber(Number(value), 1)}%`} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid gap-2">
          {data.map((entry, index) => (
            <div key={entry.name} className="flex items-center justify-between gap-3 rounded-xl bg-[#f8fafc] px-3 py-2 text-xs">
              <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-[#424245]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: exposureColor(entry.name, index) }} />
                <span className="truncate">{entry.name}</span>
              </span>
              <span className="font-bold text-[#1d1d1f]">{formatNumber(entry.value, 1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
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

function restoreBasket(companies: InvestmentCompany[]) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as BasketHolding[];
    const ids = new Set(companies.map((company) => company.companyId));
    return parsed.filter((holding) => ids.has(holding.companyId) && Number.isFinite(holding.weight));
  } catch {
    return [];
  }
}

function equalWeightHoldings(companyIds: string[]) {
  const weight = companyIds.length ? 100 / companyIds.length : 0;
  return companyIds.map((companyId) => ({ companyId, weight: Number(weight.toFixed(2)) }));
}

function rebalanceEqual(holdings: BasketHolding[]) {
  return equalWeightHoldings(holdings.map((holding) => holding.companyId));
}

function normalizeWeights(holdings: BasketHolding[]) {
  const total = holdings.reduce((sum, holding) => sum + holding.weight, 0);
  if (!total) return equalWeightHoldings(holdings.map((holding) => holding.companyId));
  return holdings.map((holding) => ({ ...holding, weight: (holding.weight / total) * 100 }));
}

function buildBasketSeries(holdings: BasketHolding[], companiesById: Map<string, InvestmentCompany>) {
  const normalized = normalizeWeights(holdings);
  const profiles = normalized
    .map((holding) => ({ holding, profile: companiesById.get(holding.companyId)?.financialProfile }))
    .filter((item) => item.profile?.backtest_history?.length);
  const length = Math.min(...profiles.map((item) => item.profile?.backtest_history?.length ?? 0));
  if (!profiles.length || !Number.isFinite(length)) return [];

  return Array.from({ length }, (_, index) => {
    const basket = profiles.reduce((sum, item) => sum + (item.profile?.backtest_history?.[index]?.signal_index ?? 100) * (item.holding.weight / 100), 0);
    const benchmark = profiles.reduce((sum, item) => sum + (item.profile?.backtest_history?.[index]?.benchmark_index ?? 100) * (item.holding.weight / 100), 0);
    return {
      period: index === 0 ? "Start" : `M${index}`,
      basket,
      benchmark,
    };
  });
}

function buildBasketMetrics(series: ReturnType<typeof buildBasketSeries>, holdings: BasketHolding[], companiesById: Map<string, InvestmentCompany>): BasketMetrics {
  if (series.length < 2) {
    return { basketReturn: 0, benchmarkReturn: 0, sharpe: 0, volatility: 0, maxDrawdown: 0, averageEsg: 0, averageMomentum: 0, averageRisk: 0 };
  }
  const first = series[0];
  const last = series[series.length - 1];
  const returns = series.slice(1).map((point, index) => point.basket / series[index].basket - 1);
  const averageReturn = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - averageReturn) ** 2, 0) / returns.length;
  const monthlyVolatility = Math.sqrt(variance);
  const annualizedVolatility = monthlyVolatility * Math.sqrt(12);
  const sharpe = annualizedVolatility ? (averageReturn * 12) / annualizedVolatility : 0;
  return {
    basketReturn: last.basket / first.basket - 1,
    benchmarkReturn: last.benchmark / first.benchmark - 1,
    sharpe,
    volatility: annualizedVolatility,
    maxDrawdown: maxDrawdown(series.map((point) => point.basket)),
    averageEsg: weightedAverage(holdings, companiesById, (company) => company.esgScore),
    averageMomentum: weightedAverage(holdings, companiesById, (company) => company.momentum),
    averageRisk: weightedAverage(holdings, companiesById, (company) => company.riskScore),
  };
}

function weightedAverage(holdings: BasketHolding[], companiesById: Map<string, InvestmentCompany>, getValue: (company: InvestmentCompany) => number) {
  return normalizeWeights(holdings).reduce((sum, holding) => {
    const company = companiesById.get(holding.companyId);
    return sum + (company ? getValue(company) * (holding.weight / 100) : 0);
  }, 0);
}

function buildExposure(holdings: BasketHolding[], companiesById: Map<string, InvestmentCompany>, getKey: (company: InvestmentCompany) => string) {
  const values = normalizeWeights(holdings).reduce<Record<string, number>>((accumulator, holding) => {
    const company = companiesById.get(holding.companyId);
    if (!company) return accumulator;
    const key = getKey(company);
    accumulator[key] = (accumulator[key] ?? 0) + holding.weight;
    return accumulator;
  }, {});
  return Object.entries(values)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function maxDrawdown(values: number[]) {
  let peak = values[0] ?? 0;
  let worst = 0;
  values.forEach((value) => {
    peak = Math.max(peak, value);
    if (peak > 0) worst = Math.min(worst, value / peak - 1);
  });
  return worst;
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value * 100, 1)}%`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function exposureColor(name: string, index: number) {
  if (name === "Environmental" || name === "Social" || name === "Governance") return categoryColor(name as EsgCategory);
  if (["Hidden Winners", "Future Leaders", "Value Traps", "Overrated Leaders"].includes(name)) return classColor(name as CompanyClass);
  const colors = ["#00a99d", "#0071e3", "#f59e0b", "#ff3b30", "#8b5cf6", "#64748b", "#14b8a6"];
  return colors[index % colors.length];
}
