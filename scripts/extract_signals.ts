import "dotenv/config";
import OpenAI from "openai";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  EsgCategory,
  EsgSignal,
  RawSource,
  SignalDirection,
  TimeRelevance,
} from "../src/types.js";

const DATA_DIR = path.resolve("data");
const RAW_PATH = path.join(DATA_DIR, "raw_sources.json");
const SIGNALS_PATH = path.join(DATA_DIR, "structured_esg_signals.json");
const SCOPE_PATH = path.join(DATA_DIR, "collection_scope.json");

const PROTOTYPE_DISCLAIMER =
  "Prototype ESG intelligence signal for research screening only; not investment advice.";

interface KeywordRule {
  category: EsgCategory;
  tags: string[];
  direction: SignalDirection;
  timeRelevance: TimeRelevance;
  signalStrength: number;
  confidence: number;
  keywords: string[];
}

interface AiSignalCandidate {
  esg_category: EsgCategory;
  signal_tags?: string[];
  signal_direction: SignalDirection;
  signal_strength: number;
  confidence: number;
  time_relevance: TimeRelevance;
  evidence_summary: string;
  evidence_quote: string;
}

interface CollectionScope {
  window_start: string;
  window_end: string;
  window_label: string;
}

const RULES: KeywordRule[] = [
  {
    category: "Environmental",
    tags: ["sgx_core_metric", "climate"],
    direction: "positive",
    timeRelevance: "current",
    signalStrength: 0.72,
    confidence: 0.78,
    keywords: [
      "emissions",
      "climate",
      "carbon",
      "environmental",
      "scope 1",
      "scope 2",
      "scope 3",
      "renewable",
      "energy consumption",
      "energy efficiency",
      "water",
      "waste",
      "green building",
      "green buildings",
      "sustainable aviation fuel",
      "decarbonisation",
      "net zero",
    ],
  },
  {
    category: "Social",
    tags: ["sgx_core_metric", "workforce"],
    direction: "positive",
    timeRelevance: "current",
    signalStrength: 0.62,
    confidence: 0.72,
    keywords: [
      "employee",
      "diversity",
      "safety",
      "training",
      "turnover",
      "wellbeing",
      "human rights",
      "community",
      "labour",
      "worker",
    ],
  },
  {
    category: "Governance",
    tags: ["sgx_core_metric", "board_and_compliance"],
    direction: "positive",
    timeRelevance: "current",
    signalStrength: 0.65,
    confidence: 0.76,
    keywords: [
      "board",
      "board independence",
      "women on board",
      "audit",
      "risk committee",
      "compliance",
      "disclosure",
      "disclosures",
      "reporting",
      "risk",
      "anti-corruption",
      "risk management",
      "governance",
      "whistleblowing",
      "climate risk",
      "scenario analysis",
    ],
  },
  {
    category: "Governance",
    tags: ["digital_innovation", "data_governance"],
    direction: "positive",
    timeRelevance: "forward-looking",
    signalStrength: 0.68,
    confidence: 0.7,
    keywords: [
      "automation",
      "data governance",
      "cybersecurity",
      "digital transformation",
      "innovation",
      "smart building",
      "traceability",
      "analytics",
    ],
  },
  {
    category: "Governance",
    tags: ["controversy_risk"],
    direction: "negative",
    timeRelevance: "current",
    signalStrength: 0.7,
    confidence: 0.74,
    keywords: [
      "controversy",
      "scrutiny",
      "lawsuit",
      "fine",
      "penalty",
      "breach",
      "disruption",
      "outage",
      "deforestation",
      "grievance",
      "greenwashing",
      "transition risk",
      "regulatory risk",
    ],
  },
  {
    category: "Governance",
    tags: ["sgx_climate_reporting"],
    direction: "positive",
    timeRelevance: "forward-looking",
    signalStrength: 0.66,
    confidence: 0.72,
    keywords: ["ifrs s2", "climate reporting", "regulatory reporting", "sgx", "scope 1 and scope 2"],
  },
  {
    category: "Social",
    tags: ["hiring_intent"],
    direction: "positive",
    timeRelevance: "forward-looking",
    signalStrength: 0.64,
    confidence: 0.68,
    keywords: ["hiring", "open roles", "careers", "specialist", "engineer", "analyst"],
  },
];

async function readJson<T>(filePath: string): Promise<T> {
  const text = await readFile(filePath, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, "")) as T;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function splitSentences(text: string): string[] {
  const lineSegments = text
    .split(/\r?\n+/)
    .map((line) =>
      line
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[#*_`>|\\-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((line) => line.length > 20 && line.length < 700);

  const sentenceSegments = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 20);

  return [...sentenceSegments, ...lineSegments];
}

function findEvidenceSentence(source: RawSource, keywords: string[]): string | undefined {
  const sentences = splitSentences(source.raw_text);
  return sentences.find((sentence) =>
    keywords.some((keyword) => sentence.toLowerCase().includes(keyword.toLowerCase())),
  );
}

function directionMultiplier(direction: SignalDirection): number {
  if (direction === "negative") return -1;
  if (direction === "neutral") return 0;
  return 1;
}

function isInsideWindow(date: string | undefined, scope: CollectionScope): boolean {
  if (!date) return true;
  return date >= scope.window_start && date <= scope.window_end;
}

function toSignal(
  candidate: AiSignalCandidate,
  source: RawSource,
  signalIndex: number,
  scope: CollectionScope,
): EsgSignal | undefined {
  if (!candidate.evidence_quote || !source.raw_text.includes(candidate.evidence_quote)) {
    return undefined;
  }

  const weighted =
    directionMultiplier(candidate.signal_direction) *
    candidate.signal_strength *
    candidate.confidence *
    source.source_reliability;

  return {
    signal_id: `SIG${String(signalIndex).padStart(4, "0")}`,
    company_id: source.company_id,
    source_id: source.source_id,
    esg_category: candidate.esg_category,
    signal_tags: candidate.signal_tags ?? [],
    signal_direction: candidate.signal_direction,
    signal_strength: Number(clamp(candidate.signal_strength).toFixed(2)),
    confidence: Number(clamp(candidate.confidence).toFixed(2)),
    time_relevance: candidate.time_relevance,
    evidence_summary: candidate.evidence_summary,
    evidence_quote: candidate.evidence_quote,
    source_reliability: source.source_reliability,
    weighted_signal_score: Number(weighted.toFixed(3)),
    published_date: source.published_date,
    time_window: scope.window_label,
    source_platform: source.source_platform,
    url: source.url,
    prototype_disclaimer: PROTOTYPE_DISCLAIMER,
  };
}

function extractRuleBasedCandidates(source: RawSource): AiSignalCandidate[] {
  const candidates: AiSignalCandidate[] = [];

  for (const rule of RULES) {
    const evidence = findEvidenceSentence(source, rule.keywords);
    if (!evidence) continue;

    const matchedKeywords = rule.keywords.filter((keyword) =>
      evidence.toLowerCase().includes(keyword.toLowerCase()),
    );

    candidates.push({
      esg_category: rule.category,
      signal_tags: rule.tags,
      signal_direction: rule.direction,
      signal_strength: rule.signalStrength,
      confidence: clamp(rule.confidence + Math.min(matchedKeywords.length, 3) * 0.03),
      time_relevance: source.source_type === "careers" ? "forward-looking" : rule.timeRelevance,
      evidence_summary: `${source.title} contains ${rule.direction} ${rule.category} evidence related to ${matchedKeywords.slice(0, 3).join(", ")}.`,
      evidence_quote: evidence,
    });
  }

  return dedupeCandidates(candidates);
}

function dedupeCandidates(candidates: AiSignalCandidate[]): AiSignalCandidate[] {
  const seen = new Set<string>();
  const deduped: AiSignalCandidate[] = [];

  for (const candidate of candidates) {
    const key = `${candidate.esg_category}:${candidate.signal_direction}:${candidate.evidence_quote}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(candidate);
  }

  return deduped.slice(0, 5);
}

function buildRelevantSnippet(source: RawSource): string {
  const sentences = splitSentences(source.raw_text);
  const relevantSentences = sentences.filter((sentence) =>
    RULES.some((rule) =>
      rule.keywords.some((keyword) => sentence.toLowerCase().includes(keyword.toLowerCase())),
    ),
  );

  return (relevantSentences.length ? relevantSentences : sentences).slice(0, 12).join(" ");
}

async function extractWithOpenAi(source: RawSource): Promise<AiSignalCandidate[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required when AI_EXTRACTION_MODE=live.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const snippet = buildRelevantSnippet(source);

  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Extract ESG signals only from the provided source text. Return JSON with a signals array. Every signal must include an exact evidence_quote copied from the text. Do not infer facts not present in the text.",
      },
      {
        role: "user",
        content: JSON.stringify({
          allowed_categories: [
            "Environmental",
            "Social",
            "Governance",
          ],
          allowed_directions: ["positive", "negative", "neutral"],
          allowed_time_relevance: ["backward-looking", "current", "forward-looking"],
          source_id: source.source_id,
          source_type: source.source_type,
          text: snippet,
          output_shape: {
            signals: [
              {
                esg_category: "Environmental",
                signal_tags: ["climate"],
                signal_direction: "positive",
                signal_strength: 0.7,
                confidence: 0.8,
                time_relevance: "current",
                evidence_summary: "One-sentence summary.",
                evidence_quote: "Exact quote copied from text.",
              },
            ],
          },
        }),
      },
    ],
  });

  const content = response.choices[0]?.message.content ?? "{\"signals\":[]}";
  const parsed = JSON.parse(content) as { signals?: AiSignalCandidate[] };
  return dedupeCandidates(parsed.signals ?? []);
}

async function extractCandidates(source: RawSource): Promise<AiSignalCandidate[]> {
  if (process.env.AI_EXTRACTION_MODE === "live") {
    try {
      const aiCandidates = await extractWithOpenAi(source);
      const validAiCandidates = aiCandidates.filter((candidate) =>
        source.raw_text.includes(candidate.evidence_quote),
      );
      if (validAiCandidates.length > 0) return validAiCandidates;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`AI extraction failed for ${source.source_id}; using rules fallback. ${message}`);
    }
  }

  return extractRuleBasedCandidates(source);
}

async function main(): Promise<void> {
  const rawSources = await readJson<RawSource[]>(RAW_PATH);
  const scope = await readJson<CollectionScope>(SCOPE_PATH);
  const signals: EsgSignal[] = [];

  for (const source of rawSources) {
    if (source.extraction_status === "failed" || source.raw_text.trim().length === 0) continue;
    if (!isInsideWindow(source.published_date, scope)) continue;

    const candidates = await extractCandidates(source);
    for (const candidate of candidates) {
      const signal = toSignal(candidate, source, signals.length + 1, scope);
      if (signal) signals.push(signal);
    }
  }

  await writeJson(SIGNALS_PATH, signals);

  console.log(`Extracted ${signals.length} structured ESG signals. Output: ${SIGNALS_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
