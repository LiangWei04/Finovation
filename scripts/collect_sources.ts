import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RawSource, SeedUrl, SourcePlatform, SourceType } from "../src/types.js";

const DATA_DIR = path.resolve("data");
const SEEDS_PATH = path.join(DATA_DIR, "seed_urls.json");
const RAW_PATH = path.join(DATA_DIR, "raw_sources.json");
const SCOPE_PATH = path.join(DATA_DIR, "collection_scope.json");

interface CollectionScope {
  window_start: string;
  window_end: string;
  window_label: string;
}

interface FirecrawlScrapeResponse {
  success?: boolean;
  data?: {
    markdown?: string;
    html?: string;
    metadata?: {
      title?: string;
      sourceURL?: string;
      statusCode?: number;
      [key: string]: unknown;
    };
  };
  error?: string;
}

async function readJson<T>(filePath: string): Promise<T> {
  const text = await readFile(filePath, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, "")) as T;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function titleFromSeed(seed: SeedUrl): string {
  return `${seed.source_type.replaceAll("_", " ")} for ${seed.company_id}`;
}

function isUnusableScrapeText(text: string): boolean {
  const normalized = text.toLowerCase().replace(/\s+/g, " ");
  return (
    text.trim().length < 120 ||
    normalized.includes("page not found") ||
    normalized.includes("# < 404") ||
    normalized.includes("404 >")
  );
}

function keywordHits(text: string, keywords: string[]): number {
  const normalized = text.toLowerCase();
  return keywords.filter((keyword) => normalized.includes(keyword)).length;
}

function hasEnoughEsgEvidence(seed: SeedUrl, text: string): boolean {
  const environmentalHits = keywordHits(text, [
    "environment",
    "environmental",
    "emissions",
    "climate",
    "carbon",
    "energy",
    "water",
    "waste",
    "renewable",
  ]);
  const socialHits = keywordHits(text, [
    "social",
    "employee",
    "safety",
    "diversity",
    "training",
    "human rights",
    "labour",
    "worker",
  ]);
  const governanceHits = keywordHits(text, [
    "governance",
    "board",
    "audit",
    "risk",
    "compliance",
    "anti-corruption",
    "disclosure",
    "reporting",
  ]);

  const categoryCount = [environmentalHits, socialHits, governanceHits].filter((hits) => hits > 0).length;
  if (seed.source_platform === "sgx_or_sgx_linked") return categoryCount >= 2;
  if (seed.source_type === "sustainability_report" || seed.source_type === "annual_report") {
    return categoryCount >= 2;
  }
  return environmentalHits + socialHits + governanceHits > 0;
}

function inferPlatform(sourceType: SourceType): SourcePlatform {
  if (sourceType === "careers") return "careers_platform";
  if (sourceType === "controversy_risk") return "third_party_risk";
  if (sourceType === "company_announcement" || sourceType === "investor_relations") {
    return "sgx_or_sgx_linked";
  }
  return "company_official";
}

async function scrapeWithFirecrawl(seed: SeedUrl): Promise<{
  title: string;
  text: string;
  metadata: Record<string, unknown>;
}> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is required when COLLECTION_MODE=live.");
  }

  const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: seed.url,
      formats: ["markdown"],
      onlyMainContent: true,
      maxAge: 172800000,
    }),
  });

  const payload = (await response.json()) as FirecrawlScrapeResponse;
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error ?? `Firecrawl returned HTTP ${response.status}`);
  }

  const text = payload.data?.markdown ?? payload.data?.html ?? "";
  if (isUnusableScrapeText(text)) {
    throw new Error("Firecrawl returned unusable or low-value page text.");
  }

  return {
    title: payload.data?.metadata?.title ?? titleFromSeed(seed),
    text,
    metadata: {
      provider: "firecrawl",
      endpoint: "v2/scrape",
      ...payload.data?.metadata,
    },
  };
}

async function collectSeed(
  seed: SeedUrl,
  existingBySeed: Map<string, RawSource>,
  scope: CollectionScope,
): Promise<RawSource> {
  const now = new Date().toISOString();
  const sourceId = `SRC${seed.seed_id.replace("SEED", "").padStart(3, "0")}`;
  const useLiveCollection = process.env.COLLECTION_MODE === "live";

  try {
    const collected = useLiveCollection
      ? await scrapeWithFirecrawl(seed)
      : {
          title: titleFromSeed(seed),
          text: seed.mock_text,
          metadata: {
            provider: "seeded_mock",
            note: "Stable prototype text used because COLLECTION_MODE is not live.",
          },
        };

    const isDynamicSgxSearch =
      seed.source_platform === "sgx_or_sgx_linked" && seed.url.includes("company-announcements");
    const shouldFallback =
      useLiveCollection &&
      seed.mock_text.trim().length > 0 &&
      (isDynamicSgxSearch || !hasEnoughEsgEvidence(seed, collected.text));
    const rawText = shouldFallback ? seed.mock_text : collected.text;
    const contentHash = hashText(rawText);
    const previous = existingBySeed.get(seed.seed_id);
    const extractionStatus =
      shouldFallback ? "fallback_seeded" : previous && previous.content_hash === contentHash ? "skipped_unchanged" : "success";

    return {
      source_id: sourceId,
      seed_id: seed.seed_id,
      company_id: seed.company_id,
      source_platform: seed.source_platform ?? inferPlatform(seed.source_type),
      url: seed.url,
      title: collected.title,
      source_type: seed.source_type,
      scraped_at: now,
      raw_text: rawText,
      extraction_status: extractionStatus,
      content_hash: contentHash,
      source_reliability: shouldFallback ? Math.min(seed.source_reliability, 0.72) : seed.source_reliability,
      published_date: seed.published_date,
      collection_window: {
        start_date: scope.window_start,
        end_date: scope.window_end,
      },
      firecrawl_metadata: shouldFallback
        ? {
            ...collected.metadata,
            provider: "firecrawl_seed_fallback",
            note: isDynamicSgxSearch
              ? "Used curated SGX-style seed text because SGX company-announcement search pages render as dynamic generic pages."
              : "Used curated seed text because the live page did not contain enough ESG evidence for the prototype scope.",
          }
        : collected.metadata,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (seed.mock_text.trim().length > 0) {
      return {
        source_id: sourceId,
        seed_id: seed.seed_id,
        company_id: seed.company_id,
        source_platform: seed.source_platform ?? inferPlatform(seed.source_type),
        url: seed.url,
        title: titleFromSeed(seed),
        source_type: seed.source_type,
        scraped_at: now,
        raw_text: seed.mock_text,
        extraction_status: "fallback_seeded",
        content_hash: hashText(seed.mock_text),
        source_reliability: Math.min(seed.source_reliability, 0.72),
        published_date: seed.published_date,
        collection_window: {
          start_date: scope.window_start,
          end_date: scope.window_end,
        },
        firecrawl_metadata: {
          provider: useLiveCollection ? "firecrawl_seed_fallback" : "seeded_mock",
          live_error: message,
          note: "Used curated seed text because live scraping failed or returned low-value content.",
        },
      };
    }

    return {
      source_id: sourceId,
      seed_id: seed.seed_id,
      company_id: seed.company_id,
      source_platform: seed.source_platform ?? inferPlatform(seed.source_type),
      url: seed.url,
      title: titleFromSeed(seed),
      source_type: seed.source_type,
      scraped_at: now,
      raw_text: "",
      extraction_status: "failed",
      content_hash: hashText(""),
      source_reliability: seed.source_reliability,
      published_date: seed.published_date,
      collection_window: {
        start_date: scope.window_start,
        end_date: scope.window_end,
      },
      firecrawl_metadata: {
        provider: useLiveCollection ? "firecrawl" : "seeded_mock",
      },
      error: message,
    };
  }
}

async function main(): Promise<void> {
  const seeds = await readJson<SeedUrl[]>(SEEDS_PATH);
  const scope = await readJson<CollectionScope>(SCOPE_PATH);
  let existing: RawSource[] = [];

  try {
    existing = await readJson<RawSource[]>(RAW_PATH);
  } catch {
    existing = [];
  }

  const existingBySeed = new Map(existing.map((source) => [source.seed_id, source]));
  const rawSources: RawSource[] = [];

  for (const seed of seeds) {
    rawSources.push(await collectSeed(seed, existingBySeed, scope));
  }

  await writeJson(RAW_PATH, rawSources);

  const successful = rawSources.filter((source) => source.extraction_status !== "failed").length;
  const failed = rawSources.length - successful;
  const unchanged = rawSources.filter((source) => source.extraction_status === "skipped_unchanged").length;

  console.log(
    `Collected ${rawSources.length} sources: ${successful} usable, ${failed} failed, ${unchanged} unchanged. Output: ${RAW_PATH}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
