export type SourceType =
  | "sustainability_report"
  | "annual_report"
  | "investor_relations"
  | "company_announcement"
  | "newsroom"
  | "careers"
  | "controversy_risk";

export type SourcePlatform =
  | "company_official"
  | "sgx_or_sgx_linked"
  | "careers_platform"
  | "third_party_risk";

export type EsgCategory = "Environmental" | "Social" | "Governance";

export type SignalDirection = "positive" | "negative" | "neutral";

export type TimeRelevance = "backward-looking" | "current" | "forward-looking";
export type ExtractionStatus = "success" | "failed" | "skipped_unchanged" | "fallback_seeded";
export type SourceLinkType = "direct" | "reference_only" | "unavailable";
export type EvidenceBasis = "scraped_text" | "seeded_prototype_text";

export interface Company {
  company_id: string;
  name: string;
  sector: string;
  sgx_identifier: string;
  website: string;
  initial_esg_score: number;
  historical_esg_scores: Record<string, number>;
  prototype_note: string;
}

export interface EsgSignal {
  signal_id: string;
  company_id: string;
  source_id: string;
  esg_category: EsgCategory;
  signal_tags: string[];
  signal_direction: SignalDirection;
  signal_strength: number;
  confidence: number;
  time_relevance: TimeRelevance;
  evidence_summary: string;
  evidence_quote: string;
  evidence_basis?: EvidenceBasis;
  source_reliability: number;
  weighted_signal_score: number;
  published_date?: string;
  time_window: string;
  source_platform: SourcePlatform;
  source_status?: ExtractionStatus;
  source_note?: string;
  source_link_type?: SourceLinkType;
  url?: string;
  clickable_url?: string;
  prototype_disclaimer: string;
}

export interface EsgTrendPoint {
  company_id: string;
  company_name: string;
  sector: string;
  period: string;
  period_granularity?: "half-year";
  period_start: string;
  period_end: string;
  environmental_score: number;
  social_score: number;
  governance_score: number;
  total_signal_score: number;
  environmental_signal_count: number;
  social_signal_count: number;
  governance_signal_count: number;
  positive_signal_count: number;
  negative_signal_count: number;
  confidence: number;
  source_count: number;
  trend_disclaimer: string;
}

export interface EsgCategoryDatasetSummary {
  esg_category: EsgCategory;
  signal_count: number;
  positive_signal_count: number;
  negative_signal_count: number;
  score: number;
  average_confidence: number;
  latest_signal_date?: string;
  top_tags: string[];
  evidence: Array<{
    signal_id: string;
    source_id: string;
    signal_direction: SignalDirection;
    weighted_signal_score: number;
    confidence: number;
    evidence_summary: string;
    evidence_quote: string;
    evidence_basis?: EvidenceBasis;
    published_date?: string;
    source_platform: SourcePlatform;
    source_status?: ExtractionStatus;
    source_note?: string;
    source_link_type?: SourceLinkType;
    url?: string;
    clickable_url?: string;
  }>;
}

export interface StructuredEsgCompanyDataset {
  company_id: string;
  company_name: string;
  sector: string;
  sgx_identifier: string;
  time_window: string;
  total_signal_count: number;
  total_signal_score: number;
  average_confidence: number;
  source_count: number;
  source_platform_counts: Partial<Record<SourcePlatform, number>>;
  category_breakdown?: EsgCategoryDatasetSummary[];
  top_evidence?: EsgCategoryDatasetSummary["evidence"];
  dataset_disclaimer: string;
}

export interface CollectionScope {
  window_start: string;
  window_end: string;
  window_label: string;
  companies: string[];
  platform_priority: Array<{
    platform: SourcePlatform;
    use_for: string;
  }>;
  esg_dimensions: Record<EsgCategory, string[]>;
}

export interface EsgDataBundle {
  dataset: StructuredEsgCompanyDataset[];
  signals: EsgSignal[];
  trends: EsgTrendPoint[];
  companies: Company[];
  scope: CollectionScope;
}

export type MomentumClassification =
  | "Hidden Winners"
  | "Future Leaders"
  | "Value Traps"
  | "Overrated Leaders";

export interface CompanyAnalytics {
  company: Company;
  dataset?: StructuredEsgCompanyDataset;
  trends: EsgTrendPoint[];
  signals: EsgSignal[];
  classification: MomentumClassification;
  trendLabel: string;
  latestTrend?: EsgTrendPoint;
  recentMomentum: number | null;
  positiveRatio: number;
}
