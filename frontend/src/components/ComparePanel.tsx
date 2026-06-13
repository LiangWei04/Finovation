import { useMemo, useState } from "react";
import { GitCompareArrows, X } from "lucide-react";
import { classStyles, type CompanyClass } from "../lib/analytics";
import { formatMomentum, formatNumber } from "../lib/format";
import type { CompanyComparisonRow } from "../types/esg";

export function ComparePanel({ rows, seedCompanyId }: { rows: CompanyComparisonRow[]; seedCompanyId?: string }) {
  const defaultIds = useMemo(() => {
    const ids = seedCompanyId ? [seedCompanyId] : [];
    rows.forEach((row) => {
      if (ids.length < 2 && !ids.includes(row.companyId)) ids.push(row.companyId);
    });
    return ids.slice(0, 2);
  }, [rows, seedCompanyId]);
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultIds);
  const selectedRows = selectedIds.map((id) => rows.find((row) => row.companyId === id)).filter(Boolean) as CompanyComparisonRow[];
  const remainingRows = rows.filter((row) => !selectedIds.includes(row.companyId));

  function addCompany(companyId: string) {
    if (!companyId || selectedIds.includes(companyId) || selectedIds.length >= 3) return;
    setSelectedIds([...selectedIds, companyId]);
  }

  function removeCompany(companyId: string) {
    setSelectedIds(selectedIds.filter((id) => id !== companyId));
  }

  return (
    <section className="rounded-[18px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.05)]">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <GitCompareArrows className="h-4 w-4 text-[#0071e3]" />
            <h2 className="text-[15px] font-bold tracking-[-0.01em] text-[#1d1d1f]">Peer Compare</h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-[#6e6e73]">Compare 2-3 companies across ESG, risk, valuation, evidence quality, and quadrant.</p>
        </div>
        <select
          className="h-10 rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-sm font-semibold text-[#1d1d1f] outline-none disabled:opacity-50"
          value=""
          disabled={selectedIds.length >= 3 || !remainingRows.length}
          onChange={(event) => addCompany(event.target.value)}
        >
          <option value="">Add company to compare</option>
          {remainingRows.map((row) => (
            <option key={row.companyId} value={row.companyId}>
              {row.name} ({row.sgxIdentifier})
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {selectedRows.map((row) => (
          <span key={row.companyId} className="inline-flex items-center gap-2 rounded-full bg-[#f5f5f7] px-3 py-1.5 text-xs font-bold text-[#1d1d1f]">
            {row.sgxIdentifier}
            <button type="button" className="text-[#86868b] hover:text-[#ff3b30]" onClick={() => removeCompany(row.companyId)} aria-label={`Remove ${row.name} from comparison`}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs uppercase tracking-[0.08em] text-[#86868b]">
              <th className="px-3 py-3">Company</th>
              <th className="px-3 py-3">ESG</th>
              <th className="px-3 py-3">Momentum</th>
              <th className="px-3 py-3">Risk</th>
              <th className="px-3 py-3">P/E</th>
              <th className="px-3 py-3">Confidence</th>
              <th className="px-3 py-3">Evidence</th>
              <th className="px-3 py-3">Quadrant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {selectedRows.map((row) => (
              <tr key={row.companyId}>
                <td className="px-3 py-3">
                  <div className="font-bold text-[#1d1d1f]">{row.name}</div>
                  <div className="text-xs text-[#6e6e73]">{row.sgxIdentifier} - {row.sector}</div>
                </td>
                <td className="px-3 py-3 font-bold">{formatNumber(row.esgScore, 1)}</td>
                <td className="px-3 py-3">{formatMomentum(row.momentum)}</td>
                <td className="px-3 py-3">{formatNumber(row.riskScore, 0)}</td>
                <td className="px-3 py-3">{row.valuationPe == null ? "n/a" : `${formatNumber(row.valuationPe, 1)}x`}</td>
                <td className="px-3 py-3">{formatNumber(row.confidence * 100, 0)}%</td>
                <td className="px-3 py-3">{row.evidenceCount}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex min-w-32 justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${classStyles(row.classification as CompanyClass)}`}>
                    {row.classification}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
