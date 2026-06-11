import { ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

function PageButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-200 transition hover:border-teal/40 hover:text-teal disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-slate-200"
    >
      {children}
    </button>
  );
}

export function PaginationControls({
  page,
  pageSize,
  totalItems,
  pageSizeOptions = [12, 24, 48],
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const clampedPage = Math.min(Math.max(page, 1), pageCount);
  const startItem = totalItems === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, clampedPage * pageSize);
  const isFirstPage = clampedPage <= 1;
  const isLastPage = clampedPage >= pageCount;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-slate-400">
          Showing <span className="font-semibold text-white">{startItem}</span>-<span className="font-semibold text-white">{endItem}</span> of{" "}
          <span className="font-semibold text-white">{totalItems}</span>
        </span>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Per page
          <select
            className="control h-9 py-1 text-xs"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-2">
        <PageButton label="First page" disabled={isFirstPage} onClick={() => onPageChange(1)}>
          <ChevronsLeft className="h-4 w-4" />
        </PageButton>
        <PageButton label="Previous page" disabled={isFirstPage} onClick={() => onPageChange(clampedPage - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </PageButton>
        <span className="min-w-24 text-center text-xs text-slate-400">
          Page <span className="font-semibold text-white">{clampedPage}</span> of <span className="font-semibold text-white">{pageCount}</span>
        </span>
        <PageButton label="Next page" disabled={isLastPage} onClick={() => onPageChange(clampedPage + 1)}>
          <ChevronRight className="h-4 w-4" />
        </PageButton>
        <PageButton label="Last page" disabled={isLastPage} onClick={() => onPageChange(pageCount)}>
          <ChevronsRight className="h-4 w-4" />
        </PageButton>
      </div>
    </div>
  );
}
