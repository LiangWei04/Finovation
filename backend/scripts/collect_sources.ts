import "dotenv/config";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import type { RawSource, SeedUrl, SourcePlatform, SourceType } from "../src/types.js";

const DATA_DIR = path.resolve("data");
const SEEDS_PATH = path.join(DATA_DIR, "seed_urls.json");
const RAW_PATH = path.join(DATA_DIR, "raw_sources.json");
const SCOPE_PATH = path.join(DATA_DIR, "collection_scope.json");
const execFileAsync = promisify(execFile);
const DEFAULT_BUNDLED_PYTHON = path.join(
  process.env.USERPROFILE ?? "",
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "python",
  "python.exe",
);

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

function isBadPageTitle(title: string): boolean {
  const normalized = title.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    normalized.length === 0 ||
    normalized === "404" ||
    normalized.includes("404 - page not found") ||
    normalized.includes("page not found") ||
    normalized.includes("access denied") ||
    normalized.includes("just a moment")
  );
}

function safeTitle(title: string, seed: SeedUrl): string {
  return isBadPageTitle(title) ? titleFromSeed(seed) : title.replace(/\s+/g, " ").trim();
}

function sanitizedMetadata(metadata: Record<string, unknown>, seed: SeedUrl): Record<string, unknown> {
  const cleaned = { ...metadata };
  if (typeof cleaned.title === "string" && isBadPageTitle(cleaned.title)) {
    cleaned.title = titleFromSeed(seed);
  }
  return cleaned;
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

async function scrapePdfDirect(seed: SeedUrl): Promise<{
  title: string;
  text: string;
  metadata: Record<string, unknown>;
}> {
  const response = await fetch(seed.url, {
    headers: {
      "User-Agent": "Mozilla/5.0 ESG Momentum Radar Prototype",
    },
  });

  if (!response.ok) {
    throw new Error(`PDF download returned HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1024) {
    throw new Error("PDF download returned an unexpectedly small file.");
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "esg-pdf-"));
  const pdfPath = path.join(tempDir, "source.pdf");
  const scriptPath = path.join(tempDir, "extract_pdf.py");
  const pythonPath = process.env.PDF_PYTHON_PATH ?? DEFAULT_BUNDLED_PYTHON;

  await writeFile(pdfPath, buffer);
  await writeFile(
    scriptPath,
    [
      "import sys",
      "from pypdf import PdfReader",
      "sys.stdout.reconfigure(encoding='utf-8')",
      "reader = PdfReader(sys.argv[1])",
      "parts = []",
      "for page in reader.pages:",
      "    text = page.extract_text() or ''",
      "    if text.strip():",
      "        parts.append(text)",
      "print('\\n\\n'.join(parts))",
    ].join("\n"),
    "utf8",
  );

  try {
    const { stdout } = await execFileAsync(pythonPath, [scriptPath, pdfPath], {
      maxBuffer: 20 * 1024 * 1024,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
      },
    });

    if (isUnusableScrapeText(stdout)) {
      throw new Error("Local PDF extraction returned unusable or low-value text.");
    }

    return {
      title: titleFromSeed(seed),
      text: stdout,
      metadata: {
        provider: "direct_pdf_download",
        endpoint: seed.url,
        contentType,
        bytes: buffer.length,
      },
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function scrapeHtmlDirect(seed: SeedUrl): Promise<{
  title: string;
  text: string;
  metadata: Record<string, unknown>;
}> {
  const response = await fetch(seed.url, {
    headers: {
      "User-Agent": "Mozilla/5.0 ESG Momentum Radar Prototype",
    },
  });

  if (!response.ok) {
    throw new Error(`HTML download returned HTTP ${response.status}`);
  }

  const html = await response.text();
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? titleFromSeed(seed);
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

  if (isUnusableScrapeText(text)) {
    throw new Error("Direct HTML extraction returned unusable or low-value text.");
  }

  return {
    title,
    text,
    metadata: {
      provider: "direct_html_download",
      endpoint: seed.url,
      contentType: response.headers.get("content-type") ?? "",
      bytes: html.length,
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
    if (!useLiveCollection) {
      throw new Error("COLLECTION_MODE must be live. Seed/mock text is disabled for evidence collection.");
    }

    let collected: Awaited<ReturnType<typeof scrapePdfDirect>>;
    if (seed.expected_content_type === "pdf") {
      try {
        collected = await scrapePdfDirect(seed);
      } catch (error) {
        collected = await scrapeWithFirecrawl(seed);
        collected.metadata = {
          ...collected.metadata,
          directPdfError: error instanceof Error ? error.message : String(error),
        };
      }
    } else if (seed.expected_content_type === "html") {
      collected = await scrapeHtmlDirect(seed);
    } else {
      collected = await scrapeWithFirecrawl(seed);
    }
    if (!hasEnoughEsgEvidence(seed, collected.text)) {
      throw new Error("Live page text did not contain enough ESG evidence for extraction.");
    }

    const rawText = collected.text;
    const contentHash = hashText(rawText);
    const previous = existingBySeed.get(seed.seed_id);
    const extractionStatus =
      previous && previous.content_hash === contentHash ? "skipped_unchanged" : "success";

    return {
      source_id: sourceId,
      seed_id: seed.seed_id,
      company_id: seed.company_id,
      source_platform: seed.source_platform ?? inferPlatform(seed.source_type),
      url: seed.url,
      title: safeTitle(collected.title, seed),
      source_type: seed.source_type,
      scraped_at: now,
      raw_text: rawText,
      extraction_status: extractionStatus,
      content_hash: contentHash,
      source_reliability: seed.source_reliability,
      published_date: seed.published_date,
      collection_window: {
        start_date: scope.window_start,
        end_date: scope.window_end,
      },
      firecrawl_metadata: sanitizedMetadata(collected.metadata, seed),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
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
