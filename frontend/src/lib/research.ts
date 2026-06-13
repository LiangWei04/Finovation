import { classColor, type CompanyClass } from "./analytics";
import { formatMomentum, formatNumber } from "./format";
import type {
  CompanyComparisonRow,
  ConfidenceTier,
  DashboardCompany,
  DataQualitySummary,
  EsgCategory,
  EsgDatasetRow,
  EsgSignal,
  FinancialProfile,
  InvestorBrief,
  ResearchReviewItem,
  RiskAlert,
  RiskRadarCompany,
  TrendRow,
} from "../types/esg";

export function confidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 0.75) return "High";
  if (confidence >= 0.6) return "Medium";
  return "Low";
}

export function confidenceTone(tier: ConfidenceTier) {
  if (tier === "High") return "#00a99d";
  if (tier === "Medium") return "#f59e0b";
  return "#ff3b30";
}

export function confidenceDescription(confidence: number) {
  const tier = confidenceTier(confidence);
  if (tier === "High") return "Evidence is consistent enough to support review without immediate corroboration.";
  if (tier === "Medium") return "Evidence is useful, but investors should corroborate key claims before relying on it.";
  return "Evidence is thin or uncertain; treat the signal as a prompt for deeper investigation.";
}

export function evidenceFreshness(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Unknown freshness";
  const days = Math.max(0, Math.round((Date.now() - parsed.getTime()) / 86400000));
  if (days === 0) return "Updated today";
  if (days === 1) return "Updated 1 day ago";
  if (days < 45) return `Updated ${days} days ago`;
  return `Stale: ${days} days old`;
}

export function buildDataQualitySummary(
  companies: DashboardCompany[],
  dataset: EsgDatasetRow[],
  trends: TrendRow[],
  signals: EsgSignal[],
  financialProfiles: FinancialProfile[],
): DataQualitySummary {
  const latestSignal = signals
    .slice()
    .sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime())[0];
  const periods = Array.from(new Set(trends.map((trend) => trend.period))).sort().reverse();
  const sourceCount = dataset.reduce((sum, row) => sum + row.source_count, 0);
  const averageConfidence = dataset.length ? dataset.reduce((sum, row) => sum + row.average_confidence, 0) / dataset.length : 0;
  const tier = confidenceTier(averageConfidence);

  return {
    companyCount: companies.length,
    signalCount: signals.length,
    sourceCount,
    averageConfidence,
    confidenceTier: tier,
    latestSignalDate: latestSignal?.published_date ?? "",
    latestPeriod: periods[0] ?? "Latest",
    financialProfileCount: financialProfiles.length,
    methodologyMetrics: [
      {
        label: "ESG score",
        value: "0-100",
        description: "Company baseline score used with momentum to place companies into the ESG Momentum Matrix.",
      },
      {
        label: "Momentum",
        value: "Signal-weighted",
        description: "Weighted evidence score from recent ESG signals; positive values indicate improving evidence flow.",
      },
      {
        label: "Risk score",
        value: "0-100",
        description: "Composite risk pressure from negative evidence, governance flags, momentum reversal, and conflict proxy.",
      },
      {
        label: "Confidence",
        value: `${formatNumber(averageConfidence * 100, 0)}%`,
        description: "Average evidence confidence. Use low-confidence items as review prompts, not conclusions.",
      },
    ],
  };
}

export function buildComparisonRows(riskCompanies: RiskRadarCompany[], financialProfiles: FinancialProfile[]): CompanyComparisonRow[] {
  const financialByCompany = new Map(financialProfiles.map((profile) => [profile.company_id, profile]));
  return riskCompanies
    .map((company) => ({
      companyId: company.companyId,
      name: company.name,
      sgxIdentifier: company.sgxIdentifier,
      sector: company.sector,
      esgScore: company.esgScore,
      momentum: company.momentum,
      riskScore: company.riskScore,
      valuationPe: financialByCompany.get(company.companyId)?.valuation.pe,
      confidence: company.confidence,
      evidenceCount: company.signalCount,
      dominantCategory: company.dominantCategory,
      classification: company.classification,
    }))
    .sort((a, b) => b.momentum - a.momentum);
}

export function buildReviewItems(companies: RiskRadarCompany[], alerts: RiskAlert[], signals: EsgSignal[]): ResearchReviewItem[] {
  const alertsByCompany = alerts.reduce<Map<string, RiskAlert[]>>((map, alert) => {
    const rows = map.get(alert.companyId) ?? [];
    rows.push(alert);
    map.set(alert.companyId, rows);
    return map;
  }, new Map());
  const signalsByCompany = signals.reduce<Map<string, EsgSignal[]>>((map, signal) => {
    const rows = map.get(signal.company_id) ?? [];
    rows.push(signal);
    map.set(signal.company_id, rows);
    return map;
  }, new Map());

  return companies
    .map((company) => {
      const companyAlerts = alertsByCompany.get(company.companyId) ?? [];
      const companySignals = (signalsByCompany.get(company.companyId) ?? []).slice().sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());
      const latestSignal = companySignals[0];
      const highAlertCount = companyAlerts.filter((alert) => alert.severity === "High").length;
      const priority = Math.round(company.riskScore + company.negativeSignalCount * 8 + highAlertCount * 12 + Math.max(0, company.momentum) * 3 + (1 - company.confidence) * 10);
      const topAlert = companyAlerts[0];

      return {
        companyId: company.companyId,
        name: company.name,
        sgxIdentifier: company.sgxIdentifier,
        sector: company.sector,
        classification: company.classification,
        priority,
        confidence: company.confidence,
        confidenceTier: confidenceTier(company.confidence),
        latestSignalDate: latestSignal?.published_date ?? "",
        latestChange: latestSignal ? `${latestSignal.esg_category} ${latestSignal.signal_direction} signal: ${formatMomentum(latestSignal.weighted_signal_score)}` : "No recent evidence signal",
        topRisk: topAlert?.type ?? (company.negativeSignalCount ? "Negative evidence concentration" : "No major risk flag"),
        reviewReason: topAlert?.description ?? quadrantReviewReason(company.classification as CompanyClass),
        riskScore: company.riskScore,
        evidenceCount: company.signalCount,
        negativeSignalCount: company.negativeSignalCount,
      };
    })
    .sort((a, b) => b.priority - a.priority);
}

export function buildInvestorBrief(
  company: DashboardCompany,
  classification: CompanyClass,
  signals: EsgSignal[],
  allCompanies: DashboardCompany[],
  riskCompany?: RiskRadarCompany,
): InvestorBrief {
  const positiveSignals = signals.filter((signal) => signal.weighted_signal_score > 0).sort((a, b) => b.weighted_signal_score - a.weighted_signal_score);
  const negativeSignals = signals.filter((signal) => signal.weighted_signal_score < 0).sort((a, b) => a.weighted_signal_score - b.weighted_signal_score);
  const latestSignal = signals.slice().sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime())[0];
  const sameSector = allCompanies.filter((peer) => peer.sector === company.sector && peer.companyId !== company.companyId);
  const peerAverageEsg = sameSector.length ? sameSector.reduce((sum, peer) => sum + peer.esgScore, 0) / sameSector.length : average(allCompanies.map((peer) => peer.esgScore));
  const peerContext = company.esgScore >= peerAverageEsg + 2 ? "above peer ESG baseline" : company.esgScore <= peerAverageEsg - 2 ? "below peer ESG baseline" : "in line with peer ESG baseline";
  const topOpportunity = positiveSignals[0];
  const topRisk = negativeSignals[0];
  const tier = confidenceTier(company.confidence);
  const materialPillar = company.dominantCategory;

  return {
    thesisSnapshot: `${company.name} is classified as ${classification}, with ESG momentum of ${formatMomentum(company.momentum)} and a ${tier.toLowerCase()} evidence-confidence profile.`,
    topOpportunity: topOpportunity ? `${topOpportunity.esg_category}: ${topOpportunity.evidence_summary}` : "No positive evidence signal is dominant in the current dataset.",
    topRisk: topRisk ? `${topRisk.esg_category}: ${topRisk.evidence_summary}` : "No negative evidence concentration appears in the current dataset.",
    confidenceTier: tier,
    materialPillar,
    latestEvidenceChange: latestSignal ? `${latestSignal.esg_category} ${latestSignal.signal_direction} evidence on ${formatDate(latestSignal.published_date)} (${formatMomentum(latestSignal.weighted_signal_score)}).` : "No dated evidence signal is available.",
    peerRelativeContext: `${company.name} is ${peerContext}; peer average ESG is ${formatNumber(peerAverageEsg, 1)}.`,
    monitoringTrigger: monitoringTrigger(classification, riskCompany?.riskScore ?? 0, negativeSignals.length, company.confidence),
  };
}

export function materialityThemes(sector: string): Array<{ category: EsgCategory; themes: string; investorQuestion: string }> {
  const normalized = sector.toLowerCase();
  if (normalized.includes("bank")) {
    return [
      { category: "Governance", themes: "Board oversight, conduct, disclosure, anti-corruption", investorQuestion: "Are governance controls reducing downside and regulatory risk?" },
      { category: "Social", themes: "Customer protection, access, workforce conduct", investorQuestion: "Are customer and workforce issues likely to affect franchise quality?" },
      { category: "Environmental", themes: "Financed emissions and climate transition exposure", investorQuestion: "Is climate exposure visible through lending or investment books?" },
    ];
  }
  if (normalized.includes("aviation") || normalized.includes("energy") || normalized.includes("utilities")) {
    return [
      { category: "Environmental", themes: "Emissions, fuel or energy transition, climate targets", investorQuestion: "Is transition risk improving or creating future capex pressure?" },
      { category: "Governance", themes: "Safety oversight, target credibility, disclosure quality", investorQuestion: "Can management execution be trusted?" },
      { category: "Social", themes: "Workforce safety, customer reliability, community impact", investorQuestion: "Could operational incidents affect earnings resilience?" },
    ];
  }
  if (normalized.includes("real estate") || normalized.includes("infrastructure")) {
    return [
      { category: "Environmental", themes: "Energy efficiency, green building, physical climate exposure", investorQuestion: "Do assets face transition or physical climate repricing?" },
      { category: "Governance", themes: "Disclosure, assurance, capital allocation discipline", investorQuestion: "Are sustainability claims supported by verifiable metrics?" },
      { category: "Social", themes: "Tenant safety, community impact, labour practices", investorQuestion: "Are social risks material to occupancy or project execution?" },
    ];
  }
  return [
    { category: "Environmental", themes: "Emissions, energy, water, waste, climate exposure", investorQuestion: "Are environmental signals financially material for this business model?" },
    { category: "Social", themes: "Workforce, safety, diversity, customers, communities", investorQuestion: "Could social issues affect growth, retention, or operating risk?" },
    { category: "Governance", themes: "Board, ethics, assurance, disclosure, controls", investorQuestion: "Does governance quality support confidence in the ESG narrative?" },
  ];
}

function quadrantReviewReason(classification: CompanyClass) {
  if (classification === "Future Leaders") return "High current ESG score and improving evidence flow; compare valuation and monitor whether evidence remains fresh.";
  if (classification === "Hidden Winners") return "Lower ESG baseline but improving evidence flow; review whether the market has recognized the improvement.";
  if (classification === "Value Traps") return "Low ESG baseline and weak momentum; investigate whether risks are structural or improving.";
  return "High ESG baseline but weaker momentum; review whether current score is supported by recent evidence.";
}

function monitoringTrigger(classification: CompanyClass, riskScore: number, negativeSignals: number, confidence: number) {
  if (riskScore >= 60 || negativeSignals >= 3) return "Review immediately if another high-confidence negative signal appears.";
  if (classification === "Overrated Leaders") return "Monitor for fresh evidence that confirms or contradicts the existing ESG score.";
  if (classification === "Hidden Winners") return "Monitor whether positive momentum persists into the next evidence period.";
  if (confidence < 0.65) return "Seek corroborating evidence before using this signal in portfolio decisions.";
  return "Monitor for material ESG evidence changes and peer-relative valuation shifts.";
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function classTextColor(classification: string) {
  return classColor(classification as CompanyClass);
}
