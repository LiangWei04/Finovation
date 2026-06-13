export interface Company {
  company_id: string;
  name: string;
  sector: string;
  sgx_identifier: string;
  website: string;
  initial_esg_score: number;
}

export interface EsgDatasetRow {
  company_id: string;
  company_name: string;
  sector: string;
  sgx_identifier: string;
  total_signal_count: number;
  total_signal_score: number;
  average_confidence: number;
  source_count: number;
  category_breakdown?: CategoryBreakdown[];
}

export interface TrendRow {
  company_id: string;
  company_name: string;
  sector: string;
  period: string;
  period_start?: string;
  period_end?: string;
  environmental_score: number;
  social_score: number;
  governance_score: number;
  total_signal_score: number;
  confidence?: number;
  source_count?: number;
}

export interface DashboardCompany {
  companyId: string;
  rank: number;
  name: string;
  sector: string;
  sgxIdentifier: string;
  esgScore: number;
  momentum: number;
  momentumByPeriod: Record<string, number>;
  confidence: number;
  signalCount: number;
  latestPeriod: string;
  dominantCategory: EsgCategory;
}

export interface EsgSignal {
  signal_id: string;
  company_id: string;
  source_id?: string;
  esg_category: EsgCategory;
  signal_tags?: string[];
  signal_direction: "positive" | "negative" | "neutral";
  signal_strength?: number;
  confidence: number;
  time_relevance?: string;
  weighted_signal_score: number;
  evidence_summary: string;
  evidence_quote?: string;
  evidence_basis?: string;
  source_reliability?: number;
  published_date: string;
  source_platform?: string;
  source_status?: string;
  source_link_type?: string;
  url?: string;
  clickable_url?: string;
}

export interface LiveSignal {
  id: string;
  companyName: string;
  sgxIdentifier: string;
  category: EsgCategory;
  direction: EsgSignal["signal_direction"];
  impact: number;
  summary: string;
}

export type ConfidenceTier = "High" | "Medium" | "Low";

export interface MethodologyMetric {
  label: string;
  value: string;
  description: string;
}

export interface DataQualitySummary {
  companyCount: number;
  signalCount: number;
  sourceCount: number;
  averageConfidence: number;
  confidenceTier: ConfidenceTier;
  latestSignalDate: string;
  latestPeriod: string;
  financialProfileCount: number;
  methodologyMetrics: MethodologyMetric[];
}

export interface ResearchReviewItem {
  companyId: string;
  name: string;
  sgxIdentifier: string;
  sector: string;
  classification: string;
  priority: number;
  confidence: number;
  confidenceTier: ConfidenceTier;
  latestSignalDate: string;
  latestChange: string;
  topRisk: string;
  reviewReason: string;
  riskScore: number;
  evidenceCount: number;
  negativeSignalCount: number;
}

export interface InvestorBrief {
  thesisSnapshot: string;
  topOpportunity: string;
  topRisk: string;
  confidenceTier: ConfidenceTier;
  materialPillar: EsgCategory;
  latestEvidenceChange: string;
  peerRelativeContext: string;
  monitoringTrigger: string;
}

export interface CompanyComparisonRow {
  companyId: string;
  name: string;
  sgxIdentifier: string;
  sector: string;
  esgScore: number;
  momentum: number;
  riskScore: number;
  valuationPe?: number;
  confidence: number;
  evidenceCount: number;
  dominantCategory: EsgCategory;
  classification: string;
}

export type EsgCategory = "Environmental" | "Social" | "Governance";

export interface CategoryBreakdown {
  esg_category: EsgCategory;
  score: number;
}

export interface CompanyDetailData {
  company: DashboardCompany;
  datasetRow?: EsgDatasetRow;
  trends: TrendRow[];
  signals: EsgSignal[];
  allCompanies: DashboardCompany[];
  financialProfile?: FinancialProfile;
  allFinancialProfiles: FinancialProfile[];
  liveSignals: LiveSignal[];
  dataQuality: DataQualitySummary;
  investorBrief: InvestorBrief;
  comparisonRows: CompanyComparisonRow[];
}

export type RiskSeverity = "High" | "Medium" | "Low";

export interface RiskAlert {
  id: string;
  companyId: string;
  companyName: string;
  sgxIdentifier: string;
  sector: string;
  severity: RiskSeverity;
  type: string;
  category: EsgCategory | "Momentum" | "Greenwash Proxy" | "Confidence";
  riskScore: number;
  confidence: number;
  description: string;
  evidenceSummary?: string;
}

export interface RiskRadarCompany {
  companyId: string;
  name: string;
  sector: string;
  sgxIdentifier: string;
  esgScore: number;
  momentum: number;
  classification: string;
  dominantCategory: EsgCategory;
  riskScore: number;
  greenwashProxy: number;
  negativeSignalCount: number;
  negativeEvidenceScore: number;
  governanceFlagCount: number;
  latestDelta: number;
  confidence: number;
  signalCount: number;
  marketCapM?: number;
}

export interface RiskRadarData {
  companies: RiskRadarCompany[];
  alerts: RiskAlert[];
  sectors: string[];
  liveSignals: LiveSignal[];
  dataQuality: DataQualitySummary;
  comparisonRows: CompanyComparisonRow[];
}

export interface InvestmentCompany {
  companyId: string;
  name: string;
  sector: string;
  sgxIdentifier: string;
  esgScore: number;
  momentum: number;
  classification: string;
  dominantCategory: EsgCategory;
  riskScore: number;
  greenwashProxy: number;
  highSeverityAlerts: number;
  financialProfile?: FinancialProfile;
}

export interface InvestmentPreset {
  id: string;
  name: string;
  description: string;
  companyIds: string[];
  averageEsg: number;
  averageMomentum: number;
  riskLevel: RiskSeverity;
}

export interface BasketHolding {
  companyId: string;
  weight: number;
}

export interface BasketMetrics {
  basketReturn: number;
  benchmarkReturn: number;
  sharpe: number;
  volatility: number;
  maxDrawdown: number;
  averageEsg: number;
  averageMomentum: number;
  averageRisk: number;
}

export interface InvestmentData {
  companies: InvestmentCompany[];
  presets: InvestmentPreset[];
  liveSignals: LiveSignal[];
  dataQuality: DataQualitySummary;
  comparisonRows: CompanyComparisonRow[];
}

export interface WatchlistCompany {
  companyId: string;
  name: string;
  sector: string;
  sgxIdentifier: string;
  esgScore: number;
  momentum: number;
  classification: string;
  dominantCategory: EsgCategory;
  riskScore: number;
  highSeverityAlerts: number;
  latestSignalDate: string;
  followUpStatus: "New evidence" | "Risk changed" | "No new update";
}

export interface WatchlistUpdate {
  id: string;
  companyId: string;
  companyName: string;
  sgxIdentifier: string;
  sector: string;
  category: EsgCategory;
  direction: EsgSignal["signal_direction"];
  impact: number;
  confidence: number;
  publishedDate: string;
  summary: string;
  sourcePlatform?: string;
  url?: string;
}

export interface WatchlistData {
  companies: WatchlistCompany[];
  updates: WatchlistUpdate[];
  liveSignals: LiveSignal[];
  dataQuality: DataQualitySummary;
  comparisonRows: CompanyComparisonRow[];
}

export interface FinancialPricePoint {
  date: string;
  close: number;
  volume_m: number;
}

export interface FinancialBacktestPoint {
  period: string;
  date: string;
  signal_index: number;
  benchmark_index: number;
}

export interface FinancialFundamentalPoint {
  period: string;
  revenue_m: number;
  net_income_m: number;
  operating_margin: number;
  eps: number;
  free_cash_flow_m: number;
  debt_to_equity: number;
}

export interface FinancialValuation {
  pe: number;
  pb: number;
  ev_ebitda: number;
  dividend_yield: number;
}

export interface FinancialProfile {
  company_id: string;
  currency: string;
  market_cap_m: number;
  latest_fiscal_period: string;
  data_freshness_note: string;
  price_history: FinancialPricePoint[];
  backtest_history?: FinancialBacktestPoint[];
  fundamentals: FinancialFundamentalPoint[];
  valuation: FinancialValuation;
}
