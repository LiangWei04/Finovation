import type {
  CollectionScope,
  Company,
  CompanyAnalytics,
  EsgCategory,
  EsgDataBundle,
  EsgSignal,
  EsgTrendPoint,
  MomentumClassification,
  StructuredEsgCompanyDataset,
} from "../types/esg";

export const categories: EsgCategory[] = ["Environmental", "Social", "Governance"];

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function sortTrends(trends: EsgTrendPoint[]) {
  return [...trends].sort((a, b) => a.period_start.localeCompare(b.period_start));
}

function scoreFromDataset(dataset: StructuredEsgCompanyDataset | undefined) {
  return dataset?.total_signal_score ?? 0;
}

function positiveRatio(signals: EsgSignal[]) {
  const directional = signals.filter((signal) => signal.signal_direction !== "neutral");
  if (directional.length === 0) return 0;
  return directional.filter((signal) => signal.signal_direction === "positive").length / directional.length;
}

function trendMomentum(sortedTrends: EsgTrendPoint[]) {
  if (sortedTrends.length < 2) return null;
  const latest = sortedTrends[sortedTrends.length - 1];
  const previous = sortedTrends[sortedTrends.length - 2];
  return latest.total_signal_score - previous.total_signal_score;
}

function classifyCompany(
  company: Company,
  dataset: StructuredEsgCompanyDataset | undefined,
  signals: EsgSignal[],
  sortedTrends: EsgTrendPoint[],
  startingScoreThreshold: number,
): { classification: MomentumClassification; recentMomentum: number | null; trendLabel: string; positiveRatio: number } {
  const recentMomentum = trendMomentum(sortedTrends);
  const ratio = positiveRatio(signals);
  const highStartingScore = company.initial_esg_score >= startingScoreThreshold;

  let improving: boolean;
  let trendLabel: string;

  if (recentMomentum === null) {
    improving = scoreFromDataset(dataset) >= 1.25 && ratio >= 0.7;
    trendLabel = "Limited trend history";
  } else {
    improving = recentMomentum > 0.05;
    trendLabel = recentMomentum > 0.05 ? "Improving recent momentum" : "Declining or weak recent momentum";
  }

  if (!highStartingScore && improving) return { classification: "Hidden Winners", recentMomentum, trendLabel, positiveRatio: ratio };
  if (highStartingScore && improving) return { classification: "Future Leaders", recentMomentum, trendLabel, positiveRatio: ratio };
  if (!highStartingScore && !improving) return { classification: "Value Traps", recentMomentum, trendLabel, positiveRatio: ratio };
  return { classification: "Overrated Leaders", recentMomentum, trendLabel, positiveRatio: ratio };
}

export function buildCompanyAnalytics(data: EsgDataBundle): CompanyAnalytics[] {
  const startingScoreThreshold = median(data.companies.map((company) => company.initial_esg_score));
  const datasetByCompany = new Map(data.dataset.map((entry) => [entry.company_id, entry]));
  const signalsByCompany = new Map<string, EsgSignal[]>();
  const trendsByCompany = new Map<string, EsgTrendPoint[]>();

  for (const signal of data.signals) {
    signalsByCompany.set(signal.company_id, [...(signalsByCompany.get(signal.company_id) ?? []), signal]);
  }

  for (const trend of data.trends) {
    trendsByCompany.set(trend.company_id, [...(trendsByCompany.get(trend.company_id) ?? []), trend]);
  }

  return data.companies.map((company) => {
    const dataset = datasetByCompany.get(company.company_id);
    const signals = signalsByCompany.get(company.company_id) ?? [];
    const trends = sortTrends(trendsByCompany.get(company.company_id) ?? []);
    const classification = classifyCompany(company, dataset, signals, trends, startingScoreThreshold);

    return {
      company,
      dataset,
      signals,
      trends,
      latestTrend: trends[trends.length - 1],
      ...classification,
    };
  });
}

export function categoryScore(dataset: StructuredEsgCompanyDataset | undefined, category: EsgCategory) {
  return dataset?.category_breakdown?.find((item) => item.esg_category === category)?.score ?? 0;
}

export function categorySignalCount(dataset: StructuredEsgCompanyDataset | undefined, category: EsgCategory) {
  return dataset?.category_breakdown?.find((item) => item.esg_category === category)?.signal_count ?? 0;
}

export function computeKpis(data: EsgDataBundle) {
  const totalSignals = data.signals.length;
  const positiveSignals = data.signals.filter((signal) => signal.signal_direction === "positive").length;
  const negativeSignals = data.signals.filter((signal) => signal.signal_direction === "negative").length;
  const totalConfidence = data.signals.reduce((sum, signal) => sum + signal.confidence, 0);
  const sourceIds = new Set(data.signals.map((signal) => signal.source_id));

  return {
    totalCompanies: data.companies.length,
    totalSignals,
    positiveSignalPercent: totalSignals ? positiveSignals / totalSignals : 0,
    negativeSignalPercent: totalSignals ? negativeSignals / totalSignals : 0,
    averageConfidence: totalSignals ? totalConfidence / totalSignals : 0,
    uniqueSourceCount: sourceIds.size,
  };
}

export function categoryOverview(signals: EsgSignal[]) {
  return categories.map((category) => {
    const categorySignals = signals.filter((signal) => signal.esg_category === category);
    const score = categorySignals.reduce((sum, signal) => sum + signal.weighted_signal_score, 0);
    return {
      category,
      count: categorySignals.length,
      positive: categorySignals.filter((signal) => signal.signal_direction === "positive").length,
      negative: categorySignals.filter((signal) => signal.signal_direction === "negative").length,
      score,
    };
  });
}

export function matrixGroups(analytics: CompanyAnalytics[]) {
  const groups: Record<MomentumClassification, CompanyAnalytics[]> = {
    "Hidden Winners": [],
    "Future Leaders": [],
    "Value Traps": [],
    "Overrated Leaders": [],
  };

  for (const item of analytics) {
    groups[item.classification].push(item);
  }

  return groups;
}

function maxBy<T>(items: T[], score: (item: T) => number): T | undefined {
  return items.reduce<T | undefined>((best, item) => {
    if (!best || score(item) > score(best)) return item;
    return best;
  }, undefined);
}

export function computeInsights(data: EsgDataBundle, analytics: CompanyAnalytics[]) {
  const categoryCounts = categoryOverview(data.signals);
  const highestMomentum = maxBy(analytics, (item) => item.dataset?.total_signal_score ?? Number.NEGATIVE_INFINITY);
  const mostEvidence = maxBy(analytics, (item) => item.dataset?.total_signal_count ?? Number.NEGATIVE_INFINITY);
  const highestConfidence = maxBy(analytics, (item) => item.dataset?.average_confidence ?? Number.NEGATIVE_INFINITY);
  const strongestGovernance = maxBy(analytics, (item) => categoryScore(item.dataset, "Governance"));
  const diversifiedCoverage = maxBy(analytics, (item) => {
    const coveredCategories = categories.filter((category) => categorySignalCount(item.dataset, category) > 0).length;
    return coveredCategories * 100 + (item.dataset?.source_count ?? 0);
  });
  const mostCommonCategory = maxBy(categoryCounts, (item) => item.count);

  return [
    {
      label: "Highest momentum company",
      value: highestMomentum?.company.name ?? "N/A",
      detail: highestMomentum?.dataset ? `${highestMomentum.dataset.total_signal_score.toFixed(2)} evidence signal score` : "No score available",
    },
    {
      label: "Most evidence-backed company",
      value: mostEvidence?.company.name ?? "N/A",
      detail: mostEvidence?.dataset ? `${mostEvidence.dataset.total_signal_count} signals` : "No evidence available",
    },
    {
      label: "Highest confidence company",
      value: highestConfidence?.company.name ?? "N/A",
      detail: highestConfidence?.dataset ? `${Math.round(highestConfidence.dataset.average_confidence * 100)}% average confidence` : "No confidence available",
    },
    {
      label: "Most common ESG category",
      value: mostCommonCategory?.category ?? "N/A",
      detail: mostCommonCategory ? `${mostCommonCategory.count} signals` : "No signals available",
    },
    {
      label: "Strongest governance momentum",
      value: strongestGovernance?.company.name ?? "N/A",
      detail: strongestGovernance?.dataset ? `${categoryScore(strongestGovernance.dataset, "Governance").toFixed(2)} governance score` : "No governance score available",
    },
    {
      label: "Most diversified signal coverage",
      value: diversifiedCoverage?.company.name ?? "N/A",
      detail: diversifiedCoverage?.dataset
        ? `${categories.filter((category) => categorySignalCount(diversifiedCoverage.dataset, category) > 0).length}/3 categories, ${diversifiedCoverage.dataset.source_count} sources`
        : "No coverage available",
    },
  ];
}

export function scopeWindow(scope: CollectionScope) {
  return `${scope.window_start} to ${scope.window_end}`;
}
