import { ExternalLink } from "lucide-react";
import { categoryTextClass, directionClasses, formatDate, formatNumber, formatPercent, platformLabel } from "../lib/format";
import type { EvidenceBasis, EsgCategory, ExtractionStatus, SignalDirection, SourceLinkType, SourcePlatform } from "../types/esg";

interface EvidenceCardProps {
  companyName?: string;
  esgCategory?: EsgCategory;
  signalTags?: string[];
  signalDirection: SignalDirection;
  signalStrength?: number;
  weightedSignalScore: number;
  confidence: number;
  timeRelevance?: string;
  evidenceSummary: string;
  evidenceQuote: string;
  evidenceBasis?: EvidenceBasis;
  publishedDate?: string;
  sourcePlatform?: SourcePlatform;
  sourceStatus?: ExtractionStatus;
  sourceNote?: string;
  sourceLinkType?: SourceLinkType;
  url?: string;
  clickableUrl?: string;
}

export function EvidenceCard({
  companyName,
  esgCategory,
  signalTags = [],
  signalDirection,
  signalStrength,
  weightedSignalScore,
  confidence,
  timeRelevance,
  evidenceSummary,
  evidenceQuote,
  evidenceBasis = "scraped_text",
  publishedDate,
  sourcePlatform,
  sourceStatus,
  sourceNote,
  sourceLinkType = "direct",
  url,
  clickableUrl,
}: EvidenceCardProps) {
  const isFallback = sourceStatus === "fallback_seeded";
  const isProblemSource = sourceStatus === "failed";
  const isReferenceOnly = sourceLinkType === "reference_only";
  const canOpenLink = Boolean(clickableUrl) && sourceLinkType === "direct";
  const linkLabel = sourceLinkType === "direct" ? "Direct source" : "Reference page";
  const isSeededEvidence = evidenceBasis === "seeded_prototype_text";

  return (
    <article className="glass-panel rounded-xl p-4 transition hover:border-teal/30">
      <div className="flex flex-wrap items-center gap-2">
        {companyName ? <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200">{companyName}</span> : null}
        {esgCategory ? <span className={`text-xs font-semibold ${categoryTextClass(esgCategory)}`}>{esgCategory}</span> : null}
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${directionClasses(signalDirection)}`}>{signalDirection}</span>
      </div>

      {signalTags.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {signalTags.map((tag) => (
            <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-400">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {isFallback || isProblemSource ? (
        <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
          <span className="font-semibold">{isFallback ? "Curated fallback source" : "Source issue"}</span>
          {sourceNote ? <span className="text-amber-100/80"> - {sourceNote}</span> : null}
          {isFallback ? <span className="text-amber-100/80"> This evidence text is not a verbatim quote from the live page.</span> : null}
        </div>
      ) : null}

      {isReferenceOnly && !isFallback ? (
        <div className="mt-3 rounded-lg border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-xs leading-5 text-sky-100">
          <span className="font-semibold">Reference-only link</span>
          <span className="text-sky-100/80"> - Opens a parent, listing, or search page rather than an exact evidence document.</span>
        </div>
      ) : null}

      <p className="mt-4 text-sm leading-6 text-slate-200">{evidenceSummary}</p>
      <div className={`mt-3 border-l-2 pl-3 text-sm leading-6 ${isSeededEvidence ? "border-amber-400/50 text-amber-100/80" : "border-teal/50 text-slate-400"}`}>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
          {isSeededEvidence ? "Prototype evidence text, not a live-page quote" : "Scraped excerpt"}
        </p>
        <p>{evidenceQuote || "No evidence text available."}</p>
      </div>

      <details className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-slate-400">
        <summary className="cursor-pointer select-none text-slate-300">Signal details</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="block text-slate-500">Weighted score</span>
            <span className="font-semibold text-white">{formatNumber(weightedSignalScore, 3)}</span>
          </div>
          <div>
            <span className="block text-slate-500">Confidence</span>
            <span className="font-semibold text-white">{formatPercent(confidence)}</span>
          </div>
          {signalStrength !== undefined ? (
            <div>
              <span className="block text-slate-500">Signal strength</span>
              <span className="font-semibold text-white">{formatPercent(signalStrength)}</span>
            </div>
          ) : null}
          {timeRelevance ? (
            <div>
              <span className="block text-slate-500">Time relevance</span>
              <span className="font-semibold text-white">{timeRelevance}</span>
            </div>
          ) : null}
        </div>
      </details>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-slate-400">
        <span>{platformLabel(sourcePlatform)}</span>
        <span>{formatDate(publishedDate)}</span>
        {canOpenLink ? (
          <a
            href={clickableUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-slate-200 transition hover:border-teal/40 hover:text-teal"
            title="Open the direct source page."
          >
            {linkLabel} <ExternalLink className="h-3 w-3" />
          </a>
        ) : isReferenceOnly && url ? (
          <span className="rounded-lg border border-white/10 px-2.5 py-1.5 text-slate-500" title="Stored as a reference URL only; not clickable because it may open a generic or broken page.">
            Reference only
          </span>
        ) : (
          <span className="rounded-lg border border-white/10 px-2.5 py-1.5">No direct link</span>
        )}
      </div>
    </article>
  );
}
