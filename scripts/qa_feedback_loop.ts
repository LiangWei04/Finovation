import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  Company,
  EsgCategory,
  EsgSignal,
  EsgTrendPoint,
  RawSource,
  SeedUrl,
  StructuredEsgCompanyDataset,
} from "../src/types.js";

const DATA_DIR = path.resolve("data");
const ESG_CATEGORIES: EsgCategory[] = ["Environmental", "Social", "Governance"];

interface CollectionScope {
  window_start: string;
  window_end: string;
  window_label: string;
}

interface QaIssue {
  severity: "error" | "warning";
  message: string;
}

async function readJson<T>(fileName: string): Promise<T> {
  const text = await readFile(path.join(DATA_DIR, fileName), "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, "")) as T;
}

function round3(value: number): number {
  return Number(value.toFixed(3));
}

function issue(issues: QaIssue[], severity: QaIssue["severity"], message: string): void {
  issues.push({ severity, message });
}

function sameNumber(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.002;
}

function groupBy<T>(rows: T[], keyFn: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyFn(row);
    map.set(key, [...(map.get(key) ?? []), row]);
  }
  return map;
}

function expectedQuarter(dateText: string): string {
  const date = new Date(`${dateText}T00:00:00Z`);
  return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
}

function score(signals: EsgSignal[]): number {
  return round3(signals.reduce((sum, signal) => sum + signal.weighted_signal_score, 0));
}

function countSignals(signals: EsgSignal[], category: EsgCategory): number {
  return signals.filter((signal) => signal.esg_category === category).length;
}

async function main(): Promise<void> {
  const companies = await readJson<Company[]>("companies.json");
  const scope = await readJson<CollectionScope>("collection_scope.json");
  const seeds = await readJson<SeedUrl[]>("seed_urls.json");
  const rawSources = await readJson<RawSource[]>("raw_sources.json");
  const signals = await readJson<EsgSignal[]>("structured_esg_signals.json");
  const dataset = await readJson<StructuredEsgCompanyDataset[]>("structured_esg_dataset.json");
  const trends = await readJson<EsgTrendPoint[]>("trend_output.json");
  const issues: QaIssue[] = [];

  const companyIds = new Set(companies.map((company) => company.company_id));
  const sourceById = new Map(rawSources.map((source) => [source.source_id, source]));
  const datasetByCompany = new Map(dataset.map((row) => [row.company_id, row]));
  const signalsByCompany = groupBy(signals, (signal) => signal.company_id);
  const rawByStatus = groupBy(rawSources, (source) => source.extraction_status);

  if (seeds.length !== rawSources.length) {
    issue(issues, "error", `Seed/raw count mismatch: ${seeds.length} seeds vs ${rawSources.length} raw sources.`);
  }

  for (const signal of signals) {
    if (!ESG_CATEGORIES.includes(signal.esg_category)) {
      issue(issues, "error", `${signal.signal_id} has non-core ESG category ${signal.esg_category}.`);
    }
    const source = sourceById.get(signal.source_id);
    if (!source) {
      issue(issues, "error", `${signal.signal_id} references missing source ${signal.source_id}.`);
      continue;
    }
    if (!source.raw_text.includes(signal.evidence_quote)) {
      issue(issues, "error", `${signal.signal_id} quote is not present in ${signal.source_id}.`);
    }
    if (signal.time_window !== scope.window_label) {
      issue(issues, "error", `${signal.signal_id} has wrong time window ${signal.time_window}.`);
    }
  }

  for (const company of companies) {
    const companySignals = signalsByCompany.get(company.company_id) ?? [];
    const companyDataset = datasetByCompany.get(company.company_id);
    if (!companyDataset) {
      issue(issues, "error", `${company.company_id} is missing from structured_esg_dataset.json.`);
      continue;
    }

    for (const category of ESG_CATEGORIES) {
      const count = countSignals(companySignals, category);
      if (count === 0) {
        issue(issues, "error", `${company.name} has no ${category} signals.`);
      }
      const categorySummary = companyDataset.category_breakdown.find((item) => item.esg_category === category);
      if (!categorySummary) {
        issue(issues, "error", `${company.name} dataset missing ${category} summary.`);
      } else if (categorySummary.signal_count !== count) {
        issue(
          issues,
          "error",
          `${company.name} ${category} dataset count ${categorySummary.signal_count} does not match signal rows ${count}.`,
        );
      }
    }

    if (companyDataset.total_signal_count !== companySignals.length) {
      issue(
        issues,
        "error",
        `${company.name} dataset total ${companyDataset.total_signal_count} does not match signal rows ${companySignals.length}.`,
      );
    }
    if (!sameNumber(companyDataset.total_signal_score, score(companySignals))) {
      issue(
        issues,
        "error",
        `${company.name} dataset score ${companyDataset.total_signal_score} does not match row score ${score(companySignals)}.`,
      );
    }
  }

  const signalsByTrendKey = groupBy(
    signals.filter((signal) => signal.published_date),
    (signal) => `${signal.company_id}:${expectedQuarter(signal.published_date!)}`,
  );
  const trendByKey = new Map(trends.map((trend) => [`${trend.company_id}:${trend.period}`, trend]));

  for (const [key, periodSignals] of signalsByTrendKey) {
    const trend = trendByKey.get(key);
    if (!trend) {
      issue(issues, "error", `Missing trend point for ${key}.`);
      continue;
    }
    if (!sameNumber(trend.total_signal_score, score(periodSignals))) {
      issue(
        issues,
        "error",
        `Trend ${key} score ${trend.total_signal_score} does not match row score ${score(periodSignals)}.`,
      );
    }
  }

  for (const source of rawSources) {
    if (!companyIds.has(source.company_id)) {
      issue(issues, "error", `${source.source_id} references unknown company ${source.company_id}.`);
    }
    if (source.published_date && (source.published_date < scope.window_start || source.published_date > scope.window_end)) {
      issue(issues, "error", `${source.source_id} published date is outside collection scope.`);
    }
    if (source.extraction_status === "fallback_seeded" && !String(source.firecrawl_metadata.note ?? "").includes("seed")) {
      issue(issues, "warning", `${source.source_id} is fallback_seeded but lacks a clear fallback note.`);
    }
  }

  const warningCount = issues.filter((item) => item.severity === "warning").length;
  const errorCount = issues.filter((item) => item.severity === "error").length;

  console.log("QA feedback loop summary");
  console.log(`Companies: ${companies.length}`);
  console.log(`Seeds/raw sources: ${seeds.length}/${rawSources.length}`);
  console.log(`Signals: ${signals.length}`);
  console.log(`Structured dataset rows: ${dataset.length}`);
  console.log(`Trend points: ${trends.length}`);
  console.log(
    `Raw source statuses: ${[...rawByStatus.entries()]
      .map(([status, rows]) => `${status}=${rows.length}`)
      .join(", ")}`,
  );
  console.log(`Issues: ${errorCount} errors, ${warningCount} warnings`);

  for (const item of issues) {
    console.log(`[${item.severity.toUpperCase()}] ${item.message}`);
  }

  if (errorCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
