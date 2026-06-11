import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  Company,
  EsgSignal,
  EsgTrendPoint,
  RawSource,
  SeedUrl,
  StructuredEsgCompanyDataset,
} from "../src/types.js";

const DATA_DIR = path.resolve("data");

async function readJson<T>(fileName: string): Promise<T> {
  const text = await readFile(path.join(DATA_DIR, fileName), "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, "")) as T;
}

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

interface CollectionScope {
  window_start: string;
  window_end: string;
  window_label: string;
}

async function main(): Promise<void> {
  const companies = await readJson<Company[]>("companies.json");
  const scope = await readJson<CollectionScope>("collection_scope.json");
  const seeds = await readJson<SeedUrl[]>("seed_urls.json");
  const rawSources = await readJson<RawSource[]>("raw_sources.json");
  const signals = await readJson<EsgSignal[]>("structured_esg_signals.json");
  const structuredDataset = await readJson<StructuredEsgCompanyDataset[]>("structured_esg_dataset.json");
  const trends = await readJson<EsgTrendPoint[]>("trend_output.json");

  const companyIds = new Set(companies.map((company) => company.company_id));
  const seedIds = new Set(seeds.map((seed) => seed.seed_id));
  const sourceIds = new Set(rawSources.map((source) => source.source_id));

  assert(companies.length === 10, `Expected 10 companies, found ${companies.length}.`);
  assert(seeds.length >= companies.length, `Expected at least one real seed URL per company, found ${seeds.length}.`);
  assert(rawSources.length === seeds.length, "Raw source count must match seed URL count.");
  assert(signals.length >= 10, `Expected at least 10 ESG signals, found ${signals.length}.`);
  assert(
    structuredDataset.length === companies.length,
    `Expected ${companies.length} structured dataset rows, found ${structuredDataset.length}.`,
  );

  for (const seed of seeds) {
    assert(companyIds.has(seed.company_id), `Seed ${seed.seed_id} references unknown company.`);
    assert(seedIds.has(seed.seed_id), `Seed ${seed.seed_id} missing from seed set.`);
    assert(seed.mock_text.trim().length === 0, `Seed ${seed.seed_id} contains mock_text; seeded evidence is disabled.`);
  }

  for (const source of rawSources) {
    assert(companyIds.has(source.company_id), `Raw source ${source.source_id} references unknown company.`);
    assert(seedIds.has(source.seed_id), `Raw source ${source.source_id} references unknown seed.`);
    assert(
      source.collection_window.start_date === scope.window_start &&
        source.collection_window.end_date === scope.window_end,
      `Raw source ${source.source_id} has an unexpected collection window.`,
    );
    if (source.published_date) {
      assert(
        source.published_date >= scope.window_start && source.published_date <= scope.window_end,
        `Raw source ${source.source_id} is outside the collection window.`,
      );
    }
    assert(
      source.extraction_status !== "fallback_seeded",
      `Raw source ${source.source_id} uses seeded fallback text; only live scraped text is allowed.`,
    );
  }

  for (const signal of signals) {
    const source = rawSources.find((candidate) => candidate.source_id === signal.source_id);
    assert(companyIds.has(signal.company_id), `Signal ${signal.signal_id} references unknown company.`);
    assert(sourceIds.has(signal.source_id), `Signal ${signal.signal_id} references unknown source.`);
    assert(signal.evidence_quote.length > 0, `Signal ${signal.signal_id} is missing evidence quote.`);
    assert(
      source?.raw_text.includes(signal.evidence_quote),
      `Signal ${signal.signal_id} evidence quote is not present in raw source text.`,
    );
    assert(
      ["scraped_text", "seeded_prototype_text"].includes(signal.evidence_basis),
      `Signal ${signal.signal_id} has invalid evidence basis.`,
    );
    assert(
      signal.source_status !== "fallback_seeded" || signal.evidence_basis === "seeded_prototype_text",
      `Signal ${signal.signal_id} fallback source must be labeled seeded_prototype_text.`,
    );
    assert(
      signal.source_status === "fallback_seeded" || signal.evidence_basis === "scraped_text",
      `Signal ${signal.signal_id} scraped source must be labeled scraped_text.`,
    );
    assert(
      signal.evidence_basis === "scraped_text",
      `Signal ${signal.signal_id} uses seeded prototype text; only scraped text is allowed.`,
    );
    assert(signal.time_window === scope.window_label, `Signal ${signal.signal_id} has wrong time window.`);
    assert(
      signal.published_date === undefined ||
        (signal.published_date >= scope.window_start && signal.published_date <= scope.window_end),
      `Signal ${signal.signal_id} is outside the collection window.`,
    );
    assert(
      signal.prototype_disclaimer.toLowerCase().includes("not investment advice"),
      `Signal ${signal.signal_id} is missing prototype disclaimer.`,
    );
    assert(
      ["direct", "reference_only", "unavailable"].includes(signal.source_link_type),
      `Signal ${signal.signal_id} has invalid source link type.`,
    );
    assert(
      signal.source_status !== "fallback_seeded" || signal.source_link_type === "reference_only",
      `Signal ${signal.signal_id} fallback source must be marked reference_only.`,
    );
    assert(
      !/\/securities\/company-announcements/i.test(signal.url) ||
        signal.source_link_type === "reference_only",
      `Signal ${signal.signal_id} SGX announcement list must be marked reference_only.`,
    );
    assert(
      signal.source_link_type === "direct" || signal.clickable_url === undefined,
      `Signal ${signal.signal_id} has clickable_url but is not a direct source.`,
    );
    assert(
      signal.source_link_type !== "direct" || signal.clickable_url === signal.url,
      `Signal ${signal.signal_id} direct source must expose clickable_url.`,
    );
  }

  for (const companyDataset of structuredDataset) {
    assert(
      companyIds.has(companyDataset.company_id),
      `Structured dataset references unknown company ${companyDataset.company_id}.`,
    );
    assert(
      companyDataset.category_breakdown.length === 3,
      `Structured dataset ${companyDataset.company_id} must have exactly 3 ESG categories.`,
    );
    for (const category of ["Environmental", "Social", "Governance"]) {
      assert(
        companyDataset.category_breakdown.some((summary) => summary.esg_category === category),
        `Structured dataset ${companyDataset.company_id} is missing ${category}.`,
      );
    }
    assert(
      companyDataset.dataset_disclaimer.toLowerCase().includes("not an esg rating"),
      `Structured dataset ${companyDataset.company_id} is missing dataset disclaimer.`,
    );
  }

  for (const trend of trends) {
    assert(companyIds.has(trend.company_id), `Trend ${trend.company_id}/${trend.period} references unknown company.`);
    assert(/^\d{4}-H[1-2]$/.test(trend.period), `Trend ${trend.company_id}/${trend.period} has invalid period.`);
    assert(trend.period_granularity === "half-year", `Trend ${trend.company_id}/${trend.period} has invalid granularity.`);
    assert(
      trend.trend_disclaimer.toLowerCase().includes("not a true esg rating trend"),
      `Trend ${trend.company_id}/${trend.period} is missing trend disclaimer.`,
    );
    assert(
      trend.environmental_signal_count + trend.social_signal_count + trend.governance_signal_count > 0,
      `Trend ${trend.company_id}/${trend.period} has no ESG signals.`,
    );
  }

  console.log(
    `Validation passed: ${companies.length} companies, ${seeds.length} seeds, ${rawSources.length} raw sources, ${signals.length} signals, ${structuredDataset.length} structured dataset rows, ${trends.length} trend points.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
