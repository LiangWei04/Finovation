import { ExternalLink } from "lucide-react";
import { categoryTextClass, directionClasses, formatDate, formatNumber, formatPercent, platformLabel } from "../lib/format";
import type { EsgCategory, SignalDirection, SourcePlatform } from "../types/esg";

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
  publishedDate?: string;
  sourcePlatform?: SourcePlatform;
  url?: string;
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
  publishedDate,
  sourcePlatform,
  url,
}: EvidenceCardProps) {
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

      <p className="mt-4 text-sm leading-6 text-slate-200">{evidenceSummary}</p>
      <blockquote className="mt-3 border-l-2 border-teal/50 pl-3 text-sm leading-6 text-slate-400">{evidenceQuote || "No quote available."}</blockquote>

      <div className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-slate-400">
        <span>{platformLabel(sourcePlatform)}</span>
        <span>{formatDate(publishedDate)}</span>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-slate-200 transition hover:border-teal/40 hover:text-teal"
          >
            Source <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="rounded-lg border border-white/10 px-2.5 py-1.5">No URL</span>
        )}
      </div>
    </article>
  );
}
