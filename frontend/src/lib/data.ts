import { classificationThresholds, classifyCompany, periodTime } from "./analytics";
import { buildComparisonRows, buildDataQualitySummary, buildInvestorBrief, buildReviewItems } from "./research";
import type {
  CompanyComparisonRow,
  Company,
  CompanyDetailData,
  DashboardCompany,
  DataQualitySummary,
  EsgCategory,
  EsgDatasetRow,
  EsgSignal,
  FinancialProfile,
  InvestmentCompany,
  InvestmentData,
  InvestmentPreset,
  LiveSignal,
  RiskAlert,
  RiskRadarCompany,
  RiskRadarData,
  RiskSeverity,
  ResearchReviewItem,
  TrendRow,
  WatchlistCompany,
  WatchlistData,
  WatchlistUpdate,
} from "../types/esg";

export interface DashboardData {
  companies: DashboardCompany[];
  periods: string[];
  sectors: string[];
  liveSignals: LiveSignal[];
  dataQuality: DataQualitySummary;
  reviewItems: ResearchReviewItem[];
  comparisonRows: CompanyComparisonRow[];
}

interface BaseDashboardData {
  companies: DashboardCompany[];
  periods: string[];
  sectors: string[];
  liveSignals: LiveSignal[];
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}`);
  }
  return response.json() as Promise<T>;
}

function dominantCategory(row: EsgDatasetRow | undefined) {
  const categories = row?.category_breakdown ?? [];
  if (!categories.length) return "Environmental";
  return categories.slice().sort((a, b) => b.score - a.score)[0].esg_category;
}

async function loadRawEsgData() {
  const [companies, dataset, trends, signals, financialProfiles] = await Promise.all([
    fetchJson<Company[]>("/data/companies.json"),
    fetchJson<EsgDatasetRow[]>("/data/structured_esg_dataset.json"),
    fetchJson<TrendRow[]>("/data/trend_output.json"),
    fetchJson<EsgSignal[]>("/data/structured_esg_signals.json"),
    fetchJson<FinancialProfile[]>("/data/financial_profiles.json").catch(() => []),
  ]);

  return { companies, dataset, trends, signals, financialProfiles };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function severityRank(severity: RiskSeverity) {
  if (severity === "High") return 0;
  if (severity === "Medium") return 1;
  return 2;
}

function buildDashboardData(companies: Company[], dataset: EsgDatasetRow[], trends: TrendRow[], signals: EsgSignal[]): BaseDashboardData {

  const companyById = new Map(companies.map((company) => [company.company_id, company]));
  const datasetByCompany = new Map(dataset.map((row) => [row.company_id, row]));
  const trendsByCompany = trends.reduce<Map<string, TrendRow[]>>((map, row) => {
    const rows = map.get(row.company_id) ?? [];
    rows.push(row);
    map.set(row.company_id, rows);
    return map;
  }, new Map());

  const periods = Array.from(new Set(trends.map((row) => row.period))).sort((a, b) => periodTime(b) - periodTime(a));

  const dashboardCompanies = companies
    .map((company) => {
      const datasetRow = datasetByCompany.get(company.company_id);
      const companyTrends = (trendsByCompany.get(company.company_id) ?? []).slice().sort((a, b) => periodTime(b.period) - periodTime(a.period));
      const latestTrend = companyTrends[0];
      const momentumByPeriod = companyTrends.reduce<Record<string, number>>((values, trend) => {
        values[trend.period] = trend.total_signal_score;
        return values;
      }, {});

      return {
        companyId: company.company_id,
        rank: 0,
        name: company.name,
        sector: company.sector,
        sgxIdentifier: company.sgx_identifier,
        esgScore: company.initial_esg_score,
        momentum: datasetRow?.total_signal_score ?? latestTrend?.total_signal_score ?? 0,
        momentumByPeriod,
        confidence: datasetRow?.average_confidence ?? 0,
        signalCount: datasetRow?.total_signal_count ?? 0,
        latestPeriod: latestTrend?.period ?? periods[0] ?? "Latest",
        dominantCategory: dominantCategory(datasetRow),
      };
    })
    .sort((a, b) => b.momentum - a.momentum)
    .map((company, index) => ({ ...company, rank: index + 1 }));

  return {
    companies: dashboardCompanies,
    periods,
    sectors: Array.from(new Set(dashboardCompanies.map((company) => company.sector))).sort(),
    liveSignals: signals
      .slice()
      .sort((a, b) => {
        const dateCompare = new Date(b.published_date).getTime() - new Date(a.published_date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return b.confidence * Math.abs(b.weighted_signal_score) - a.confidence * Math.abs(a.weighted_signal_score);
      })
      .slice(0, 14)
      .map((signal) => {
        const company = companyById.get(signal.company_id);
        return {
          id: signal.signal_id,
          companyName: company?.name ?? signal.company_id,
          sgxIdentifier: company?.sgx_identifier ?? signal.company_id,
          category: signal.esg_category,
          direction: signal.signal_direction,
          impact: signal.weighted_signal_score,
          summary: signal.evidence_summary,
        };
      }),
  };
}

export async function loadDashboardData(): Promise<DashboardData> {
  const { companies, dataset, trends, signals, financialProfiles } = await loadRawEsgData();
  const dashboardData = buildDashboardData(companies, dataset, trends, signals);
  const riskCompanies = buildRiskRadarCompanies(dashboardData.companies, trends, signals, financialProfiles);
  const riskAlerts = buildRiskAlerts(riskCompanies, signals);
  return {
    ...dashboardData,
    dataQuality: buildDataQualitySummary(dashboardData.companies, dataset, trends, signals, financialProfiles),
    reviewItems: buildReviewItems(riskCompanies, riskAlerts, signals),
    comparisonRows: buildComparisonRows(riskCompanies, financialProfiles),
  };
}

function buildRiskRadarCompanies(
  dashboardCompanies: DashboardCompany[],
  trends: TrendRow[],
  signals: EsgSignal[],
  financialProfiles: FinancialProfile[],
): RiskRadarCompany[] {
  const thresholds = classificationThresholds(dashboardCompanies);
  const signalsByCompany = signals.reduce<Map<string, EsgSignal[]>>((map, signal) => {
    const rows = map.get(signal.company_id) ?? [];
    rows.push(signal);
    map.set(signal.company_id, rows);
    return map;
  }, new Map());
  const trendsByCompany = trends.reduce<Map<string, TrendRow[]>>((map, trend) => {
    const rows = map.get(trend.company_id) ?? [];
    rows.push(trend);
    map.set(trend.company_id, rows);
    return map;
  }, new Map());
  const financialByCompany = new Map(financialProfiles.map((profile) => [profile.company_id, profile]));

  return dashboardCompanies.map((company) => {
    const companySignals = signalsByCompany.get(company.companyId) ?? [];
    const companyTrends = (trendsByCompany.get(company.companyId) ?? []).slice().sort((a, b) => periodTime(a.period) - periodTime(b.period));
    const negativeSignals = companySignals.filter((signal) => signal.weighted_signal_score < 0);
    const positiveScore = companySignals.filter((signal) => signal.weighted_signal_score > 0).reduce((sum, signal) => sum + signal.weighted_signal_score, 0);
    const negativeEvidenceScore = negativeSignals.reduce((sum, signal) => sum + Math.abs(signal.weighted_signal_score), 0);
    const governanceFlagCount = negativeSignals.filter((signal) => signal.esg_category === "Governance").length;
    const latest = companyTrends[companyTrends.length - 1];
    const previous = companyTrends[companyTrends.length - 2];
    const latestDelta = latest && previous ? latest.total_signal_score - previous.total_signal_score : 0;
    const classification = classifyCompany(company, thresholds.esgThreshold, thresholds.momentumThreshold);
    const classRisk = classification === "Overrated Leaders" ? 18 : classification === "Value Traps" ? 16 : 0;
    const greenwashProxy = clamp(
      22 +
        negativeEvidenceScore * 15 +
        governanceFlagCount * 7 +
        (positiveScore > 2 && negativeEvidenceScore > 0.7 ? 16 : 0) +
        Math.max(0, -latestDelta) * 8 -
        company.confidence * 8,
      0,
      100,
    );
    const riskScore = clamp(
      negativeEvidenceScore * 20 +
        negativeSignals.length * 6 +
        governanceFlagCount * 9 +
        Math.max(0, -latestDelta) * 10 +
        Math.max(0, -company.momentum) * 4 +
        greenwashProxy * 0.25 +
        classRisk,
      0,
      100,
    );

    return {
      companyId: company.companyId,
      name: company.name,
      sector: company.sector,
      sgxIdentifier: company.sgxIdentifier,
      esgScore: company.esgScore,
      momentum: company.momentum,
      classification,
      dominantCategory: company.dominantCategory,
      riskScore,
      greenwashProxy,
      negativeSignalCount: negativeSignals.length,
      negativeEvidenceScore,
      governanceFlagCount,
      latestDelta,
      confidence: company.confidence,
      signalCount: company.signalCount,
      marketCapM: financialByCompany.get(company.companyId)?.market_cap_m,
    };
  });
}

function buildRiskAlerts(companies: RiskRadarCompany[], signals: EsgSignal[]): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  const companyById = new Map(companies.map((company) => [company.companyId, company]));
  const signalsByCompany = signals.reduce<Map<string, EsgSignal[]>>((map, signal) => {
    const rows = map.get(signal.company_id) ?? [];
    rows.push(signal);
    map.set(signal.company_id, rows);
    return map;
  }, new Map());

  function addAlert(company: RiskRadarCompany, alert: Omit<RiskAlert, "companyId" | "companyName" | "sgxIdentifier" | "sector" | "confidence">) {
    alerts.push({
      ...alert,
      companyId: company.companyId,
      companyName: company.name,
      sgxIdentifier: company.sgxIdentifier,
      sector: company.sector,
      confidence: company.confidence,
    });
  }

  companies.forEach((company) => {
    const companySignals = signalsByCompany.get(company.companyId) ?? [];
    const negativeSignals = companySignals
      .filter((signal) => signal.weighted_signal_score < 0)
      .sort((a, b) => Math.abs(b.weighted_signal_score) - Math.abs(a.weighted_signal_score));
    const governanceSignals = negativeSignals.filter((signal) => signal.esg_category === "Governance");
    const topNegative = negativeSignals[0];

    if (company.negativeSignalCount >= 3 || company.negativeEvidenceScore >= 1.2) {
      addAlert(company, {
        id: `${company.companyId}-negative-spike`,
        severity: company.negativeEvidenceScore >= 2 || company.negativeSignalCount >= 4 ? "High" : "Medium",
        type: "Negative evidence spike",
        category: topNegative?.esg_category ?? company.dominantCategory,
        riskScore: company.riskScore,
        evidenceSummary: topNegative?.evidence_summary,
        description: `${company.negativeSignalCount} negative evidence signals carry a combined impact of ${company.negativeEvidenceScore.toFixed(2)}. Review the underlying evidence before relying on the ESG narrative.`,
      });
    }

    if (governanceSignals.length && governanceSignals.some((signal) => signal.confidence >= 0.7)) {
      addAlert(company, {
        id: `${company.companyId}-governance-red-flag`,
        severity: governanceSignals.length >= 2 || governanceSignals.some((signal) => Math.abs(signal.weighted_signal_score) >= 0.5) ? "High" : "Medium",
        type: "Governance red flag",
        category: "Governance",
        riskScore: company.riskScore,
        evidenceSummary: governanceSignals[0].evidence_summary,
        description: `${governanceSignals.length} high-confidence governance risk signal${governanceSignals.length === 1 ? "" : "s"} appeared in the current evidence set. Investigate board, compliance, or disclosure quality before allocation review.`,
      });
    }

    if (company.latestDelta <= -0.5 || company.momentum < 0) {
      addAlert(company, {
        id: `${company.companyId}-momentum-reversal`,
        severity: company.latestDelta <= -1 || company.momentum < 0 ? "High" : "Medium",
        type: "Momentum reversal",
        category: "Momentum",
        riskScore: company.riskScore,
        description: `Latest ESG momentum delta is ${company.latestDelta.toFixed(2)} while total momentum is ${company.momentum.toFixed(2)}. Watch for a stalling improvement story.`,
      });
    }

    if (company.classification === "Overrated Leaders") {
      addAlert(company, {
        id: `${company.companyId}-overrated-leader-risk`,
        severity: company.momentum < 0 || company.riskScore >= 55 ? "High" : "Medium",
        type: "Overrated leader risk",
        category: "Momentum",
        riskScore: company.riskScore,
        description: `ESG score is high, but momentum does not confirm the label. Review whether the current score is still supported by fresh evidence.`,
      });
    }

    if (company.classification === "Value Traps") {
      addAlert(company, {
        id: `${company.companyId}-value-trap-risk`,
        severity: company.negativeSignalCount >= 2 || company.riskScore >= 55 ? "High" : "Medium",
        type: "Value trap risk",
        category: company.dominantCategory,
        riskScore: company.riskScore,
        description: `Low ESG score and weak momentum place this company in a structural risk quadrant. Review whether the evidence indicates improvement or continuing pressure.`,
      });
    }

    if (company.signalCount >= 6 && company.confidence < 0.65) {
      addAlert(company, {
        id: `${company.companyId}-confidence-risk`,
        severity: "Low",
        type: "Evidence confidence risk",
        category: "Confidence",
        riskScore: company.riskScore,
        description: `The company has ${company.signalCount} signals, but average confidence is only ${(company.confidence * 100).toFixed(0)}%. Treat the risk picture as needing corroboration.`,
      });
    }

    if (company.greenwashProxy >= 55) {
      addAlert(company, {
        id: `${company.companyId}-greenwash-proxy`,
        severity: company.greenwashProxy >= 70 ? "High" : "Medium",
        type: "Greenwash proxy",
        category: "Greenwash Proxy",
        riskScore: company.riskScore,
        evidenceSummary: topNegative?.evidence_summary,
        description: `Positive ESG narrative and conflicting evidence are both elevated. This is a proxy flag only, not a finding of greenwashing.`,
      });
    }
  });

  return alerts
    .filter((alert) => companyById.has(alert.companyId))
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || b.riskScore - a.riskScore);
}

export async function loadRiskRadarData(): Promise<RiskRadarData> {
  const { companies, dataset, trends, signals, financialProfiles } = await loadRawEsgData();
  const dashboardData = buildDashboardData(companies, dataset, trends, signals);
  const riskCompanies = buildRiskRadarCompanies(dashboardData.companies, trends, signals, financialProfiles).sort((a, b) => b.riskScore - a.riskScore);

  return {
    companies: riskCompanies,
    alerts: buildRiskAlerts(riskCompanies, signals),
    sectors: dashboardData.sectors,
    liveSignals: dashboardData.liveSignals,
    dataQuality: buildDataQualitySummary(dashboardData.companies, dataset, trends, signals, financialProfiles),
    comparisonRows: buildComparisonRows(riskCompanies, financialProfiles),
  };
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function presetRiskLevel(companies: InvestmentCompany[]): RiskSeverity {
  const averageRisk = average(companies.map((company) => company.riskScore));
  const highAlertCount = companies.reduce((sum, company) => sum + company.highSeverityAlerts, 0);
  if (averageRisk >= 60 || highAlertCount >= 3) return "High";
  if (averageRisk >= 35 || highAlertCount > 0) return "Medium";
  return "Low";
}

function buildInvestmentPreset(id: string, name: string, description: string, companyIds: string[], companiesById: Map<string, InvestmentCompany>): InvestmentPreset {
  const selectedCompanies = companyIds.map((companyId) => companiesById.get(companyId)).filter(Boolean) as InvestmentCompany[];
  return {
    id,
    name,
    description,
    companyIds: selectedCompanies.map((company) => company.companyId),
    averageEsg: average(selectedCompanies.map((company) => company.esgScore)),
    averageMomentum: average(selectedCompanies.map((company) => company.momentum)),
    riskLevel: presetRiskLevel(selectedCompanies),
  };
}

function buildInvestmentPresets(companies: InvestmentCompany[]): InvestmentPreset[] {
  const companiesById = new Map(companies.map((company) => [company.companyId, company]));
  const lowSevereRisk = companies.filter((company) => company.highSeverityAlerts === 0);
  const topMomentum = (lowSevereRisk.length >= 4 ? lowSevereRisk : companies)
    .slice()
    .sort((a, b) => b.momentum - a.momentum)
    .slice(0, 5)
    .map((company) => company.companyId);
  const hiddenWinners = companies
    .filter((company) => company.classification === "Hidden Winners")
    .sort((a, b) => b.momentum - a.momentum)
    .slice(0, 5)
    .map((company) => company.companyId);
  const futureLeaders = companies
    .filter((company) => company.classification === "Future Leaders")
    .sort((a, b) => b.esgScore + b.momentum - (a.esgScore + a.momentum))
    .slice(0, 5)
    .map((company) => company.companyId);
  const lowRiskEsg = companies
    .filter((company) => company.momentum >= 0)
    .sort((a, b) => a.riskScore - b.riskScore || b.esgScore - a.esgScore)
    .slice(0, 5)
    .map((company) => company.companyId);

  return [
    buildInvestmentPreset("top-momentum", "Top Momentum", "Highest ESG momentum names with severe risk filtered where possible.", topMomentum, companiesById),
    buildInvestmentPreset("hidden-winners", "Hidden Winners", "Lower current ESG score, but improving faster than the market has priced.", hiddenWinners, companiesById),
    buildInvestmentPreset("future-leaders", "Future Leaders", "High ESG base with positive momentum and quality-compounder characteristics.", futureLeaders, companiesById),
    buildInvestmentPreset("low-risk-esg", "Low Risk ESG", "Stronger ESG profile with lower computed risk pressure and positive momentum.", lowRiskEsg, companiesById),
  ];
}

export async function loadInvestmentData(): Promise<InvestmentData> {
  const { companies, dataset, trends, signals, financialProfiles } = await loadRawEsgData();
  const dashboardData = buildDashboardData(companies, dataset, trends, signals);
  const riskCompanies = buildRiskRadarCompanies(dashboardData.companies, trends, signals, financialProfiles);
  const riskAlerts = buildRiskAlerts(riskCompanies, signals);
  const financialByCompany = new Map(financialProfiles.map((profile) => [profile.company_id, profile]));
  const highAlertsByCompany = riskAlerts.reduce<Record<string, number>>((counts, alert) => {
    if (alert.severity === "High") counts[alert.companyId] = (counts[alert.companyId] ?? 0) + 1;
    return counts;
  }, {});

  const investmentCompanies = riskCompanies
    .map<InvestmentCompany>((company) => ({
      companyId: company.companyId,
      name: company.name,
      sector: company.sector,
      sgxIdentifier: company.sgxIdentifier,
      esgScore: company.esgScore,
      momentum: company.momentum,
      classification: company.classification,
      dominantCategory: company.dominantCategory,
      riskScore: company.riskScore,
      greenwashProxy: company.greenwashProxy,
      highSeverityAlerts: highAlertsByCompany[company.companyId] ?? 0,
      financialProfile: financialByCompany.get(company.companyId),
    }))
    .sort((a, b) => b.momentum - a.momentum);

  return {
    companies: investmentCompanies,
    presets: buildInvestmentPresets(investmentCompanies),
    liveSignals: dashboardData.liveSignals,
    dataQuality: buildDataQualitySummary(dashboardData.companies, dataset, trends, signals, financialProfiles),
    comparisonRows: buildComparisonRows(riskCompanies, financialProfiles),
  };
}

export async function loadWatchlistData(): Promise<WatchlistData> {
  const { companies, dataset, trends, signals, financialProfiles } = await loadRawEsgData();
  const dashboardData = buildDashboardData(companies, dataset, trends, signals);
  const riskCompanies = buildRiskRadarCompanies(dashboardData.companies, trends, signals, financialProfiles);
  const riskAlerts = buildRiskAlerts(riskCompanies, signals);
  const dashboardById = new Map(dashboardData.companies.map((company) => [company.companyId, company]));
  const highAlertsByCompany = riskAlerts.reduce<Record<string, number>>((counts, alert) => {
    if (alert.severity === "High") counts[alert.companyId] = (counts[alert.companyId] ?? 0) + 1;
    return counts;
  }, {});

  const watchlistCompanies = riskCompanies
    .map<WatchlistCompany>((company) => ({
      companyId: company.companyId,
      name: company.name,
      sector: company.sector,
      sgxIdentifier: company.sgxIdentifier,
      esgScore: company.esgScore,
      momentum: company.momentum,
      classification: company.classification,
      dominantCategory: company.dominantCategory,
      riskScore: company.riskScore,
      highSeverityAlerts: highAlertsByCompany[company.companyId] ?? 0,
      latestSignalDate: latestSignalDate(company.companyId, signals),
      followUpStatus: watchlistFollowUpStatus(company, highAlertsByCompany[company.companyId] ?? 0, latestSignalDate(company.companyId, signals)),
    }))
    .sort((a, b) => b.riskScore - a.riskScore || b.momentum - a.momentum);

  const updates = signals
    .map<WatchlistUpdate | null>((signal) => {
      const company = dashboardById.get(signal.company_id);
      if (!company) return null;
      return {
        id: signal.signal_id,
        companyId: company.companyId,
        companyName: company.name,
        sgxIdentifier: company.sgxIdentifier,
        sector: company.sector,
        category: signal.esg_category,
        direction: signal.signal_direction,
        impact: signal.weighted_signal_score,
        confidence: signal.confidence,
        publishedDate: signal.published_date,
        summary: signal.evidence_summary,
        sourcePlatform: signal.source_platform,
        url: signal.clickable_url ?? signal.url,
      };
    })
    .filter((update): update is WatchlistUpdate => Boolean(update))
    .sort((a, b) => {
      const dateCompare = new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
      if (dateCompare !== 0) return dateCompare;
      const impactCompare = Math.abs(b.impact) - Math.abs(a.impact);
      if (impactCompare !== 0) return impactCompare;
      return b.confidence - a.confidence;
    }) as WatchlistUpdate[];

  return {
    companies: watchlistCompanies,
    updates,
    liveSignals: dashboardData.liveSignals,
    dataQuality: buildDataQualitySummary(dashboardData.companies, dataset, trends, signals, financialProfiles),
    comparisonRows: buildComparisonRows(riskCompanies, financialProfiles),
  };
}

export async function loadCompanyDetailData(companyId: string): Promise<CompanyDetailData | null> {
  const { companies, dataset, trends, signals, financialProfiles } = await loadRawEsgData();
  const dashboardData = buildDashboardData(companies, dataset, trends, signals);
  const company = dashboardData.companies.find((row) => row.companyId === companyId);
  const riskCompanies = buildRiskRadarCompanies(dashboardData.companies, trends, signals, financialProfiles);
  const riskCompany = riskCompanies.find((row) => row.companyId === companyId);

  if (!company) return null;

  const companySignals = signals
    .filter((signal) => signal.company_id === companyId)
    .sort((a, b) => {
      const dateCompare = new Date(b.published_date).getTime() - new Date(a.published_date).getTime();
      if (dateCompare !== 0) return dateCompare;
      const confidenceCompare = b.confidence - a.confidence;
      if (confidenceCompare !== 0) return confidenceCompare;
      return Math.abs(b.weighted_signal_score) - Math.abs(a.weighted_signal_score);
    });
  const thresholds = classificationThresholds(dashboardData.companies);
  const classification = classifyCompany(company, thresholds.esgThreshold, thresholds.momentumThreshold);

  return {
    company,
    datasetRow: dataset.find((row) => row.company_id === companyId),
    trends: trends.filter((row) => row.company_id === companyId).sort((a, b) => periodTime(a.period) - periodTime(b.period)),
    signals: companySignals,
    allCompanies: dashboardData.companies,
    financialProfile: financialProfiles.find((profile) => profile.company_id === companyId),
    allFinancialProfiles: financialProfiles,
    liveSignals: dashboardData.liveSignals,
    dataQuality: buildDataQualitySummary(dashboardData.companies, dataset, trends, signals, financialProfiles),
    investorBrief: buildInvestorBrief(company, classification, companySignals, dashboardData.companies, riskCompany),
    comparisonRows: buildComparisonRows(riskCompanies, financialProfiles),
  };
}

function latestSignalDate(companyId: string, signals: EsgSignal[]) {
  return (
    signals
      .filter((signal) => signal.company_id === companyId)
      .sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime())[0]?.published_date ?? ""
  );
}

function watchlistFollowUpStatus(company: RiskRadarCompany, highSeverityAlerts: number, latestDate: string): WatchlistCompany["followUpStatus"] {
  const days = latestDate ? Math.round((Date.now() - new Date(latestDate).getTime()) / 86400000) : 999;
  if (days <= 45) return "New evidence";
  if (highSeverityAlerts > 0 || company.riskScore >= 60) return "Risk changed";
  return "No new update";
}
