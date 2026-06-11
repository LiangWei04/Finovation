import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { categories, scopeWindow } from "../lib/analytics";
import type { EsgDataBundle, SignalDirection, SourcePlatform } from "../types/esg";
import { EmptyState } from "../components/EmptyState";
import { EvidenceCard } from "../components/EvidenceCard";
import { FilterBar } from "../components/FilterBar";
import { Header } from "../components/Header";

type SortKey = "confidence" | "weightedSignalScore" | "publishedDate";

interface EvidenceExplorerProps {
  data: EsgDataBundle;
}

export function EvidenceExplorer({ data }: EvidenceExplorerProps) {
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("all");
  const [category, setCategory] = useState("all");
  const [direction, setDirection] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("confidence");

  const companyById = useMemo(() => new Map(data.companies.map((company) => [company.company_id, company])), [data.companies]);
  const platforms = useMemo(() => Array.from(new Set(data.signals.map((signal) => signal.source_platform))).sort(), [data.signals]);

  const filteredSignals = useMemo(() => {
    const query = search.toLowerCase().trim();
    return data.signals
      .filter((signal) => {
        const text = `${signal.evidence_summary} ${signal.evidence_quote} ${signal.signal_tags.join(" ")}`.toLowerCase();
        return (
          (!query || text.includes(query)) &&
          (companyId === "all" || signal.company_id === companyId) &&
          (category === "all" || signal.esg_category === category) &&
          (direction === "all" || signal.signal_direction === direction) &&
          (platform === "all" || signal.source_platform === platform)
        );
      })
      .sort((a, b) => {
        if (sortKey === "publishedDate") {
          return (Date.parse(b.published_date ?? "") || 0) - (Date.parse(a.published_date ?? "") || 0);
        }
        if (sortKey === "weightedSignalScore") {
          return b.weighted_signal_score - a.weighted_signal_score;
        }
        return b.confidence - a.confidence;
      });
  }, [category, companyId, data.signals, direction, platform, search, sortKey]);

  return (
    <>
      <Header
        eyebrow="Evidence Explorer"
        title="ESG Signal Evidence"
        description="Search and filter the underlying evidence signals used by the momentum dashboard."
        windowLabel={scopeWindow(data.scope)}
      />

      <section className="glass-panel mb-6 rounded-xl p-5">
        <FilterBar>
          <label className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input
              className="control w-full pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search evidence text"
            />
          </label>
          <select className="control" value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
            <option value="all">All companies</option>
            {data.companies.map((company) => (
              <option key={company.company_id} value={company.company_id}>
                {company.name}
              </option>
            ))}
          </select>
          <select className="control" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select className="control" value={direction} onChange={(event) => setDirection(event.target.value)}>
            <option value="all">All directions</option>
            {(["positive", "negative", "neutral"] as SignalDirection[]).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select className="control" value={platform} onChange={(event) => setPlatform(event.target.value)}>
            <option value="all">All sources</option>
            {platforms.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select className="control" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
            <option value="confidence">Sort by confidence</option>
            <option value="weightedSignalScore">Sort by weighted signal score</option>
            <option value="publishedDate">Sort by published date</option>
          </select>
        </FilterBar>

        <p className="mt-4 text-sm text-slate-400">{filteredSignals.length} matching evidence signals</p>
      </section>

      {filteredSignals.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredSignals.map((signal) => (
            <EvidenceCard
              key={signal.signal_id}
              companyName={companyById.get(signal.company_id)?.name ?? signal.company_id}
              esgCategory={signal.esg_category}
              signalTags={signal.signal_tags}
              signalDirection={signal.signal_direction}
              signalStrength={signal.signal_strength}
              weightedSignalScore={signal.weighted_signal_score}
              confidence={signal.confidence}
              timeRelevance={signal.time_relevance}
              evidenceSummary={signal.evidence_summary}
              evidenceQuote={signal.evidence_quote}
              publishedDate={signal.published_date}
              sourcePlatform={signal.source_platform as SourcePlatform}
              url={signal.url}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No matching evidence" message="Adjust the filters or search terms to show more ESG signals." />
      )}
    </>
  );
}
