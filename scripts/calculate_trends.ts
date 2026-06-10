import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Company, EsgCategory, EsgSignal, EsgTrendPoint } from "../src/types.js";

const DATA_DIR = path.resolve("data");
const COMPANIES_PATH = path.join(DATA_DIR, "companies.json");
const SIGNALS_PATH = path.join(DATA_DIR, "structured_esg_signals.json");
const TRENDS_PATH = path.join(DATA_DIR, "trend_output.json");

const TREND_DISCLAIMER =
  "Prototype evidence signal trend based on collected source dates; not a true ESG rating trend or investment recommendation.";

async function readJson<T>(filePath: string): Promise<T> {
  const text = await readFile(filePath, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, "")) as T;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function quarterFromDate(dateText: string): string {
  const date = new Date(`${dateText}T00:00:00Z`);
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${date.getUTCFullYear()}-Q${quarter}`;
}

function quarterBounds(period: string): { start: string; end: string } {
  const [yearText, quarterText] = period.split("-Q");
  const year = Number(yearText);
  const quarter = Number(quarterText);
  const startMonth = (quarter - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function categoryScore(signals: EsgSignal[], category: EsgCategory): number {
  return Number(
    signals
      .filter((signal) => signal.esg_category === category)
      .reduce((sum, signal) => sum + signal.weighted_signal_score, 0)
      .toFixed(3),
  );
}

function categoryCount(signals: EsgSignal[], category: EsgCategory): number {
  return signals.filter((signal) => signal.esg_category === category).length;
}

function buildTrendPoint(company: Company, period: string, signals: EsgSignal[]): EsgTrendPoint {
  const bounds = quarterBounds(period);
  const environmentalScore = categoryScore(signals, "Environmental");
  const socialScore = categoryScore(signals, "Social");
  const governanceScore = categoryScore(signals, "Governance");
  const sourceCount = new Set(signals.map((signal) => signal.source_id)).size;

  return {
    company_id: company.company_id,
    company_name: company.name,
    sector: company.sector,
    period,
    period_start: bounds.start,
    period_end: bounds.end,
    environmental_score: environmentalScore,
    social_score: socialScore,
    governance_score: governanceScore,
    total_signal_score: Number((environmentalScore + socialScore + governanceScore).toFixed(3)),
    environmental_signal_count: categoryCount(signals, "Environmental"),
    social_signal_count: categoryCount(signals, "Social"),
    governance_signal_count: categoryCount(signals, "Governance"),
    positive_signal_count: signals.filter((signal) => signal.signal_direction === "positive").length,
    negative_signal_count: signals.filter((signal) => signal.signal_direction === "negative").length,
    confidence: Number(average(signals.map((signal) => signal.confidence)).toFixed(2)),
    source_count: sourceCount,
    trend_disclaimer: TREND_DISCLAIMER,
  };
}

async function main(): Promise<void> {
  const companies = await readJson<Company[]>(COMPANIES_PATH);
  const signals = await readJson<EsgSignal[]>(SIGNALS_PATH);
  const companiesById = new Map(companies.map((company) => [company.company_id, company]));
  const grouped = new Map<string, EsgSignal[]>();

  for (const signal of signals) {
    if (!signal.published_date) continue;
    const period = quarterFromDate(signal.published_date);
    const key = `${signal.company_id}:${period}`;
    grouped.set(key, [...(grouped.get(key) ?? []), signal]);
  }

  const trendPoints: EsgTrendPoint[] = [];

  for (const [key, periodSignals] of grouped) {
    const [companyId, period] = key.split(":");
    const company = companiesById.get(companyId);
    if (!company) continue;
    trendPoints.push(buildTrendPoint(company, period, periodSignals));
  }

  trendPoints.sort(
    (a, b) =>
      a.company_id.localeCompare(b.company_id) ||
      a.period.localeCompare(b.period),
  );

  await writeJson(TRENDS_PATH, trendPoints);
  console.log(`Calculated ${trendPoints.length} quarterly evidence trend points. Output: ${TRENDS_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
