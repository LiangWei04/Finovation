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

export interface SeedUrl {
  seed_id: string;
  company_id: string;
  source_platform?: SourcePlatform;
  source_type: SourceType;
  url: string;
  expected_content_type: "html" | "pdf" | "jobs_page" | "news_page";
  source_reliability: number;
  notes: string;
  mock_text: string;
  published_date?: string;
}

export interface RawSource {
  source_id: string;
  seed_id: string;
  company_id: string;
  source_platform: SourcePlatform;
  url: string;
  title: string;
  source_type: SourceType;
  scraped_at: string;
  raw_text: string;
  extraction_status: "success" | "failed" | "skipped_unchanged" | "fallback_seeded";
  content_hash: string;
  source_reliability: number;
  published_date?: string;
  collection_window: {
    start_date: string;
    end_date: string;
  };
  firecrawl_metadata: Record<string, unknown>;
  error?: string;
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
  source_reliability: number;
  weighted_signal_score: number;
  published_date?: string;
  time_window: string;
  source_platform: SourcePlatform;
  url: string;
  prototype_disclaimer: string;
}

export interface EsgTrendPoint {
  company_id: string;
  company_name: string;
  sector: string;
  period: string;
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
    published_date?: string;
    source_platform: SourcePlatform;
    url: string;
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
  source_platform_counts: Record<SourcePlatform, number>;
  category_breakdown: EsgCategoryDatasetSummary[];
  top_evidence: EsgCategoryDatasetSummary["evidence"];
  dataset_disclaimer: string;
}
