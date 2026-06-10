import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  Company,
  EsgCategory,
  EsgCategoryDatasetSummary,
  EsgSignal,
  SourcePlatform,
  StructuredEsgCompanyDataset,
} from "../src/types.js";

const DATA_DIR = path.resolve("data");
const COMPANIES_PATH = path.join(DATA_DIR, "companies.json");
const SIGNALS_PATH = path.join(DATA_DIR, "structured_esg_signals.json");
const DATASET_PATH = path.join(DATA_DIR, "structured_esg_dataset.json");

const ESG_CATEGORIES: EsgCategory[] = ["Environmental", "Social", "Governance"];
const SOURCE_PLATFORMS: SourcePlatform[] = [
  "company_official",
  "sgx_or_sgx_linked",
  "careers_platform",
  "third_party_risk",
];
const DATASET_DISCLAIMER =
  "Prototype structured ESG evidence dataset for research screening only; not an ESG rating and not investment advice.";

async function readJson<T>(filePath: string): Promise<T> {
  const text = await readFile(filePath, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, "")) as T;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function score(signals: EsgSignal[]): number {
  return Number(signals.reduce((sum, signal) => sum + signal.weighted_signal_score, 0).toFixed(3));
}

function evidenceFromSignal(signal: EsgSignal): EsgCategoryDatasetSummary["evidence"][number] {
  return {
    signal_id: signal.signal_id,
    source_id: signal.source_id,
    signal_direction: signal.signal_direction,
    weighted_signal_score: signal.weighted_signal_score,
    confidence: signal.confidence,
    evidence_summary: signal.evidence_summary,
    evidence_quote: signal.evidence_quote,
    published_date: signal.published_date,
    source_platform: signal.source_platform,
    url: signal.url,
  };
}

function topEvidence(signals: EsgSignal[], limit: number): EsgCategoryDatasetSummary["evidence"] {
  return [...signals]
    .sort((a, b) => Math.abs(b.weighted_signal_score) - Math.abs(a.weighted_signal_score))
    .slice(0, limit)
    .map(evidenceFromSignal);
}

function topTags(signals: EsgSignal[]): string[] {
  const counts = new Map<string, number>();
  for (const signal of signals) {
    for (const tag of signal.signal_tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([tag]) => tag);
}

function latestDate(signals: EsgSignal[]): string | undefined {
  return signals
    .map((signal) => signal.published_date)
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1);
}

function categorySummary(category: EsgCategory, signals: EsgSignal[]): EsgCategoryDatasetSummary {
  return {
    esg_category: category,
    signal_count: signals.length,
    positive_signal_count: signals.filter((signal) => signal.signal_direction === "positive").length,
    negative_signal_count: signals.filter((signal) => signal.signal_direction === "negative").length,
    score: score(signals),
    average_confidence: Number(average(signals.map((signal) => signal.confidence)).toFixed(2)),
    latest_signal_date: latestDate(signals),
    top_tags: topTags(signals),
    evidence: topEvidence(signals, 5),
  };
}

function platformCounts(signals: EsgSignal[]): Record<SourcePlatform, number> {
  return Object.fromEntries(
    SOURCE_PLATFORMS.map((platform) => [
      platform,
      new Set(
        signals
          .filter((signal) => signal.source_platform === platform)
          .map((signal) => signal.source_id),
      ).size,
    ]),
  ) as Record<SourcePlatform, number>;
}

function buildCompanyDataset(company: Company, signals: EsgSignal[]): StructuredEsgCompanyDataset {
  return {
    company_id: company.company_id,
    company_name: company.name,
    sector: company.sector,
    sgx_identifier: company.sgx_identifier,
    time_window: signals[0]?.time_window ?? "unknown",
    total_signal_count: signals.length,
    total_signal_score: score(signals),
    average_confidence: Number(average(signals.map((signal) => signal.confidence)).toFixed(2)),
    source_count: new Set(signals.map((signal) => signal.source_id)).size,
    source_platform_counts: platformCounts(signals),
    category_breakdown: ESG_CATEGORIES.map((category) =>
      categorySummary(
        category,
        signals.filter((signal) => signal.esg_category === category),
      ),
    ),
    top_evidence: topEvidence(signals, 8),
    dataset_disclaimer: DATASET_DISCLAIMER,
  };
}

async function main(): Promise<void> {
  const companies = await readJson<Company[]>(COMPANIES_PATH);
  const signals = await readJson<EsgSignal[]>(SIGNALS_PATH);
  const dataset = companies.map((company) =>
    buildCompanyDataset(
      company,
      signals.filter((signal) => signal.company_id === company.company_id),
    ),
  );

  await writeJson(DATASET_PATH, dataset);
  console.log(`Built structured ESG company dataset for ${dataset.length} companies. Output: ${DATASET_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
